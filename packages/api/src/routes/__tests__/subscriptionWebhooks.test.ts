import request from 'supertest';
import express, { Express } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '../../../generated/prisma';
import { createSubscriptionWebhooksRouter } from '../subscriptionWebhooks';
import { WebhookService } from '../../services/WebhookService';

const prisma = new PrismaClient();

// Test webhook signature secret
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
function createWebhookEvent(type: string, data: Record<string, unknown>, eventId?: string): Record<string, unknown> {
  return {
    merchant_id: 'test-merchant-id',
    type,
    event_id: eventId || `event-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    created_at: new Date().toISOString(),
    data: {
      type: type.split('.')[0], // e.g., 'subscription' from 'subscription.created'
      id: data.id || 'test-id',
      object: data,
    },
  };
}

let webhookService: WebhookService;
let testBusinessId: string;

beforeAll(async () => {
  webhookService = new WebhookService(prisma, {
    webhookSignatureKey: TEST_WEBHOOK_SECRET,
    notificationUrl: TEST_NOTIFICATION_URL,
  });
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
      email: 'webhook-test@test.com',
      passwordHash: 'test-hash',
      businesses: {
        create: {
          name: 'Webhook Test Business',
          slug: 'webhook-test',
          accountState: 'ACTIVE',
          subscriptionStatus: 'sub_test_subscription_id',
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

describe('Subscription Webhooks', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    // Use raw body parser for webhook signature verification
    app.use('/webhooks', express.raw({ type: 'application/json' }));
    app.use('/webhooks', createSubscriptionWebhooksRouter(webhookService));
  });

  describe('POST /webhooks/square/subscription', () => {
    // ==========================================================================
    // HAPPY PATH TESTS
    // ==========================================================================
    describe('Happy Path', () => {
      it('processes subscription.created event', async () => {
        const event = createWebhookEvent('subscription.created', {
          id: 'sub_new_subscription',
          subscription: {
            id: 'sub_new_subscription',
            customer_id: 'cust_123',
            plan_variation_id: 'plan_123',
            status: 'ACTIVE',
            start_date: '2024-01-01',
          },
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        // Update business with the new subscription ID
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { subscriptionStatus: 'sub_new_subscription' },
        });

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.processed).toBe(true);
      });

      it('processes subscription.canceled event', async () => {
        const event = createWebhookEvent('subscription.canceled', {
          id: 'sub_test_subscription_id',
          subscription: {
            id: 'sub_test_subscription_id',
            status: 'CANCELED',
            canceled_date: new Date().toISOString(),
          },
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify business account state was updated
        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('PAUSED');
      });

      it('updates business account state on subscription change', async () => {
        const event = createWebhookEvent('subscription.updated', {
          id: 'sub_test_subscription_id',
          subscription: {
            id: 'sub_test_subscription_id',
            status: 'ACTIVE',
            plan_variation_id: 'plan_premium',
          },
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response.status).toBe(200);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('ACTIVE');
      });
    });

    // ==========================================================================
    // SUCCESS SCENARIOS
    // ==========================================================================
    describe('Success Scenarios', () => {
      it('handles invoice.payment_made - marks subscription active', async () => {
        // Set business to paused state (simulating grace period)
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: 'PAUSED' },
        });

        const event = createWebhookEvent('invoice.payment_made', {
          id: 'inv_123',
          invoice: {
            id: 'inv_123',
            subscription_id: 'sub_test_subscription_id',
            status: 'PAID',
            payment_requests: [{
              computed_amount_money: { amount: 2999, currency: 'USD' },
            }],
          },
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response.status).toBe(200);

        // Verify business is now active
        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('ACTIVE');
      });

      it('handles invoice.payment_failed - starts grace period', async () => {
        const event = createWebhookEvent('invoice.payment_failed', {
          id: 'inv_456',
          invoice: {
            id: 'inv_456',
            subscription_id: 'sub_test_subscription_id',
            status: 'UNPAID',
            payment_requests: [{
              computed_amount_money: { amount: 2999, currency: 'USD' },
            }],
          },
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response.status).toBe(200);

        // Business should still be ACTIVE during grace period
        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        // During grace period, we keep active but set a flag (subscriptionStatus will contain grace info)
        expect(business?.accountState).toBe('ACTIVE');
        expect(business?.subscriptionStatus).toContain('grace_period');
      });

      it('processes subscription.paused correctly', async () => {
        const event = createWebhookEvent('subscription.paused', {
          id: 'sub_test_subscription_id',
          subscription: {
            id: 'sub_test_subscription_id',
            status: 'PAUSED',
          },
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response.status).toBe(200);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('PAUSED');
      });

      it('processes subscription.resumed correctly', async () => {
        // First pause the business
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: 'PAUSED' },
        });

        const event = createWebhookEvent('subscription.resumed', {
          id: 'sub_test_subscription_id',
          subscription: {
            id: 'sub_test_subscription_id',
            status: 'ACTIVE',
          },
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response.status).toBe(200);

        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('ACTIVE');
      });
    });

    // ==========================================================================
    // FAILURE SCENARIOS
    // ==========================================================================
    describe('Failure Scenarios', () => {
      it('rejects invalid webhook signature', async () => {
        const event = createWebhookEvent('subscription.created', {
          id: 'sub_123',
          subscription: { id: 'sub_123', status: 'ACTIVE' },
        });

        const payload = JSON.stringify(event);
        const invalidSignature = 'sha256=invalid-signature';

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', invalidSignature)
          .send(payload);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_SIGNATURE');
      });

      it('handles unknown event types gracefully', async () => {
        const event = createWebhookEvent('unknown.event.type', {
          id: 'unknown_123',
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        // Should acknowledge receipt but note unhandled
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.handled).toBe(false);
        expect(response.body.data.message).toContain('unhandled');
      });

      it('fails gracefully when business not found', async () => {
        const event = createWebhookEvent('subscription.updated', {
          id: 'sub_nonexistent',
          subscription: {
            id: 'sub_nonexistent',
            status: 'ACTIVE',
          },
        });

        // Use a different merchant ID that won't match
        (event as any).merchant_id = 'nonexistent-merchant-id';

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        // Should acknowledge receipt but note that business wasn't found
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.warning).toContain('business not found');
      });
    });

    // ==========================================================================
    // ERROR SCENARIOS
    // ==========================================================================
    describe('Error Scenarios', () => {
      it('handles malformed JSON payload', async () => {
        const malformedPayload = '{ invalid json }';
        const signature = createWebhookSignature(malformedPayload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(malformedPayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_PAYLOAD');
      });

      it('handles missing required fields', async () => {
        const incompleteEvent = {
          merchant_id: 'test-merchant-id',
          type: 'subscription.created',
          // Missing event_id, created_at, data
        };

        const payload = JSON.stringify(incompleteEvent);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_FIELDS');
      });

      it('handles database errors during update', async () => {
        // Create a service with a mock that will fail
        const failingWebhookService = new WebhookService(prisma, {
          webhookSignatureKey: TEST_WEBHOOK_SECRET,
          notificationUrl: TEST_NOTIFICATION_URL,
        });

        // Override the processSubscriptionEvent to throw
        jest.spyOn(failingWebhookService, 'processSubscriptionEvent').mockRejectedValueOnce(
          new Error('Database connection lost')
        );

        const failApp = express();
        failApp.use('/webhooks', express.raw({ type: 'application/json' }));
        failApp.use('/webhooks', createSubscriptionWebhooksRouter(failingWebhookService));

        const event = createWebhookEvent('subscription.updated', {
          id: 'sub_test_subscription_id',
          subscription: { id: 'sub_test_subscription_id', status: 'ACTIVE' },
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(failApp)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    // ==========================================================================
    // EDGE CASES
    // ==========================================================================
    describe('Edge Cases', () => {
      it('handles duplicate webhook events (idempotency)', async () => {
        const eventId = 'event_unique_123';
        const event = createWebhookEvent('subscription.updated', {
          id: 'sub_test_subscription_id',
          subscription: { id: 'sub_test_subscription_id', status: 'ACTIVE' },
        }, eventId);

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        // Send the same event twice
        const response1 = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        const response2 = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);
        // Second request should be acknowledged as already processed
        expect(response2.body.data.duplicate).toBe(true);
      });

      it('handles out-of-order events', async () => {
        // Send subscription.canceled before subscription.created (out of order)
        const canceledEvent = createWebhookEvent('subscription.canceled', {
          id: 'sub_out_of_order',
          subscription: { id: 'sub_out_of_order', status: 'CANCELED' },
        });

        // Update business with the subscription ID
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { subscriptionStatus: 'sub_out_of_order' },
        });

        const payload = JSON.stringify(canceledEvent);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        // Should handle gracefully even if created event hasn't been received
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('handles events for non-existent subscriptions', async () => {
        const event = createWebhookEvent('subscription.updated', {
          id: 'sub_does_not_exist',
          subscription: {
            id: 'sub_does_not_exist',
            status: 'ACTIVE',
          },
        });

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        // Should acknowledge but note subscription not found
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.warning).toBeDefined();
      });

      it('handles grace period expiration', async () => {
        // Set business in grace period
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            accountState: 'ACTIVE',
            subscriptionStatus: 'sub_test_subscription_id|grace_period|2024-01-01', // Grace period started
          },
        });

        // Simulate grace period expiration by sending a final payment failed event
        const event = createWebhookEvent('invoice.payment_failed', {
          id: 'inv_final_failed',
          invoice: {
            id: 'inv_final_failed',
            subscription_id: 'sub_test_subscription_id',
            status: 'UNPAID',
            payment_requests: [{
              computed_amount_money: { amount: 2999, currency: 'USD' },
            }],
          },
        });

        // Add metadata indicating this is beyond grace period
        (event.data as any).object.invoice.automatic_payment_source = 'CARD_ON_FILE';
        (event.data as any).object.invoice.next_payment_attempt_date = null; // No more retries

        const payload = JSON.stringify(event);
        const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        // First, simulate the initial call
        await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send(payload);

        // Now simulate the subscription being canceled due to non-payment
        const cancelEvent = createWebhookEvent('subscription.canceled', {
          id: 'sub_test_subscription_id',
          subscription: {
            id: 'sub_test_subscription_id',
            status: 'CANCELED',
            canceled_date: new Date().toISOString(),
          },
        });

        const cancelPayload = JSON.stringify(cancelEvent);
        const cancelSignature = createWebhookSignature(cancelPayload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', cancelSignature)
          .send(cancelPayload);

        expect(response.status).toBe(200);

        // Business should now be paused
        const business = await prisma.business.findUnique({
          where: { id: testBusinessId },
        });
        expect(business?.accountState).toBe('PAUSED');
      });

      it('handles missing signature header', async () => {
        const event = createWebhookEvent('subscription.created', {
          id: 'sub_123',
          subscription: { id: 'sub_123', status: 'ACTIVE' },
        });

        const payload = JSON.stringify(event);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          // No signature header
          .send(payload);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_SIGNATURE');
      });

      it('handles empty payload', async () => {
        const signature = createWebhookSignature('', TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

        const response = await request(app)
          .post('/webhooks/square/subscription')
          .set('Content-Type', 'application/json')
          .set('x-square-hmacsha256-signature', signature)
          .send('');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('EMPTY_PAYLOAD');
      });
    });
  });
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
      const payload = '{"test": "data"}';
      const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

      const result = service.verifySquareSignature(payload, signature);
      expect(result).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const payload = '{"test": "data"}';
      const invalidSignature = 'sha256=invalid';

      const result = service.verifySquareSignature(payload, invalidSignature);
      expect(result).toBe(false);
    });

    it('returns false for tampered payload', () => {
      const payload = '{"test": "data"}';
      const signature = createWebhookSignature(payload, TEST_WEBHOOK_SECRET, TEST_NOTIFICATION_URL);

      // Tamper with payload
      const tamperedPayload = '{"test": "tampered"}';

      const result = service.verifySquareSignature(tamperedPayload, signature);
      expect(result).toBe(false);
    });

    it('returns false for empty signature', () => {
      const payload = '{"test": "data"}';

      const result = service.verifySquareSignature(payload, '');
      expect(result).toBe(false);
    });
  });

  describe('logWebhookEvent', () => {
    it('logs successful webhook event', async () => {
      const event = {
        event_id: 'test-event-id',
        type: 'subscription.created',
        merchant_id: 'test-merchant-id',
      };

      // Should not throw
      await expect(
        service.logWebhookEvent(event as any, { success: true, processed: true })
      ).resolves.not.toThrow();
    });

    it('logs failed webhook event', async () => {
      const event = {
        event_id: 'test-event-id',
        type: 'subscription.created',
        merchant_id: 'test-merchant-id',
      };

      // Should not throw
      await expect(
        service.logWebhookEvent(event as any, { success: false, error: 'Test error' })
      ).resolves.not.toThrow();
    });
  });
});
