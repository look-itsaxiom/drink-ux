import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient, AccountState } from '../../../generated/prisma';
import { createEjectionRouter } from '../ejection';
import { createAuthRouter } from '../auth';
import { AuthService } from '../../services/AuthService';
import { EjectionService } from '../../services/EjectionService';
import { SESSION_COOKIE_NAME } from '../../middleware/session';

const prisma = new PrismaClient();
let authService: AuthService;
let ejectionService: EjectionService;

beforeAll(async () => {
  authService = new AuthService(prisma);
  ejectionService = new EjectionService(prisma);
});

beforeEach(async () => {
  // Clean database before each test
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await prisma.$disconnect();
});

// Helper to create a test user and business
async function createTestBusiness(
  email: string = 'owner@test.com',
  businessName: string = 'Test Coffee',
  accountState: AccountState = 'ACTIVE'
) {
  const signup = await authService.signup({
    email,
    password: 'SecureP@ss1',
    businessName,
  });

  // Update account state if needed
  if (accountState !== 'ONBOARDING') {
    await prisma.business.update({
      where: { id: signup.business.id },
      data: { accountState },
    });
  }

  // Login to get session token
  const login = await authService.login({
    email,
    password: 'SecureP@ss1',
  });

  return { ...signup, sessionToken: login.sessionToken };
}

// Helper to add POS tokens to a business
async function addPOSTokens(businessId: string) {
  await prisma.business.update({
    where: { id: businessId },
    data: {
      posProvider: 'SQUARE',
      posAccessToken: 'encrypted_access_token',
      posRefreshToken: 'encrypted_refresh_token',
      posMerchantId: 'merchant_123',
      posLocationId: 'location_456',
    },
  });
}

// Helper to add catalog items to a business
async function addCatalogItems(businessId: string) {
  const category = await prisma.category.create({
    data: {
      businessId,
      name: 'Hot Drinks',
      displayOrder: 1,
    },
  });

  const base = await prisma.base.create({
    data: {
      businessId,
      categoryId: category.id,
      name: 'Latte',
      priceCents: 450,
    },
  });

  await prisma.modifier.create({
    data: {
      businessId,
      modifierGroupId: 'test-mg-milk',
      name: 'Oat Milk',
      priceCents: 75,
    },
  });

  return { category, base };
}

// Helper to add orders to a business
async function addOrders(businessId: string, status: 'PENDING' | 'COMPLETED' = 'COMPLETED') {
  return prisma.order.create({
    data: {
      businessId,
      orderNumber: `T${Date.now()}`,
      pickupCode: `${Date.now()}`.slice(-4),
      customerName: 'Test Customer',
      customerEmail: 'customer@test.com',
      status,
      subtotalCents: 450,
      taxCents: 37,
      totalCents: 487,
      items: {
        create: {
          baseId: 'test-base-id',
          name: 'Latte',
          quantity: 1,
          size: 'MEDIUM',
          temperature: 'HOT',
          unitPriceCents: 450,
          totalPriceCents: 450,
          modifiers: '[]',
        },
      },
    },
  });
}

