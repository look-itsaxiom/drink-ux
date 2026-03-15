import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '../../../generated/prisma';
import { createOrderRouter, createBusinessOrdersRouter } from '../orders';
import { createPaymentRouter } from '../payments';
import { OrderService } from '../../services/OrderService';
import { AuthService } from '../../services/AuthService';
import { MockPOSAdapter } from '../../adapters/pos/MockPOSAdapter';
import { sessionMiddleware, SESSION_COOKIE_NAME } from '../../middleware/session';
import { encryptToken } from '../../utils/encryption';

const prisma = new PrismaClient();
const TEST_ENCRYPTION_KEY = 'test-key-must-be-32-chars-long!!';
let orderService: OrderService;
let authService: AuthService;
let mockPOSAdapter: MockPOSAdapter;

// Counter for unique emails
let emailCounter = 0;

// Test helper to create authenticated session
async function createAuthenticatedUser(emailPrefix?: string) {
  emailCounter++;
  const uniqueId = `${Date.now()}-${emailCounter}-${Math.random().toString(36).substring(2, 8)}`;
  const email = emailPrefix ? `${emailPrefix}-${uniqueId}@test.com` : `test-${uniqueId}@test.com`;

  const result = await authService.signup({
    email,
    password: 'SecureP@ss1',
    businessName: `Test Business ${uniqueId}`,
  });
  const login = await authService.login({
    email,
    password: 'SecureP@ss1',
  });
  return {
    user: result.user,
    business: result.business,
    sessionToken: login.sessionToken,
  };
}

// Test helper to create a test business with catalog items
async function setupBusinessWithCatalog(businessId: string) {
  // Set business to ACTIVE so it can accept orders (subscription enforcement)
  await prisma.business.update({
    where: { id: businessId },
    data: { accountState: 'ACTIVE' },
  });

  // Create category
  const category = await prisma.category.create({
    data: {
      businessId,
      name: 'Hot Drinks',
    },
  });

  // Create base (drink)
  const base = await prisma.base.create({
    data: {
      businessId,
      categoryId: category.id,
      name: 'Espresso',
      priceCents: 399,
      posItemId: 'pos-item-1',
    },
  });

  // Create modifiers
  const modifier1 = await prisma.modifier.create({
    data: {
      businessId,
      modifierGroupId: 'test-mg-milk',
      name: 'Oat Milk',
      priceCents: 75,
      posModifierId: 'pos-mod-1',
    },
  });

  const modifier2 = await prisma.modifier.create({
    data: {
      businessId,
      modifierGroupId: 'test-mg-syrup',
      name: 'Vanilla',
      priceCents: 50,
      posModifierId: 'pos-mod-2',
    },
  });

  return {
    categoryId: category.id,
    baseId: base.id,
    modifierIds: [modifier1.id, modifier2.id],
  };
}

// Helper to clean the database safely
async function cleanDatabase() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.syncHistory.deleteMany();
  await prisma.presetModifier.deleteMany();
  await prisma.preset.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.base.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  mockPOSAdapter = new MockPOSAdapter();
  orderService = new OrderService(prisma, mockPOSAdapter);
  authService = new AuthService(prisma);
});

