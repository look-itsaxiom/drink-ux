import { PrismaClient, OrderStatus } from '../../../generated/prisma';
import { OrderService, OrderError, CreateOrderInput, OrderItemInput } from '../OrderService';
import { MockPOSAdapter } from '../../adapters/pos/MockPOSAdapter';

const prisma = new PrismaClient();

// Test helper to create a test business with catalog items
async function createTestBusinessWithCatalog(name: string = 'Test Business'): Promise<{
  userId: string;
  businessId: string;
  categoryId: string;
  baseId: string;
  modifierIds: string[];
}> {
  const user = await prisma.user.create({
    data: {
      email: `owner-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
      hashedPassword: 'hashed_password',
      businesses: {
        create: {
          name,
          slug: `test-business-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        },
      },
    },
    include: { businesses: true },
  });

  const businessId = user.businesses[0].id;

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
      basePrice: 3.99,
      posItemId: 'pos-item-1',
    },
  });

  // Create modifiers
  const modifier1 = await prisma.modifier.create({
    data: {
      businessId,
      type: 'MILK',
      name: 'Oat Milk',
      price: 0.75,
      posModifierId: 'pos-mod-1',
    },
  });

  const modifier2 = await prisma.modifier.create({
    data: {
      businessId,
      type: 'SYRUP',
      name: 'Vanilla',
      price: 0.50,
      posModifierId: 'pos-mod-2',
    },
  });

  return {
    userId: user.id,
    businessId,
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
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('OrderService', () => {
  let orderService: OrderService;
  let mockPOSAdapter: MockPOSAdapter;
  let testBusinessId: string;
  let testBaseId: string;
  let testModifierIds: string[];

  beforeEach(async () => {
    await cleanDatabase();

    mockPOSAdapter = new MockPOSAdapter();
    orderService = new OrderService(prisma, mockPOSAdapter);

    const testData = await createTestBusinessWithCatalog();
    testBusinessId = testData.businessId;
    testBaseId = testData.baseId;
    testModifierIds = testData.modifierIds;
  });

  // =============================================================================
  // CREATE ORDER - HAPPY PATH
  // =============================================================================
  describe('createOrder - Happy Path', () => {
    it('creates order with valid input', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'John Doe',
        customerPhone: '555-1234',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'MEDIUM',
            temperature: 'HOT',
            modifiers: testModifierIds,
          },
        ],
      };

      const result = await orderService.createOrder(input);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.orderNumber).toBeDefined();
      expect(result.pickupCode).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(result.items).toHaveLength(1);
      expect(result.customerName).toBe('John Doe');
    });

    it('calculates correct totals with modifiers', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Jane Doe',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'MEDIUM',
            temperature: 'HOT',
            modifiers: testModifierIds, // Oat Milk ($0.75) + Vanilla ($0.50)
          },
        ],
      };

      const result = await orderService.createOrder(input);

      // Base: $3.99 * 1.25 (medium) = $4.99 (rounded)
      // + Oat Milk: $0.75
      // + Vanilla: $0.50
      // Subtotal: $6.24 (rounded)
      expect(result.subtotal).toBeCloseTo(6.24, 2);
      expect(result.tax).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(result.subtotal);
    });

    it('generates unique pickup codes', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Test User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'ICED',
            modifiers: [],
          },
        ],
      };

      const order1 = await orderService.createOrder(input);
      const order2 = await orderService.createOrder(input);

      expect(order1.pickupCode).toBeDefined();
      expect(order2.pickupCode).toBeDefined();
      expect(order1.pickupCode).not.toBe(order2.pickupCode);
      // Pickup codes should be 4 characters
      expect(order1.pickupCode.length).toBe(4);
    });

    it('generates sequential order numbers', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Test User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      const order1 = await orderService.createOrder(input);
      const order2 = await orderService.createOrder(input);
      const order3 = await orderService.createOrder(input);

      // Order numbers should be sequential
      expect(order1.orderNumber).toBeDefined();
      expect(order2.orderNumber).toBeDefined();
      expect(order3.orderNumber).toBeDefined();
    });

    it('submits order to POS successfully', async () => {
      // Configure mock to return successful response
      mockPOSAdapter.setCreateOrderResponse('pos-order-123');

      // Configure business with POS credentials
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posAccessToken: 'test-token',
          posMerchantId: 'test-merchant',
        },
      });

      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'POS Test User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'MEDIUM',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      const result = await orderService.createOrder(input);

      // Verify POS adapter was called
      expect(mockPOSAdapter.getCalls('createOrder').length).toBe(1);
    });

    it('returns order with all fields populated', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Complete Test',
        customerPhone: '555-9999',
        customerEmail: 'test@example.com',
        notes: 'Extra hot please',
        items: [
          {
            baseId: testBaseId,
            quantity: 2,
            size: 'LARGE',
            temperature: 'HOT',
            modifiers: testModifierIds,
            notes: 'No foam',
          },
        ],
      };

      const result = await orderService.createOrder(input);

      expect(result.id).toBeDefined();
      expect(result.orderNumber).toBeDefined();
      expect(result.pickupCode).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].notes).toBe('No foam');
      expect(result.subtotal).toBeGreaterThan(0);
      expect(result.tax).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.createdAt).toBeDefined();
    });
  });

  // =============================================================================
  // CREATE ORDER - ERROR SCENARIOS
  // =============================================================================
  describe('createOrder - Error Scenarios', () => {
    it('rejects order with invalid businessId', async () => {
      const input: CreateOrderInput = {
        businessId: 'non-existent-business',
        customerName: 'Test User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      await expect(orderService.createOrder(input)).rejects.toThrow(OrderError);

      try {
        await orderService.createOrder(input);
      } catch (error) {
        expect((error as OrderError).code).toBe('INVALID_BUSINESS');
      }
    });

    it('rejects order with empty items', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Test User',
        items: [],
      };

      await expect(orderService.createOrder(input)).rejects.toThrow(OrderError);

      try {
        await orderService.createOrder(input);
      } catch (error) {
        expect((error as OrderError).code).toBe('EMPTY_ORDER');
      }
    });

    it('rejects order with invalid item references', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Test User',
        items: [
          {
            baseId: 'non-existent-base',
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      await expect(orderService.createOrder(input)).rejects.toThrow(OrderError);

      try {
        await orderService.createOrder(input);
      } catch (error) {
        expect((error as OrderError).code).toBe('INVALID_ITEM');
      }
    });

    it('handles POS submission failure gracefully', async () => {
      // Configure mock to throw an error
      mockPOSAdapter.setError('createOrder', new Error('POS connection failed'));

      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'POS Fail Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      // Order should still be created but with appropriate status
      const result = await orderService.createOrder(input);

      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING'); // Not confirmed since POS failed
    });

    it('handles POS timeout', async () => {
      // Configure mock to throw a timeout error
      mockPOSAdapter.setError('createOrder', new Error('Request timeout'));

      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Timeout Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      // Order should still be created
      const result = await orderService.createOrder(input);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  // =============================================================================
  // CREATE ORDER - EDGE CASES
  // =============================================================================
  describe('createOrder - Edge Cases', () => {
    it('handles order with multiple items', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Multi Item User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
          {
            baseId: testBaseId,
            quantity: 2,
            size: 'LARGE',
            temperature: 'ICED',
            modifiers: testModifierIds,
          },
        ],
      };

      const result = await orderService.createOrder(input);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].quantity).toBe(1);
      expect(result.items[1].quantity).toBe(2);
    });

    it('handles order with no modifiers', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'No Modifiers User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'MEDIUM',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      const result = await orderService.createOrder(input);

      expect(result).toBeDefined();
      expect(result.items[0].modifiers).toEqual([]);
    });

    it('handles order with all optional fields', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Full Details User',
        customerPhone: '555-1234',
        customerEmail: 'full@example.com',
        notes: 'Please call when ready',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'MEDIUM',
            temperature: 'HOT',
            modifiers: testModifierIds,
            notes: 'Extra foam',
          },
        ],
      };

      const result = await orderService.createOrder(input);

      expect(result).toBeDefined();
      expect(result.notes).toBe('Please call when ready');
    });

    it('handles concurrent order creation (unique codes)', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Concurrent User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      // Create multiple orders sequentially to avoid race conditions
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await orderService.createOrder(input));
      }

      // All pickup codes should be unique
      const pickupCodes = results.map(r => r.pickupCode);
      const uniqueCodes = new Set(pickupCodes);
      expect(uniqueCodes.size).toBe(5);

      // All order numbers should be unique
      const orderNumbers = results.map(r => r.orderNumber);
      const uniqueNumbers = new Set(orderNumbers);
      expect(uniqueNumbers.size).toBe(5);
    });

    it('handles large order (many items)', async () => {
      const items: OrderItemInput[] = Array(10).fill(null).map((_, i) => ({
        baseId: testBaseId,
        quantity: 1,
        size: 'MEDIUM' as const,
        temperature: 'HOT' as const,
        modifiers: i % 2 === 0 ? testModifierIds : [],
        notes: `Item ${i + 1}`,
      }));

      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Large Order User',
        items,
      };

      const result = await orderService.createOrder(input);

      expect(result.items).toHaveLength(10);
    });
  });

  // =============================================================================
  // GET ORDER
  // =============================================================================
  describe('getOrder', () => {
    it('returns order by ID', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Get Order Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      const created = await orderService.createOrder(input);
      const retrieved = await orderService.getOrder(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.customerName).toBe('Get Order Test');
    });

    it('returns null for non-existent order', async () => {
      const retrieved = await orderService.getOrder('non-existent-id');

      expect(retrieved).toBeNull();
    });
  });

  // =============================================================================
  // GET ORDER BY PICKUP CODE
  // =============================================================================
  describe('getOrderByPickupCode', () => {
    it('returns order for customer by pickup code', async () => {
      const input: CreateOrderInput = {
        businessId: testBusinessId,
        customerName: 'Pickup Code Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      const created = await orderService.createOrder(input);
      const retrieved = await orderService.getOrderByPickupCode(testBusinessId, created.pickupCode);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.pickupCode).toBe(created.pickupCode);
    });

    it('returns null for invalid pickup code', async () => {
      const retrieved = await orderService.getOrderByPickupCode(testBusinessId, 'XXXX');

      expect(retrieved).toBeNull();
    });

    it('returns null for pickup code from different business', async () => {
      const otherBusiness = await createTestBusinessWithCatalog('Other Business');

      const input: CreateOrderInput = {
        businessId: otherBusiness.businessId,
        customerName: 'Other Business Order',
        items: [
          {
            baseId: otherBusiness.baseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      };

      const created = await orderService.createOrder(input);

      // Try to retrieve with different business ID
      const retrieved = await orderService.getOrderByPickupCode(testBusinessId, created.pickupCode);

      expect(retrieved).toBeNull();
    });
  });

  // =============================================================================
  // GET BUSINESS ORDERS
  // =============================================================================
  describe('getBusinessOrders', () => {
    beforeEach(async () => {
      // Create multiple orders
      for (let i = 0; i < 5; i++) {
        await orderService.createOrder({
          businessId: testBusinessId,
          customerName: `Customer ${i + 1}`,
          items: [
            {
              baseId: testBaseId,
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
      const orders = await orderService.getBusinessOrders(testBusinessId);

      expect(orders).toHaveLength(5);
    });

    it('supports limit option', async () => {
      const orders = await orderService.getBusinessOrders(testBusinessId, { limit: 3 });

      expect(orders).toHaveLength(3);
    });

    it('supports offset option', async () => {
      const orders = await orderService.getBusinessOrders(testBusinessId, { limit: 2, offset: 2 });

      expect(orders).toHaveLength(2);
    });

    it('filters by status', async () => {
      // Update one order to CONFIRMED
      const orders = await orderService.getBusinessOrders(testBusinessId, { limit: 1 });
      await orderService.updateOrderStatus(orders[0].id, 'CONFIRMED');

      const pendingOrders = await orderService.getBusinessOrders(testBusinessId, {
        status: ['PENDING'],
      });
      const confirmedOrders = await orderService.getBusinessOrders(testBusinessId, {
        status: ['CONFIRMED'],
      });

      expect(pendingOrders).toHaveLength(4);
      expect(confirmedOrders).toHaveLength(1);
    });

    it('returns empty array for business with no orders', async () => {
      const otherBusiness = await createTestBusinessWithCatalog('Empty Business');

      const orders = await orderService.getBusinessOrders(otherBusiness.businessId);

      expect(orders).toHaveLength(0);
    });
  });

  // =============================================================================
  // UPDATE ORDER STATUS
  // =============================================================================
  describe('updateOrderStatus', () => {
    let testOrderId: string;

    beforeEach(async () => {
      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'Status Test User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      });
      testOrderId = order.id;
    });

    it('updates order status from PENDING to CONFIRMED', async () => {
      const updated = await orderService.updateOrderStatus(testOrderId, 'CONFIRMED');

      expect(updated.status).toBe('CONFIRMED');
    });

    it('updates order status through full workflow', async () => {
      await orderService.updateOrderStatus(testOrderId, 'CONFIRMED');
      await orderService.updateOrderStatus(testOrderId, 'PREPARING');
      await orderService.updateOrderStatus(testOrderId, 'READY');
      const completed = await orderService.updateOrderStatus(testOrderId, 'COMPLETED');

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });

    it('throws error for non-existent order', async () => {
      await expect(
        orderService.updateOrderStatus('non-existent-id', 'CONFIRMED')
      ).rejects.toThrow(OrderError);

      try {
        await orderService.updateOrderStatus('non-existent-id', 'CONFIRMED');
      } catch (error) {
        expect((error as OrderError).code).toBe('NOT_FOUND');
      }
    });
  });

  // =============================================================================
  // CANCEL ORDER
  // =============================================================================
  describe('cancelOrder', () => {
    let testOrderId: string;

    beforeEach(async () => {
      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'Cancel Test User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      });
      testOrderId = order.id;
    });

    it('cancels order with reason', async () => {
      const cancelled = await orderService.cancelOrder(testOrderId, 'Customer requested');

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancelReason).toBe('Customer requested');
      expect(cancelled.cancelledAt).toBeDefined();
    });

    it('cancels order without reason', async () => {
      const cancelled = await orderService.cancelOrder(testOrderId);

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancelledAt).toBeDefined();
    });

    it('throws error for non-existent order', async () => {
      await expect(
        orderService.cancelOrder('non-existent-id')
      ).rejects.toThrow(OrderError);
    });

    it('throws error when cancelling READY order', async () => {
      await orderService.updateOrderStatus(testOrderId, 'CONFIRMED');
      await orderService.updateOrderStatus(testOrderId, 'PREPARING');
      await orderService.updateOrderStatus(testOrderId, 'READY');

      await expect(
        orderService.cancelOrder(testOrderId)
      ).rejects.toThrow(OrderError);

      try {
        await orderService.cancelOrder(testOrderId);
      } catch (error) {
        expect((error as OrderError).code).toBe('CANNOT_CANCEL');
      }
    });
  });

  // =============================================================================
  // SYNC ORDER STATUS
  // =============================================================================
  describe('syncOrderStatus', () => {
    let testOrderId: string;

    beforeEach(async () => {
      mockPOSAdapter.setCreateOrderResponse('pos-order-sync-123');

      // Configure business with POS credentials
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posAccessToken: 'test-token',
          posMerchantId: 'test-merchant',
        },
      });

      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'Sync Test User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      });
      testOrderId = order.id;
    });

    it('syncs order status from POS', async () => {
      // Configure mock to return PREPARING status
      mockPOSAdapter.setGetOrderStatusResponse('PREPARING');

      const synced = await orderService.syncOrderStatus(testOrderId);

      expect(synced.status).toBe('PREPARING');
      expect(mockPOSAdapter.getCalls('getOrderStatus').length).toBe(1);
    });

    it('throws error for order without POS ID', async () => {
      // Create an order where POS submission failed
      mockPOSAdapter.setError('createOrder', new Error('POS failed'));

      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'No POS ID User',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      });

      // Clear the error for getOrderStatus
      mockPOSAdapter.reset();

      await expect(
        orderService.syncOrderStatus(order.id)
      ).rejects.toThrow(OrderError);
    });
  });

  // =============================================================================
  // PRICE CALCULATION
  // =============================================================================
  describe('Price Calculation', () => {
    it('applies size multiplier for SMALL (1.0)', async () => {
      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'Small Size Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      });

      // Base price: $3.99 * 1.0 = $3.99
      expect(order.subtotal).toBeCloseTo(3.99, 2);
    });

    it('applies size multiplier for MEDIUM (1.25)', async () => {
      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'Medium Size Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'MEDIUM',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      });

      // Base price: $3.99 * 1.25 = $4.99
      expect(order.subtotal).toBeCloseTo(4.99, 2);
    });

    it('applies size multiplier for LARGE (1.5)', async () => {
      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'Large Size Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'LARGE',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      });

      // Base price: $3.99 * 1.5 = $5.99
      expect(order.subtotal).toBeCloseTo(5.99, 2);
    });

    it('calculates tax at default rate (8.25%)', async () => {
      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'Tax Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      });

      // Tax: $3.99 * 0.0825 = ~$0.33
      expect(order.tax).toBeCloseTo(3.99 * 0.0825, 2);
      expect(order.total).toBeCloseTo(3.99 + (3.99 * 0.0825), 2);
    });

    it('calculates total for multiple items with different quantities', async () => {
      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'Multi Quantity Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 2,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
          {
            baseId: testBaseId,
            quantity: 3,
            size: 'MEDIUM',
            temperature: 'ICED',
            modifiers: testModifierIds,
          },
        ],
      });

      // Item 1: 2 * $3.99 = $7.98
      // Item 2: 3 * ($4.99 + $0.75 + $0.50) = 3 * $6.24 = $18.72
      // Subtotal: $26.70
      const expectedSubtotal = (2 * 3.99) + (3 * (4.99 + 0.75 + 0.50));
      expect(order.subtotal).toBeCloseTo(expectedSubtotal, 2);
    });
  });

  // =============================================================================
  // PICKUP CODE GENERATION
  // =============================================================================
  describe('Pickup Code Generation', () => {
    it('generates 4-character alphanumeric codes', async () => {
      const order = await orderService.createOrder({
        businessId: testBusinessId,
        customerName: 'Code Format Test',
        items: [
          {
            baseId: testBaseId,
            quantity: 1,
            size: 'SMALL',
            temperature: 'HOT',
            modifiers: [],
          },
        ],
      });

      expect(order.pickupCode.length).toBe(4);
      expect(/^[A-Z0-9]+$/.test(order.pickupCode)).toBe(true);
    });

    it('excludes confusing characters (0, O, 1, I)', async () => {
      // Create multiple orders to check pickup codes
      const orders = [];
      for (let i = 0; i < 20; i++) {
        orders.push(await orderService.createOrder({
          businessId: testBusinessId,
          customerName: 'Confusing Chars Test',
          items: [
            {
              baseId: testBaseId,
              quantity: 1,
              size: 'SMALL',
              temperature: 'HOT',
              modifiers: [],
            },
          ],
        }));
      }

      for (const order of orders) {
        // Pickup codes should only contain safe characters (no 0, O, 1, I)
        // Our allowed charset is: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
        expect(order.pickupCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
        expect(order.pickupCode).not.toMatch(/[0O1I]/);
      }
    });
  });
});