describe('Ejection Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    // Use auth router for session middleware
    app.use('/api/auth', createAuthRouter(authService, { disableRateLimit: true }));
    app.use('/api/ejection', createEjectionRouter(authService, ejectionService));
  });

  // ===========================================================================
  // GET /api/ejection/check - Get ejection consequences
  // ===========================================================================
  describe('GET /api/ejection/check', () => {
    // Happy path
    describe('Happy path', () => {
      it('returns ejection consequences for authenticated user', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@check.com', 'Check Coffee', 'ACTIVE');
        await addCatalogItems(business.id);
        await addOrders(business.id, 'COMPLETED');

        const response = await request(app)
          .get('/api/ejection/check')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          businessId: business.id,
          businessName: 'Check Coffee',
          currentState: 'ACTIVE',
          canEject: true,
          canStartOver: true,
          catalogItemCount: 1,
          categoryCount: 1,
          modifierCount: 1,
          totalOrderCount: 1,
          pendingOrderCount: 0,
          hasPendingOrders: false,
        });
      });

      it('returns warnings for pending orders', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@pending.com', 'Pending Coffee', 'ACTIVE');
        await addOrders(business.id, 'PENDING');
        await addOrders(business.id, 'PENDING');

        const response = await request(app)
          .get('/api/ejection/check')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.pendingOrderCount).toBe(2);
        expect(response.body.data.hasPendingOrders).toBe(true);
        expect(response.body.data.warnings).toContain(
          'You have 2 pending orders that should be resolved before ejecting'
        );
      });

      it('returns warnings for active subscription', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@sub.com', 'Sub Coffee', 'ACTIVE');
        await prisma.business.update({
          where: { id: business.id },
          data: { subscriptionStatus: 'sub_12345' },
        });

        const response = await request(app)
          .get('/api/ejection/check')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.hasActiveSubscription).toBe(true);
        expect(response.body.data.warnings).toContain(
          'You have an active subscription that will need to be cancelled'
        );
      });

      it('returns warnings for POS connection', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@pos.com', 'POS Coffee', 'ACTIVE');
        await addPOSTokens(business.id);

        const response = await request(app)
          .get('/api/ejection/check')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.hasPOSConnection).toBe(true);
        expect(response.body.data.warnings).toContain(
          'Your POS connection tokens will be cleared for security'
        );
      });

      it('returns canEject false for already ejected business', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@ejected.com', 'Ejected Coffee', 'EJECTED');

        const response = await request(app)
          .get('/api/ejection/check')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.canEject).toBe(false);
        expect(response.body.data.canStartOver).toBe(true);
      });
    });

    // Authentication
    describe('Authentication', () => {
      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/ejection/check');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('returns 401 for invalid session token', async () => {
        const response = await request(app)
          .get('/api/ejection/check')
          .set('Cookie', `${SESSION_COOKIE_NAME}=invalid-token`);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });
    });

    // Edge cases
    describe('Edge cases', () => {
      it('handles business with no catalog', async () => {
        const { sessionToken } = await createTestBusiness('owner@nocatalog.com', 'NoCatalog Coffee', 'ACTIVE');

        const response = await request(app)
          .get('/api/ejection/check')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.catalogItemCount).toBe(0);
        expect(response.body.data.categoryCount).toBe(0);
        expect(response.body.data.modifierCount).toBe(0);
      });

      it('handles business with no orders', async () => {
        const { sessionToken } = await createTestBusiness('owner@noorders.com', 'NoOrders Coffee', 'ACTIVE');

        const response = await request(app)
          .get('/api/ejection/check')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.totalOrderCount).toBe(0);
        expect(response.body.data.pendingOrderCount).toBe(0);
      });
    });
  });

  // ===========================================================================
  // POST /api/ejection/eject - Execute ejection
  // ===========================================================================
  describe('POST /api/ejection/eject', () => {
    // Happy path
    describe('Happy path', () => {
      it('ejects business when confirmed is true', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@eject.com', 'Eject Coffee', 'ACTIVE');

        const response = await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          success: true,
          businessId: business.id,
          previousState: 'ACTIVE',
          newState: 'EJECTED',
          dataPreserved: true,
          canStartOver: true,
        });

        // Verify in database
        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.accountState).toBe('EJECTED');
      });

      it('clears POS tokens on ejection', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@clearpos.com', 'ClearPOS Coffee', 'ACTIVE');
        await addPOSTokens(business.id);

        await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.posAccessToken).toBeNull();
        expect(updated?.posRefreshToken).toBeNull();
      });

      it('preserves catalog data (non-destructive)', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@preserve.com', 'Preserve Coffee', 'ACTIVE');
        await addCatalogItems(business.id);

        const categoriesBefore = await prisma.category.count({ where: { businessId: business.id } });

        await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        const categoriesAfter = await prisma.category.count({ where: { businessId: business.id } });
        expect(categoriesAfter).toBe(categoriesBefore);
      });

      it('accepts optional reason', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@reason.com', 'Reason Coffee', 'ACTIVE');

        const response = await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true, reason: 'Closing the business' });

        expect(response.status).toBe(200);
        expect(response.body.data.reason).toBe('Closing the business');
      });
    });

    // Validation
    describe('Validation', () => {
      it('returns 400 when confirmed is false', async () => {
        const { sessionToken } = await createTestBusiness('owner@noconfirm.com', 'NoConfirm Coffee', 'ACTIVE');

        const response = await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: false });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONFIRMATION_REQUIRED');
      });

      it('returns 400 when confirmed is missing', async () => {
        const { sessionToken } = await createTestBusiness('owner@missing.com', 'Missing Coffee', 'ACTIVE');

        const response = await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONFIRMATION_REQUIRED');
      });

      it('returns 400 when already ejected', async () => {
        const { sessionToken } = await createTestBusiness('owner@already.com', 'Already Coffee', 'EJECTED');

        const response = await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ALREADY_EJECTED');
      });
    });

    // Authentication
    describe('Authentication', () => {
      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .post('/api/ejection/eject')
          .send({ confirmed: true });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('returns 401 for invalid session token', async () => {
        const response = await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=invalid-token`)
          .send({ confirmed: true });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });
    });

    // Edge cases
    describe('Edge cases', () => {
      it('can eject from PAUSED state', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@paused.com', 'Paused Coffee', 'PAUSED');

        const response = await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        expect(response.status).toBe(200);
        expect(response.body.data.previousState).toBe('PAUSED');
        expect(response.body.data.newState).toBe('EJECTED');
      });

      it('can eject from ONBOARDING state', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@onboard.com', 'Onboard Coffee', 'ONBOARDING');

        const response = await request(app)
          .post('/api/ejection/eject')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        expect(response.status).toBe(200);
        expect(response.body.data.previousState).toBe('ONBOARDING');
        expect(response.body.data.newState).toBe('EJECTED');
      });
    });
  });

  // ===========================================================================
  // POST /api/ejection/start-over - Reset to onboarding state
  // ===========================================================================
  describe('POST /api/ejection/start-over', () => {
    // Happy path
    describe('Happy path', () => {
      it('resets ejected business to onboarding state', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@startover.com', 'StartOver Coffee', 'ACTIVE');
        // First eject
        await ejectionService.eject(business.id, { confirmed: true });

        const response = await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          success: true,
          businessId: business.id,
          previousState: 'EJECTED',
          newState: 'ONBOARDING',
          redirectTo: '/onboarding',
          catalogCleared: false,
          posConnectionCleared: false,
        });

        // Verify in database
        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.accountState).toBe('ONBOARDING');
      });

      it('preserves catalog data by default', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@keepcatalog.com', 'KeepCatalog Coffee', 'ACTIVE');
        await addCatalogItems(business.id);
        await ejectionService.eject(business.id, { confirmed: true });

        const categoriesBefore = await prisma.category.count({ where: { businessId: business.id } });

        await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        const categoriesAfter = await prisma.category.count({ where: { businessId: business.id } });
        expect(categoriesAfter).toBe(categoriesBefore);
      });

      it('clears catalog when clearCatalog option is true', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@clearcatalog.com', 'ClearCatalog Coffee', 'ACTIVE');
        await addCatalogItems(business.id);
        await ejectionService.eject(business.id, { confirmed: true });

        const response = await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true, clearCatalog: true });

        expect(response.status).toBe(200);
        expect(response.body.data.catalogCleared).toBe(true);

        const categories = await prisma.category.count({ where: { businessId: business.id } });
        expect(categories).toBe(0);
      });

      it('clears POS connection when clearPOSConnection option is true', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@clearposconn.com', 'ClearPOS Coffee', 'ACTIVE');
        await addPOSTokens(business.id);
        await ejectionService.eject(business.id, { confirmed: true });

        const response = await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true, clearPOSConnection: true });

        expect(response.status).toBe(200);
        expect(response.body.data.posConnectionCleared).toBe(true);

        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.posProvider).toBeNull();
        expect(updated?.posMerchantId).toBeNull();
      });
    });

    // Validation
    describe('Validation', () => {
      it('returns 400 when confirmed is false', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@noconfirm2.com', 'NoConfirm2 Coffee', 'ACTIVE');
        await ejectionService.eject(business.id, { confirmed: true });

        const response = await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: false });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONFIRMATION_REQUIRED');
      });

      it('returns 400 when confirmed is missing', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@missing2.com', 'Missing2 Coffee', 'ACTIVE');
        await ejectionService.eject(business.id, { confirmed: true });

        const response = await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONFIRMATION_REQUIRED');
      });

      it('returns 400 when business is not ejected', async () => {
        const { sessionToken } = await createTestBusiness('owner@notejected.com', 'NotEjected Coffee', 'ACTIVE');

        const response = await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_EJECTED');
      });
    });

    // Authentication
    describe('Authentication', () => {
      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .post('/api/ejection/start-over')
          .send({ confirmed: true });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('returns 401 for invalid session token', async () => {
        const response = await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=invalid-token`)
          .send({ confirmed: true });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });
    });

    // Edge cases
    describe('Edge cases', () => {
      it('handles start over when business has no catalog', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@nocatalog2.com', 'NoCatalog2 Coffee', 'ACTIVE');
        await ejectionService.eject(business.id, { confirmed: true });

        const response = await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('clears sync status on start over', async () => {
        const { sessionToken, business } = await createTestBusiness('owner@clearsync.com', 'ClearSync Coffee', 'ACTIVE');
        await prisma.business.update({
          where: { id: business.id },
          data: {
            syncStatus: 'SUCCESS',
            lastSyncedAt: new Date(),
          },
        });
        await ejectionService.eject(business.id, { confirmed: true });

        await request(app)
          .post('/api/ejection/start-over')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ confirmed: true });

        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.syncStatus).toBe('IDLE');
        expect(updated?.lastSyncedAt).toBeNull();
      });
    });
  });
});