beforeEach(async () => {
  await cleanDatabase();
  mockPOSAdapter.reset();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('Order Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(sessionMiddleware(authService));
    app.use('/api/orders', createOrderRouter(orderService));
    app.use('/api/orders', createPaymentRouter(prisma));
    app.use('/api/business', createBusinessOrdersRouter(orderService));
    global.fetch = jest.fn();
  });

  // =============================================================================
  // POST /api/orders - CREATE ORDER
  // =============================================================================
  describe('POST /api/orders', () => {
    it('creates order and returns result (guest checkout)', async () => {
      const { business } = await createAuthenticatedUser();
      const catalog = await setupBusinessWithCatalog(business.id);

      const response = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'John Doe',
          customerPhone: '555-1234',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'MEDIUM',
              temperature: 'HOT',
              modifiers: catalog.modifierIds,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.id).toBeDefined();
      expect(response.body.data.order.orderNumber).toBeDefined();
      expect(response.body.data.order.pickupCode).toBeDefined();
      expect(response.body.data.order.status).toBe('PENDING');
      expect(response.body.data.order.customerName).toBe('John Doe');
    });

    it('creates order without authentication', async () => {
      // Guest checkout should work without auth
      const { business } = await createAuthenticatedUser();
      const catalog = await setupBusinessWithCatalog(business.id);

      const response = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Guest User',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'ICED',
              modifiers: [],
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('returns 400 for missing required fields', async () => {
      const { business } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          // Missing customerName and items
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for empty items array', async () => {
      const { business } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Test User',
          items: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 400 for invalid business ID', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          businessId: 'non-existent-business',
          customerName: 'Test User',
          items: [
            {
              baseId: 'some-base-id',
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 400 for invalid item reference', async () => {
      const { business } = await createAuthenticatedUser();

      const response = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Test User',
          items: [
            {
              baseId: 'invalid-base-id',
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // =============================================================================
  // GET /api/orders/:orderId - GET ORDER BY ID
  // =============================================================================
  describe('GET /api/orders/:orderId', () => {
    it('returns order details', async () => {
      const { business, sessionToken } = await createAuthenticatedUser();
      const catalog = await setupBusinessWithCatalog(business.id);

      // Create order
      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Test Customer',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'MEDIUM',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      const orderId = createResponse.body.data.order.id;

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.id).toBe(orderId);
      expect(response.body.data.order.customerName).toBe('Test Customer');
    });

    it('returns 404 for non-existent order', async () => {
      const { sessionToken } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/orders/non-existent-id')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/orders/some-order-id');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // =============================================================================
  // GET /api/orders/pickup/:pickupCode - GET ORDER BY PICKUP CODE
  // =============================================================================
  describe('GET /api/orders/pickup/:pickupCode', () => {
    it('returns order for customer by pickup code', async () => {
      const { business } = await createAuthenticatedUser();
      const catalog = await setupBusinessWithCatalog(business.id);

      // Create order
      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Pickup Customer',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      const pickupCode = createResponse.body.data.order.pickupCode;

      // Customer can retrieve order by pickup code without auth
      const response = await request(app)
        .get(`/api/orders/pickup/${pickupCode}`)
        .query({ businessId: business.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.pickupCode).toBe(pickupCode);
      expect(response.body.data.order.customerName).toBe('Pickup Customer');
    });

    it('returns 400 when businessId is missing', async () => {
      const response = await request(app)
        .get('/api/orders/pickup/XXXX');
      // No businessId query param

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 for invalid pickup code', async () => {
      const { business } = await createAuthenticatedUser();

      const response = await request(app)
        .get('/api/orders/pickup/XXXX')
        .query({ businessId: business.id });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // =============================================================================
  // GET /api/business/:businessId/orders - GET BUSINESS ORDERS
  // =============================================================================
  describe('GET /api/business/:businessId/orders', () => {
    let testBusinessId: string;
    let sessionToken: string;
    let catalog: { categoryId: string; baseId: string; modifierIds: string[] };

    beforeEach(async () => {
      const auth = await createAuthenticatedUser();
      testBusinessId = auth.business.id;
      sessionToken = auth.sessionToken;
      catalog = await setupBusinessWithCatalog(testBusinessId);

      // Create some orders
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/orders')
          .send({
            businessId: testBusinessId,
            customerName: `Customer ${i + 1}`,
            items: [
              {
                baseId: catalog.baseId,
                quantity: 1,
                size: 'SMALL',
                temperature: 'HOT',
                modifiers: [],
              },
            ],
          });
      }
    });

    it('returns paginated list of orders', async () => {
      const response = await request(app)
        .get(`/api/business/${testBusinessId}/orders`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(5);
    });

    it('supports limit query parameter', async () => {
      const response = await request(app)
        .get(`/api/business/${testBusinessId}/orders`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .query({ limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body.data.orders).toHaveLength(3);
    });

    it('supports offset query parameter', async () => {
      const response = await request(app)
        .get(`/api/business/${testBusinessId}/orders`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .query({ limit: 2, offset: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.orders).toHaveLength(2);
    });

    it('filters by status', async () => {
      // Update one order to CONFIRMED
      const ordersResponse = await request(app)
        .get(`/api/business/${testBusinessId}/orders`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .query({ limit: 1 });

      const orderId = ordersResponse.body.data.orders[0].id;
      await orderService.updateOrderStatus(orderId, 'CONFIRMED');

      // Filter by PENDING
      const pendingResponse = await request(app)
        .get(`/api/business/${testBusinessId}/orders`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .query({ status: 'PENDING' });

      expect(pendingResponse.body.data.orders).toHaveLength(4);

      // Filter by CONFIRMED
      const confirmedResponse = await request(app)
        .get(`/api/business/${testBusinessId}/orders`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .query({ status: 'CONFIRMED' });

      expect(confirmedResponse.body.data.orders).toHaveLength(1);
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/business/${testBusinessId}/orders`);

      expect(response.status).toBe(401);
    });

    it('returns 403 for unauthorized business access', async () => {
      const { business: otherBusiness } = await createAuthenticatedUser('other');

      const response = await request(app)
        .get(`/api/business/${otherBusiness.id}/orders`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =============================================================================
  // PUT /api/orders/:orderId/status - UPDATE ORDER STATUS
  // =============================================================================
  describe('PUT /api/orders/:orderId/status', () => {
    let testBusinessId: string;
    let sessionToken: string;
    let testOrderId: string;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser();
      testBusinessId = auth.business.id;
      sessionToken = auth.sessionToken;
      const catalog = await setupBusinessWithCatalog(testBusinessId);

      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          businessId: testBusinessId,
          customerName: 'Status Test',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      testOrderId = createResponse.body.data.order.id;
    });

    it('updates order status', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ status: 'CONFIRMED' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('CONFIRMED');
    });

    it('supports full status progression', async () => {
      const statuses = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

      for (const status of statuses) {
        const response = await request(app)
          .put(`/api/orders/${testOrderId}/status`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ status });

        expect(response.status).toBe(200);
        expect(response.body.data.order.status).toBe(status);
      }
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .send({ status: 'CONFIRMED' });

      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });

    it('returns 404 for non-existent order', async () => {
      const response = await request(app)
        .put('/api/orders/non-existent-id/status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ status: 'CONFIRMED' });

      expect(response.status).toBe(404);
    });
  });

  // =============================================================================
  // POST /api/orders/:orderId/cancel - CANCEL ORDER
  // =============================================================================
  describe('POST /api/orders/:orderId/cancel', () => {
    let testBusinessId: string;
    let sessionToken: string;
    let testOrderId: string;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser();
      testBusinessId = auth.business.id;
      sessionToken = auth.sessionToken;
      const catalog = await setupBusinessWithCatalog(testBusinessId);

      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          businessId: testBusinessId,
          customerName: 'Cancel Test',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      testOrderId = createResponse.body.data.order.id;
    });

    it('cancels order with reason', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/cancel`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ reason: 'Customer requested' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('CANCELLED');
      expect(response.body.data.order.cancelReason).toBe('Customer requested');
    });

    it('cancels order without reason', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/cancel`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.order.status).toBe('CANCELLED');
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/cancel`)
        .send({});

      expect(response.status).toBe(401);
    });

    it('returns 400 when order cannot be cancelled', async () => {
      // First transition to READY status
      await orderService.updateOrderStatus(testOrderId, 'CONFIRMED');
      await orderService.updateOrderStatus(testOrderId, 'PREPARING');
      await orderService.updateOrderStatus(testOrderId, 'READY');

      const response = await request(app)
        .post(`/api/orders/${testOrderId}/cancel`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CANNOT_CANCEL');
    });

    it('returns 404 for non-existent order', async () => {
      const response = await request(app)
        .post('/api/orders/non-existent-id/cancel')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(404);
    });
  });

  // =============================================================================
  // POST /api/orders/:orderId/sync - SYNC ORDER STATUS FROM POS
  // =============================================================================
  describe('POST /api/orders/:orderId/sync', () => {
    let testBusinessId: string;
    let sessionToken: string;
    let testOrderId: string;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser();
      testBusinessId = auth.business.id;
      sessionToken = auth.sessionToken;

      // Configure business with POS
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posAccessToken: 'test-token',
          posMerchantId: 'test-merchant',
        },
      });

      mockPOSAdapter.setCreateOrderResponse('pos-order-123');

      const catalog = await setupBusinessWithCatalog(testBusinessId);

      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          businessId: testBusinessId,
          customerName: 'Sync Test',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      testOrderId = createResponse.body.data.order.id;
    });

    it('syncs order status from POS', async () => {
      mockPOSAdapter.setGetOrderStatusResponse('PREPARING');

      const response = await request(app)
        .post(`/api/orders/${testOrderId}/sync`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('PREPARING');
    });

    it('returns 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`/api/orders/${testOrderId}/sync`);

      expect(response.status).toBe(401);
    });

    it('returns 404 for non-existent order', async () => {
      const response = await request(app)
        .post('/api/orders/non-existent-id/sync')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(404);
    });

    it('returns 400 for order without POS ID', async () => {
      // Create a new business without POS config
      const { business: noPosAuth, sessionToken: noPosToken } = await createAuthenticatedUser('nopos');

      const noPosBusinessId = noPosAuth.id;
      await prisma.business.update({
        where: { id: noPosBusinessId },
        data: { accountState: 'ACTIVE' },
      });
      const noPosCategory = await prisma.category.create({
        data: {
          businessId: noPosBusinessId,
          name: 'No POS Drinks',
        },
      });

      const noPosBase = await prisma.base.create({
        data: {
          businessId: noPosBusinessId,
          categoryId: noPosCategory.id,
          name: 'No POS Espresso',
          priceCents: 399,
        },
      });

      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          businessId: noPosBusinessId,
          customerName: 'No POS Order',
          items: [
            {
              baseId: noPosBase.id,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      const noPosOrderId = createResponse.body.data.order.id;

      const response = await request(app)
        .post(`/api/orders/${noPosOrderId}/sync`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${noPosToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('NO_POS_ORDER');
    });
  });

  // =============================================================================
  // COMPLETE ORDER FLOW INTEGRATION
  // =============================================================================
  describe('Complete order flow integration', () => {
    it('creates an order, calculates totals, processes payment, and allows pickup lookup', async () => {
      const { business } = await createAuthenticatedUser();
      const catalog = await setupBusinessWithCatalog(business.id);

      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Flow Customer',
          customerPhone: '555-1000',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'MEDIUM',
              temperature: 'HOT',
              modifiers: catalog.modifierIds,
            },
          ],
        });

      expect(createResponse.status).toBe(201);
      const order = createResponse.body.data.order;
      expect(order.subtotal).toBe(6.24);
      expect(order.tax).toBe(0.51);
      expect(order.total).toBe(6.75);

      await prisma.business.update({
        where: { id: business.id },
        data: {
          posProvider: 'SQUARE',
          posAccessToken: encryptToken('sqpat-sandbox-test-token', TEST_ENCRYPTION_KEY),
          posLocationId: 'test-location-id',
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          payment: {
            id: 'pay-flow-1',
            status: 'COMPLETED',
            amount_money: { amountCents: 67500, currency: 'USD' },
          },
        }),
      });

      const paymentResponse = await request(app)
        .post(`/api/orders/${order.id}/pay`)
        .send({
          sourceId: 'cnon:card-nonce-ok',
          amount: order.total,
        });

      expect(paymentResponse.status).toBe(200);
      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data.payment.success).toBe(true);
      expect(paymentResponse.body.data.payment.paymentId).toBe('pay-flow-1');

      const paidOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(paidOrder?.paymentStatus).toBe('COMPLETED');
      expect(paidOrder?.status).toBe('CONFIRMED');

      const pickupResponse = await request(app)
        .get(`/api/orders/pickup/${order.pickupCode}`)
        .query({ businessId: business.id });

      expect(pickupResponse.status).toBe(200);
      expect(pickupResponse.body.data.order.id).toBe(order.id);
    });

    it('sequences order numbers for the same business', async () => {
      const { business } = await createAuthenticatedUser();
      const catalog = await setupBusinessWithCatalog(business.id);

      const createOrder = () =>
        request(app)
          .post('/api/orders')
          .send({
            businessId: business.id,
            customerName: 'Sequence Customer',
            items: [
              {
                baseId: catalog.baseId,
                quantity: 1,
                size: 'SMALL',
                temperature: 'HOT',
                modifiers: [],
              },
            ],
          });

      const first = await createOrder();
      const second = await createOrder();

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);

      const firstNum = Number(first.body.data.order.orderNumber.slice(1));
      const secondNum = Number(second.body.data.order.orderNumber.slice(1));
      expect(secondNum).toBe(firstNum + 1);
    });

    it('returns payment failure from Square errors', async () => {
      const { business } = await createAuthenticatedUser();
      const catalog = await setupBusinessWithCatalog(business.id);

      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Declined Customer',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      const orderId = createResponse.body.data.order.id;

      await prisma.business.update({
        where: { id: business.id },
        data: {
          posProvider: 'SQUARE',
          posAccessToken: encryptToken('sqpat-sandbox-test-token', TEST_ENCRYPTION_KEY),
          posLocationId: 'test-location-id',
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          errors: [{ category: 'PAYMENT_METHOD_ERROR', code: 'CARD_DECLINED', detail: 'Declined' }],
        }),
      });

      const paymentResponse = await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .send({
          sourceId: 'cnon:card-nonce-declined',
          amount: createResponse.body.data.order.total,
        });

      expect(paymentResponse.status).toBe(400);
      expect(paymentResponse.body.success).toBe(false);
      expect(paymentResponse.body.error.code).toBe('CARD_DECLINED');
    });

    it('rejects duplicate payment attempts for an already paid order', async () => {
      const { business } = await createAuthenticatedUser();
      const catalog = await setupBusinessWithCatalog(business.id);

      const createResponse = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Idempotent Customer',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      const orderId = createResponse.body.data.order.id;

      await prisma.business.update({
        where: { id: business.id },
        data: {
          posProvider: 'SQUARE',
          posAccessToken: encryptToken('sqpat-sandbox-test-token', TEST_ENCRYPTION_KEY),
          posLocationId: 'test-location-id',
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          payment: {
            id: 'pay-idempotent-1',
            status: 'COMPLETED',
            amount_money: { amount: Math.round(createResponse.body.data.order.total * 100), currency: 'USD' },
          },
        }),
      });

      const firstPay = await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .send({
          sourceId: 'cnon:card-nonce-ok',
          amount: createResponse.body.data.order.total,
        });

      expect(firstPay.status).toBe(200);

      const secondPay = await request(app)
        .post(`/api/orders/${orderId}/pay`)
        .send({
          sourceId: 'cnon:card-nonce-ok',
          amount: createResponse.body.data.order.total,
        });

      expect(secondPay.status).toBe(400);
      expect(secondPay.body.error.code).toBe('ORDER_ALREADY_PAID');
      expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
    });

    it('blocks order creation when trial is expired', async () => {
      const { business } = await createAuthenticatedUser('expired-trial');
      const catalog = await setupBusinessWithCatalog(business.id);

      await prisma.business.update({
        where: { id: business.id },
        data: {
          accountState: 'TRIAL',
          trialEndsAt: new Date(Date.now() - 60_000),
        },
      });

      const response = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Blocked Trial Customer',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('TRIAL_EXPIRED');
    });

    it('blocks order creation for suspended businesses', async () => {
      const { business } = await createAuthenticatedUser('suspended');
      const catalog = await setupBusinessWithCatalog(business.id);

      await prisma.business.update({
        where: { id: business.id },
        data: { accountState: 'SUSPENDED' },
      });

      const response = await request(app)
        .post('/api/orders')
        .send({
          businessId: business.id,
          customerName: 'Blocked Suspended Customer',
          items: [
            {
              baseId: catalog.baseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BUSINESS_NOT_ACCEPTING_ORDERS');
    });

    it('generates unique pickup codes under concurrent order creation', async () => {
      const { business } = await createAuthenticatedUser('concurrent');
      const catalog = await setupBusinessWithCatalog(business.id);

      const requests = Array.from({ length: 10 }, (_, index) =>
        request(app)
          .post('/api/orders')
          .send({
            businessId: business.id,
            customerName: `Concurrent ${index + 1}`,
            items: [
              {
                baseId: catalog.baseId,
                quantity: 1,
                size: 'SMALL',
                temperature: 'HOT',
                modifiers: [],
              },
            ],
          })
      );

      const responses = await Promise.all(requests);
      const createdResponses = responses.filter((response) => response.status === 201);
      expect(createdResponses.length).toBeGreaterThanOrEqual(2);

      const pickupCodes = createdResponses.map((response) => response.body.data.order.pickupCode);
      const uniquePickupCodes = new Set(pickupCodes);
      expect(uniquePickupCodes.size).toBe(createdResponses.length);
    });
  });
});
