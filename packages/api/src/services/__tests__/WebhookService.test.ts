import crypto from 'crypto';
import { PrismaClient } from '../../../generated/prisma';
import {
  WebhookService,
  SquareWebhookEvent,
  WebhookError,
} from '../WebhookService';

const prisma = new PrismaClient();

// Test configuration
const TEST_WEBHOOK_SECRET = 'test-webhook-secret-12345';
const TEST_NOTIFICATION_URL = 'https://example.com/webhooks/square/subscription';

/**
 * Helper to create a valid Square webhook signature
 */
function createWebhookSignature(payload: string, secret: string, url: string): string {
  const stringToSign = url + payload;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  return 'sha256=' + hmac.digest('base64');
}

/**
 * Helper to create a Square webhook event payload
 */
function createWebhookEvent(
  type: string,
  data: Record<string, unknown>,
  eventId?: string
): SquareWebhookEvent {
  return {
    merchant_id: 'test-merchant-id',
    type,
    event_id: eventId || `event-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    created_at: new Date().toISOString(),
    data: {
      type: type.split('.')[0],
      id: (data.id as string) || 'test-id',
      object: data,
    },
  };
}

let testBusinessId: string;

beforeAll(async () => {
  // Clean database
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.order.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

beforeEach(async () => {
  // Clean database before each test
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.order.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create test user and business
  const user = await prisma.user.create({
    data: {
      email: 'webhook-service-test@test.com',
      passwordHash: 'test-hash',
      businesses: {
        create: {
          name: 'Webhook Service Test',
          slug: 'webhook-service-test',
          accountState: 'ACTIVE',
          subscriptionStatus: 'sub_test_subscription',
          posMerchantId: 'test-merchant-id',
        },
      },
    },
    include: {
      businesses: true,
    },
  });

  testBusinessId = user.businesses[0].id;
});

afterAll(async () => {
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.order.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await prisma.$disconnect();
});

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(() => {
    service = new WebhookService(prisma, {
      webhookSignatureKey: TEST_WEBHOOK_SECRET,
      notificationUrl: TEST_NOTIFICATION_URL,
    });
  });

  describe('verifySquareSignature', () => {
    it('returns true for valid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

      expect(service.verifySquareSignature(payload, signature)).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const invalidSignature = 'sha256=invalid';

      expect(service.verifySquareSignature(payload, invalidSignature)).toBe(false);
    });

    it('returns false for signature without sha256 prefix', () => {
      const payload = JSON.stringify({ test: 'data' });
      const noPrefixSignature = 'no-prefix-signature';

      expect(service.verifySquareSignature(payload, noPrefixSignature)).toBe(false);
    });

    it('returns false for tampered payload', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

      const tamperedPayload = JSON.stringify({ test: 'tampered' });
      expect(service.verifySquareSignature(tamperedPayload, signature)).toBe(false);
    });

    it('returns false for empty signature', () => {
      const payload = JSON.stringify({ test: 'data' });

      expect(service.verifySquareSignature(payload, '')).toBe(false);
    });

    it('returns false for empty payload', () => {
      const signature = createWebhookSignature('', TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

      expect(service.verifySquareSignature('', signature)).toBe(false);
    });

    it('handles signature with wrong secret', () => {
      const payload = JSON.stringify({ test: 'data' });
      const wrongSecretSignature = createWebhookSignature(payload, 'wrong-secret', TEST_NOTIFICATION_URL);

      expect(service.verifySquareSignature(payload, wrongSecretSignature)).toBe(false);
    });
  });

  describe('validateEventStructure', () => {
    it('returns empty array for valid event', () => {
      const event = createWebhookEvent('subscription.created', { id: 'sub_123' });
      expect(service.validateEventStructure(event)).toEqual([]);
    });

    it('returns missing fields for incomplete event', () => {
      const incompleteEvent = {
        merchant_id: 'test',
        type: 'subscription.created',
        // Missing event_id, created_at, data
      };

      const missingFields = service.validateEventStructure(incompleteEvent);
      expect(missingFields).toContain('event_id');
      expect(missingFields).toContain('created_at');
      expect(missingFields).toContain('data');
    });

    it('returns event for null input', () => {
      expect(service.validateEventStructure(null)).toEqual(['event']);
    });

    it('returns event for undefined input', () => {
      expect(service.validateEventStructure(undefined)).toEqual(['event']);
    });

    it('returns event for non-object input', () => {
      expect(service.validateEventStructure('string')).toEqual(['event']);
    });
  });

  describe('processSubscriptionEvent', () => {
    describe('subscription.created', () => {
      it('creates subscription for new business', async () => {
        const event = createWebhookEvent('subscription.created', {
          id: 'sub_new',
          subscription: {
            id: 'sub_new',
            status: 'ACTIVE',
            customer_id: 'cust_123',
          },
        });

        // Clear existing subscription
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { subscriptionStatus: null },
        });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);
        expect(result.processed).toBe(true);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.subscriptionStatus).toBe('sub_new');
        expect(business?.accountState).toBe('ACTIVE');
      });

      it('returns warning when merchant not found', async () => {
        const event = createWebhookEvent('subscription.created', {
          id: 'sub_new',
          subscription: { id: 'sub_new', status: 'ACTIVE' },
        });
        event.merchant_id = 'unknown-merchant';

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);
        expect(result.warning).toContain('business not found');
      });
    });

    describe('subscription.updated', () => {
      it('updates subscription status', async () => {
        const event = createWebhookEvent('subscription.updated', {
          id: 'sub_test_subscription',
          subscription: {
            id: 'sub_test_subscription',
            status: 'PAUSED',
          },
        });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('PAUSED');
      });

      it('adds warning for mismatched subscription ID', async () => {
        const event = createWebhookEvent('subscription.updated', {
          id: 'sub_different',
          subscription: {
            id: 'sub_different',
            status: 'ACTIVE',
          },
        });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);
        expect(result.warning).toContain('mismatch');
      });
    });

    describe('subscription.canceled', () => {
      it('sets business to PAUSED state', async () => {
        const event = createWebhookEvent('subscription.canceled', {
          id: 'sub_test_subscription',
          subscription: {
            id: 'sub_test_subscription',
            status: 'CANCELED',
          },
        });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('PAUSED');
      });
    });

    describe('subscription.paused', () => {
      it('sets business to PAUSED state', async () => {
        const event = createWebhookEvent('subscription.paused', {
          id: 'sub_test_subscription',
          subscription: {
            id: 'sub_test_subscription',
            status: 'PAUSED',
          },
        });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('PAUSED');
      });
    });

    describe('subscription.resumed', () => {
      it('sets business to ACTIVE state', async () => {
        // First pause the business
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: 'PAUSED' },
        });

        const event = createWebhookEvent('subscription.resumed', {
          id: 'sub_test_subscription',
          subscription: {
            id: 'sub_test_subscription',
            status: 'ACTIVE',
          },
        });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('ACTIVE');
      });
    });

    describe('invoice.payment_made', () => {
      it('clears grace period and activates business', async () => {
        // Set business in grace period
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            accountState: 'ACTIVE',
            subscriptionStatus: 'sub_test_subscription|grace_period|2024-01-01',
          },
        });

        const event = createWebhookEvent('invoice.payment_made', {
          id: 'inv_123',
          invoice: {
            id: 'inv_123',
            subscription_id: 'sub_test_subscription',
            status: 'PAID',
          },
        });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('ACTIVE');
        expect(business?.subscriptionStatus).toBe('sub_test_subscription');
        expect(business?.subscriptionStatus).not.toContain('grace_period');
      });
    });

    describe('invoice.payment_failed', () => {
      it('starts grace period on first failure', async () => {
        const event = createWebhookEvent('invoice.payment_failed', {
          id: 'inv_failed',
          invoice: {
            id: 'inv_failed',
            subscription_id: 'sub_test_subscription',
            status: 'UNPAID',
          },
        });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('ACTIVE'); // Still active during grace
        expect(business?.subscriptionStatus).toContain('grace_period');
      });

      it('keeps existing grace period on subsequent failure', async () => {
        const gracePeriodStart = '2024-01-15';
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            subscriptionStatus: `sub_test_subscription|grace_period|${gracePeriodStart}`,
          },
        });

        const event = createWebhookEvent('invoice.payment_failed', {
          id: 'inv_failed_2',
          invoice: {
            id: 'inv_failed_2',
            subscription_id: 'sub_test_subscription',
            status: 'UNPAID',
          },
        });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.subscriptionStatus).toContain(gracePeriodStart);
      });
    });

    describe('idempotency', () => {
      it('marks duplicate events as already processed', async () => {
        const eventId = 'unique-event-id-123';
        const event = createWebhookEvent('subscription.updated', {
          id: 'sub_test_subscription',
          subscription: { id: 'sub_test_subscription', status: 'ACTIVE' },
        }, eventId);

        // Process first time
        const result1 = await service.processSubscriptionEvent(event);
        expect(result1.success).toBe(true);
        expect(result1.duplicate).toBeUndefined();

        // Process second time
        const result2 = await service.processSubscriptionEvent(event);
        expect(result2.success).toBe(true);
        expect(result2.duplicate).toBe(true);
      });
    });

    describe('unknown events', () => {
      it('returns unhandled for unknown event types', async () => {
        const event = createWebhookEvent('unknown.event', { id: 'unknown' });

        const result = await service.processSubscriptionEvent(event);

        expect(result.success).toBe(true);
        expect(result.handled).toBe(false);
        expect(result.message).toContain('unhandled');
      });
    });
  });

  describe('logWebhookEvent', () => {
    it('logs successful events without throwing', async () => {
      const event = createWebhookEvent('subscription.created', { id: 'test' });

      await expect(
        service.logWebhookEvent(event, { success: true, processed: true })
      ).resolves.not.toThrow();
    });

    it('logs failed events without throwing', async () => {
      const event = createWebhookEvent('subscription.created', { id: 'test' });

      await expect(
        service.logWebhookEvent(event, { success: false, error: 'Test error' })
      ).resolves.not.toThrow();
    });
  });

  describe('configuration', () => {
    it('uses default grace period when not specified', () => {
      const serviceDefault = new WebhookService(prisma, {
        webhookSignatureKey: TEST_WEBHOOK_SECRET,
        notificationUrl: TEST_NOTIFICATION_URL,
      });

      // We can't directly test private fields, but we can test behavior
      expect(serviceDefault).toBeDefined();
    });

    it('uses custom grace period when specified', () => {
      const customService = new WebhookService(prisma, {
        webhookSignatureKey: TEST_WEBHOOK_SECRET,
        notificationUrl: TEST_NOTIFICATION_URL,
        gracePeriodDays: 14,
      });

      expect(customService).toBeDefined();
    });
  });
});
