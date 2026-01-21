import { PrismaClient, PaymentStatus, OrderStatus } from '../../../generated/prisma';
import { PaymentService, PaymentError, ProcessPaymentInput } from '../PaymentService';

const prisma = new PrismaClient();

// Mock Square client
interface MockSquareClient {
  paymentsApi: {
    createPayment: jest.Mock;
    getPayment: jest.Mock;
  };
  refundsApi: {
    refundPayment: jest.Mock;
  };
}

function createMockSquareClient(): MockSquareClient {
  return {
    paymentsApi: {
      createPayment: jest.fn(),
      getPayment: jest.fn(),
    },
    refundsApi: {
      refundPayment: jest.fn(),
    },
  };
}

// Test helper to create a test business with an order
async function createTestBusinessWithOrder(): Promise<{
  userId: string;
  businessId: string;
  orderId: string;
  orderTotal: number;
}> {
  const user = await prisma.user.create({
    data: {
      email: `owner-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
      passwordHash: 'hashed_password',
      businesses: {
        create: {
          name: 'Test Coffee Shop',
          slug: `test-shop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          posProvider: 'SQUARE',
          posAccessToken: 'test-access-token',
          posLocationId: 'test-location-id',
        },
      },
    },
    include: { businesses: true },
  });

  const businessId = user.businesses[0].id;

  // Create a category and base for order items
  const category = await prisma.category.create({
    data: {
      businessId,
      name: 'Hot Drinks',
    },
  });

  const base = await prisma.base.create({
    data: {
      businessId,
      categoryId: category.id,
      name: 'Latte',
      basePrice: 5.0,
    },
  });

  // Create an order
  const order = await prisma.order.create({
    data: {
      businessId,
      orderNumber: 'A1',
      pickupCode: 'ABCD',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      subtotal: 5.0,
      tax: 0.41,
      total: 5.41,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      items: {
        create: {
          baseId: base.id,
          name: 'Latte',
          quantity: 1,
          size: 'MEDIUM',
          temperature: 'HOT',
          unitPrice: 5.0,
          totalPrice: 5.0,
          modifiers: '[]',
        },
      },
    },
  });

  return {
    userId: user.id,
    businessId,
    orderId: order.id,
    orderTotal: order.total,
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

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockSquareClient: MockSquareClient;
  let testData: {
    userId: string;
    businessId: string;
    orderId: string;
    orderTotal: number;
  };

  beforeEach(async () => {
    await cleanDatabase();

    mockSquareClient = createMockSquareClient();
    paymentService = new PaymentService(prisma, mockSquareClient as any);

    testData = await createTestBusinessWithOrder();
  });

  // =============================================================================
  // PROCESS PAYMENT - HAPPY PATH
  // =============================================================================
  describe('processPayment - Happy Path', () => {
    it('processes payment successfully with valid token', async () => {
      mockSquareClient.paymentsApi.createPayment.mockResolvedValueOnce({
        result: {
          payment: {
            id: 'payment-123',
            status: 'COMPLETED',
            amountMoney: {
              amount: BigInt(541),
              currency: 'USD',
            },
          },
        },
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: testData.orderTotal,
      };

      const result = await paymentService.processPayment(input);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('payment-123');
      expect(result.status).toBe('COMPLETED');
    });

    it('updates order with payment info on success', async () => {
      mockSquareClient.paymentsApi.createPayment.mockResolvedValueOnce({
        result: {
          payment: {
            id: 'payment-456',
            status: 'COMPLETED',
            amountMoney: {
              amount: BigInt(541),
              currency: 'USD',
            },
          },
        },
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: testData.orderTotal,
      };

      await paymentService.processPayment(input);

      const updatedOrder = await prisma.order.findUnique({
        where: { id: testData.orderId },
      });

      expect(updatedOrder?.paymentId).toBe('payment-456');
      expect(updatedOrder?.paymentStatus).toBe('COMPLETED');
      expect(updatedOrder?.paymentMethod).toBe('card');
      expect(updatedOrder?.paidAt).toBeDefined();
    });

    it('uses idempotency key for payment request', async () => {
      mockSquareClient.paymentsApi.createPayment.mockResolvedValueOnce({
        result: {
          payment: {
            id: 'payment-789',
            status: 'COMPLETED',
          },
        },
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: testData.orderTotal,
      };

      await paymentService.processPayment(input);

      expect(mockSquareClient.paymentsApi.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: expect.any(String),
        })
      );
    });

    it('passes correct amount in cents to Square', async () => {
      mockSquareClient.paymentsApi.createPayment.mockResolvedValueOnce({
        result: {
          payment: {
            id: 'payment-amount-test',
            status: 'COMPLETED',
          },
        },
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: 5.41, // $5.41
      };

      await paymentService.processPayment(input);

      expect(mockSquareClient.paymentsApi.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amountMoney: {
            amount: BigInt(541), // 541 cents
            currency: 'USD',
          },
        })
      );
    });

    it('supports different currencies', async () => {
      mockSquareClient.paymentsApi.createPayment.mockResolvedValueOnce({
        result: {
          payment: {
            id: 'payment-currency-test',
            status: 'COMPLETED',
          },
        },
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: testData.orderTotal, // Must match order total
        currency: 'CAD',
      };

      await paymentService.processPayment(input);

      expect(mockSquareClient.paymentsApi.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amountMoney: {
            amount: BigInt(541), // 541 cents (order total in cents)
            currency: 'CAD',
          },
        })
      );
    });
  });

  // =============================================================================
  // PROCESS PAYMENT - ERROR SCENARIOS
  // =============================================================================
  describe('processPayment - Error Scenarios', () => {
    it('throws error for invalid payment token', async () => {
      mockSquareClient.paymentsApi.createPayment.mockRejectedValue({
        errors: [
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'INVALID_CARD_DATA',
            detail: 'Invalid card data',
          },
        ],
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'invalid-token',
        amount: testData.orderTotal,
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);

      try {
        await paymentService.processPayment(input);
      } catch (error) {
        expect((error as PaymentError).code).toBe('INVALID_CARD_DATA');
      }
    });

    it('handles card declined (insufficient funds)', async () => {
      mockSquareClient.paymentsApi.createPayment.mockRejectedValue({
        errors: [
          {
            category: 'PAYMENT_METHOD_ERROR',
            code: 'CARD_DECLINED_INSUFFICIENT_FUNDS',
            detail: 'Insufficient funds',
          },
        ],
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-declined',
        amount: testData.orderTotal,
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);

      try {
        await paymentService.processPayment(input);
      } catch (error) {
        expect((error as PaymentError).code).toBe('CARD_DECLINED');
        expect((error as PaymentError).message).toContain('insufficient funds');
      }
    });

    it('handles expired card', async () => {
      mockSquareClient.paymentsApi.createPayment.mockRejectedValue({
        errors: [
          {
            category: 'PAYMENT_METHOD_ERROR',
            code: 'CARD_EXPIRED',
            detail: 'Card has expired',
          },
        ],
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-expired',
        amount: testData.orderTotal,
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);

      try {
        await paymentService.processPayment(input);
      } catch (error) {
        expect((error as PaymentError).code).toBe('CARD_EXPIRED');
      }
    });

    it('handles Square API error', async () => {
      mockSquareClient.paymentsApi.createPayment.mockRejectedValue(
        new Error('Square API unavailable')
      );

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: testData.orderTotal,
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);

      try {
        await paymentService.processPayment(input);
      } catch (error) {
        expect((error as PaymentError).code).toBe('PAYMENT_FAILED');
      }
    });

    it('throws error for non-existent order', async () => {
      const input: ProcessPaymentInput = {
        orderId: 'non-existent-order',
        sourceId: 'cnon:card-nonce-ok',
        amount: 5.41,
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);

      try {
        await paymentService.processPayment(input);
      } catch (error) {
        expect((error as PaymentError).code).toBe('ORDER_NOT_FOUND');
      }
    });

    it('throws error for already paid order', async () => {
      // First, mark the order as paid
      await prisma.order.update({
        where: { id: testData.orderId },
        data: {
          paymentStatus: 'COMPLETED',
          paymentId: 'existing-payment-id',
          paidAt: new Date(),
        },
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: testData.orderTotal,
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);

      try {
        await paymentService.processPayment(input);
      } catch (error) {
        expect((error as PaymentError).code).toBe('ORDER_ALREADY_PAID');
      }
    });

    it('updates order status to FAILED on payment failure', async () => {
      mockSquareClient.paymentsApi.createPayment.mockRejectedValueOnce({
        errors: [
          {
            category: 'PAYMENT_METHOD_ERROR',
            code: 'CARD_DECLINED',
            detail: 'Card declined',
          },
        ],
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-declined',
        amount: testData.orderTotal,
      };

      try {
        await paymentService.processPayment(input);
      } catch {
        // Expected to throw
      }

      const updatedOrder = await prisma.order.findUnique({
        where: { id: testData.orderId },
      });

      expect(updatedOrder?.paymentStatus).toBe('FAILED');
    });
  });

  // =============================================================================
  // PROCESS PAYMENT - EDGE CASES
  // =============================================================================
  describe('processPayment - Edge Cases', () => {
    it('handles concurrent payment attempts', async () => {
      // Mark order as PROCESSING first
      await prisma.order.update({
        where: { id: testData.orderId },
        data: { paymentStatus: 'PROCESSING' },
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: testData.orderTotal,
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);

      try {
        await paymentService.processPayment(input);
      } catch (error) {
        expect((error as PaymentError).code).toBe('PAYMENT_IN_PROGRESS');
      }
    });

    it('handles payment timeout gracefully', async () => {
      mockSquareClient.paymentsApi.createPayment.mockImplementationOnce(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        })
      );

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: testData.orderTotal,
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);
    });

    it('handles amount mismatch between input and order', async () => {
      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: 100.00, // Different from order total of 5.41
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);

      try {
        await paymentService.processPayment(input);
      } catch (error) {
        expect((error as PaymentError).code).toBe('AMOUNT_MISMATCH');
      }
    });

    it('handles partial amount (should fail)', async () => {
      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: 2.00, // Partial payment
      };

      await expect(paymentService.processPayment(input)).rejects.toThrow(PaymentError);

      try {
        await paymentService.processPayment(input);
      } catch (error) {
        expect((error as PaymentError).code).toBe('AMOUNT_MISMATCH');
      }
    });
  });

  // =============================================================================
  // GET PAYMENT STATUS
  // =============================================================================
  describe('getPaymentStatus', () => {
    it('returns payment status for valid payment ID', async () => {
      mockSquareClient.paymentsApi.getPayment.mockResolvedValueOnce({
        result: {
          payment: {
            id: 'payment-status-test',
            status: 'COMPLETED',
            amountMoney: {
              amount: BigInt(541),
              currency: 'USD',
            },
          },
        },
      });

      const result = await paymentService.getPaymentStatus('payment-status-test');

      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('payment-status-test');
      expect(result.status).toBe('COMPLETED');
    });

    it('throws error for non-existent payment', async () => {
      mockSquareClient.paymentsApi.getPayment.mockRejectedValue({
        errors: [
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'NOT_FOUND',
            detail: 'Payment not found',
          },
        ],
      });

      await expect(
        paymentService.getPaymentStatus('non-existent-payment')
      ).rejects.toThrow(PaymentError);

      try {
        await paymentService.getPaymentStatus('non-existent-payment');
      } catch (error) {
        expect((error as PaymentError).code).toBe('PAYMENT_NOT_FOUND');
      }
    });

    it('handles pending payment status', async () => {
      mockSquareClient.paymentsApi.getPayment.mockResolvedValueOnce({
        result: {
          payment: {
            id: 'payment-pending',
            status: 'PENDING',
            amountMoney: {
              amount: BigInt(541),
              currency: 'USD',
            },
          },
        },
      });

      const result = await paymentService.getPaymentStatus('payment-pending');

      expect(result.status).toBe('PENDING');
    });
  });

  // =============================================================================
  // REFUND PAYMENT
  // =============================================================================
  describe('refundPayment', () => {
    beforeEach(async () => {
      // Set up a paid order
      await prisma.order.update({
        where: { id: testData.orderId },
        data: {
          paymentStatus: 'COMPLETED',
          paymentId: 'payment-to-refund',
          paymentAmount: testData.orderTotal,
          paidAt: new Date(),
        },
      });
    });

    it('refunds payment successfully', async () => {
      mockSquareClient.refundsApi.refundPayment.mockResolvedValueOnce({
        result: {
          refund: {
            id: 'refund-123',
            status: 'COMPLETED',
            paymentId: 'payment-to-refund',
            amountMoney: {
              amount: BigInt(541),
              currency: 'USD',
            },
          },
        },
      });

      const result = await paymentService.refundPayment('payment-to-refund', 'Customer request');

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('refund-123');
      expect(result.status).toBe('REFUNDED');
    });

    it('updates order status after refund', async () => {
      mockSquareClient.refundsApi.refundPayment.mockResolvedValueOnce({
        result: {
          refund: {
            id: 'refund-456',
            status: 'COMPLETED',
            paymentId: 'payment-to-refund',
            amountMoney: {
              amount: BigInt(541),
              currency: 'USD',
            },
          },
        },
      });

      await paymentService.refundPayment('payment-to-refund');

      const updatedOrder = await prisma.order.findFirst({
        where: { paymentId: 'payment-to-refund' },
      });

      expect(updatedOrder?.paymentStatus).toBe('REFUNDED');
    });

    it('throws error for non-existent payment', async () => {
      mockSquareClient.refundsApi.refundPayment.mockRejectedValueOnce({
        errors: [
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'NOT_FOUND',
            detail: 'Payment not found',
          },
        ],
      });

      await expect(
        paymentService.refundPayment('non-existent-payment')
      ).rejects.toThrow(PaymentError);
    });

    it('throws error for already refunded payment', async () => {
      // Update order to already be refunded
      await prisma.order.update({
        where: { id: testData.orderId },
        data: { paymentStatus: 'REFUNDED' },
      });

      await expect(
        paymentService.refundPayment('payment-to-refund')
      ).rejects.toThrow(PaymentError);

      try {
        await paymentService.refundPayment('payment-to-refund');
      } catch (error) {
        expect((error as PaymentError).code).toBe('ALREADY_REFUNDED');
      }
    });

    it('includes reason in refund request when provided', async () => {
      mockSquareClient.refundsApi.refundPayment.mockResolvedValueOnce({
        result: {
          refund: {
            id: 'refund-with-reason',
            status: 'COMPLETED',
          },
        },
      });

      await paymentService.refundPayment('payment-to-refund', 'Item out of stock');

      expect(mockSquareClient.refundsApi.refundPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Item out of stock',
        })
      );
    });
  });

  // =============================================================================
  // LINK PAYMENT TO ORDER
  // =============================================================================
  describe('linkPaymentToOrder', () => {
    it('links payment to order in database', async () => {
      mockSquareClient.paymentsApi.createPayment.mockResolvedValueOnce({
        result: {
          payment: {
            id: 'linked-payment-123',
            status: 'COMPLETED',
            amountMoney: {
              amount: BigInt(541),
              currency: 'USD',
            },
          },
        },
      });

      const input: ProcessPaymentInput = {
        orderId: testData.orderId,
        sourceId: 'cnon:card-nonce-ok',
        amount: testData.orderTotal,
      };

      await paymentService.processPayment(input);

      const order = await prisma.order.findUnique({
        where: { id: testData.orderId },
      });

      expect(order?.paymentId).toBe('linked-payment-123');
      expect(order?.paymentAmount).toBe(testData.orderTotal);
    });
  });
});
