/**
 * Tests for Subscription Routes
 * TDD: Write tests BEFORE implementation
 */

import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '../../../generated/prisma';
import { createSubscriptionRouter } from '../subscription';
import { SESSION_COOKIE_NAME } from '../../middleware/session';

const prisma = new PrismaClient();

// Test data
let testUserId: string;
let testBusinessId: string;
let sessionToken: string;

// Helper to create session
const createSession = async (userId: string): Promise<string> => {
  const session = await prisma.session.create({
    data: {
      userId,
      token: `test-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return session.token;
};

beforeAll(async () => {
  // Clean database
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

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'subscription-routes-test@example.com',
      hashedPassword: 'not-used-in-this-test',
    },
  });
  testUserId = user.id;

  // Create test business
  const business = await prisma.business.create({
    data: {
      name: 'Subscription Test Coffee',
      slug: 'subscription-test-coffee',
      ownerId: testUserId,
      accountState: 'SETUP_COMPLETE',
      subscriptionStatus: null,
    },
  });
  testBusinessId = business.id;

  // Create session
  sessionToken = await createSession(testUserId);
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

describe('Subscription Routes', () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/subscription', createSubscriptionRouter(prisma));

    // Reset business subscription status
    await prisma.business.update({
      where: { id: testBusinessId },
      data: { subscriptionStatus: null, accountState: 'SETUP_COMPLETE' },
    });
  });

  describe('GET /api/subscription', () => {
    describe('Happy Path', () => {
      it('returns current subscription status when authenticated', async () => {
        // Set up business with active subscription
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            accountState: 'ACTIVE',
            subscriptionStatus: JSON.stringify({
              status: 'active',
              planId: 'pro-monthly',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }),
          },
        });

        const response = await request(app)
          .get('/api/subscription')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.status).toBe('active');
        expect(response.body.data.planId).toBe('pro-monthly');
      });

      it('returns null status for business without subscription', async () => {
        const response = await request(app)
          .get('/api/subscription')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBeNull();
      });
    });

    describe('Failure Scenarios', () => {
      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/subscription')
          .query({ businessId: testBusinessId });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('returns 400 when businessId is missing', async () => {
        const response = await request(app)
          .get('/api/subscription')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('BUSINESS_ID_REQUIRED');
      });

      it('returns 403 when user does not own business', async () => {
        // Create another user's business
        const otherUser = await prisma.user.create({
          data: {
            email: 'other-user@example.com',
            hashedPassword: 'not-used',
          },
        });
        const otherBusiness = await prisma.business.create({
          data: {
            name: 'Other Coffee',
            slug: 'other-coffee',
            ownerId: otherUser.id,
            accountState: 'ACTIVE',
          },
        });

        const response = await request(app)
          .get('/api/subscription')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: otherBusiness.id });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');

        // Cleanup
        await prisma.business.delete({ where: { id: otherBusiness.id } });
        await prisma.user.delete({ where: { id: otherUser.id } });
      });
    });
  });

  describe('POST /api/subscription/checkout', () => {
    describe('Happy Path', () => {
      it('creates checkout session for valid plan', async () => {
        const response = await request(app)
          .post('/api/subscription/checkout')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            planId: 'pro-monthly',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.checkoutUrl).toBeDefined();
        expect(response.body.data.sessionId).toBeDefined();
      });

      it('accepts annual plan', async () => {
        const response = await request(app)
          .post('/api/subscription/checkout')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            planId: 'pro-annual',
          });

        expect(response.status).toBe(200);
        expect(response.body.data.checkoutUrl).toBeDefined();
      });
    });

    describe('Failure Scenarios', () => {
      it('returns 400 for invalid plan', async () => {
        const response = await request(app)
          .post('/api/subscription/checkout')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            planId: 'invalid-plan',
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_PLAN');
      });

      it('returns 400 when businessId is missing', async () => {
        const response = await request(app)
          .post('/api/subscription/checkout')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            planId: 'pro-monthly',
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('BUSINESS_ID_REQUIRED');
      });

      it('returns 400 when business already has active subscription', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            accountState: 'ACTIVE',
            subscriptionStatus: JSON.stringify({
              status: 'active',
              planId: 'pro-monthly',
            }),
          },
        });

        const response = await request(app)
          .post('/api/subscription/checkout')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            planId: 'pro-monthly',
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('ALREADY_SUBSCRIBED');
      });

      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .post('/api/subscription/checkout')
          .send({
            businessId: testBusinessId,
            planId: 'pro-monthly',
          });

        expect(response.status).toBe(401);
      });
    });
  });

  describe('POST /api/subscription/cancel', () => {
    beforeEach(async () => {
      // Set up active subscription
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: 'ACTIVE',
          subscriptionStatus: JSON.stringify({
            status: 'active',
            planId: 'pro-monthly',
            subscriptionId: 'sub_test123',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        },
      });
    });

    describe('Happy Path', () => {
      it('cancels subscription at end of billing period', async () => {
        const response = await request(app)
          .post('/api/subscription/cancel')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.canceledAt).toBeDefined();
        expect(response.body.data.effectiveAt).toBeDefined();
      });

      it('allows cancellation with immediate effect', async () => {
        const response = await request(app)
          .post('/api/subscription/cancel')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            immediate: true,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.effectiveAt).toBeDefined();
      });
    });

    describe('Failure Scenarios', () => {
      it('returns 400 when no active subscription', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            accountState: 'SETUP_COMPLETE',
            subscriptionStatus: null,
          },
        });

        const response = await request(app)
          .post('/api/subscription/cancel')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('NO_ACTIVE_SUBSCRIPTION');
      });

      it('returns 400 when subscription already cancelled', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            subscriptionStatus: JSON.stringify({
              status: 'cancelled',
              planId: 'pro-monthly',
              cancelledAt: new Date().toISOString(),
            }),
          },
        });

        const response = await request(app)
          .post('/api/subscription/cancel')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('ALREADY_CANCELLED');
      });
    });
  });

  describe('POST /api/subscription/pause', () => {
    beforeEach(async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: 'ACTIVE',
          subscriptionStatus: JSON.stringify({
            status: 'active',
            planId: 'pro-monthly',
            subscriptionId: 'sub_test123',
          }),
        },
      });
    });

    describe('Happy Path', () => {
      it('pauses subscription', async () => {
        const response = await request(app)
          .post('/api/subscription/pause')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('paused');
        expect(response.body.data.pausedAt).toBeDefined();
      });

      it('accepts pause duration', async () => {
        const response = await request(app)
          .post('/api/subscription/pause')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            durationDays: 30,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.resumeAt).toBeDefined();
      });
    });

    describe('Failure Scenarios', () => {
      it('returns 400 when subscription not active', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            subscriptionStatus: JSON.stringify({
              status: 'paused',
              planId: 'pro-monthly',
            }),
          },
        });

        const response = await request(app)
          .post('/api/subscription/pause')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('CANNOT_PAUSE');
      });
    });
  });

  describe('POST /api/subscription/resume', () => {
    beforeEach(async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: 'PAUSED',
          subscriptionStatus: JSON.stringify({
            status: 'paused',
            planId: 'pro-monthly',
            pausedAt: new Date().toISOString(),
          }),
        },
      });
    });

    describe('Happy Path', () => {
      it('resumes paused subscription', async () => {
        const response = await request(app)
          .post('/api/subscription/resume')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('active');
        expect(response.body.data.resumedAt).toBeDefined();
      });
    });

    describe('Failure Scenarios', () => {
      it('returns 400 when subscription not paused', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            accountState: 'ACTIVE',
            subscriptionStatus: JSON.stringify({
              status: 'active',
              planId: 'pro-monthly',
            }),
          },
        });

        const response = await request(app)
          .post('/api/subscription/resume')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('NOT_PAUSED');
      });

      it('returns 402 when payment update required', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            subscriptionStatus: JSON.stringify({
              status: 'suspended',
              planId: 'pro-monthly',
              reason: 'payment_failed',
            }),
          },
        });

        const response = await request(app)
          .post('/api/subscription/resume')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
          });

        expect(response.status).toBe(402);
        expect(response.body.error.code).toBe('PAYMENT_REQUIRED');
        expect(response.body.error.details?.updatePaymentUrl).toBeDefined();
      });
    });
  });

  describe('GET /api/subscription/plans', () => {
    it('returns list of available plans', async () => {
      const response = await request(app)
        .get('/api/subscription/plans');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('includes plan details', async () => {
      const response = await request(app)
        .get('/api/subscription/plans');

      const plan = response.body.data[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('price');
      expect(plan).toHaveProperty('interval');
      expect(plan).toHaveProperty('features');
    });

    it('does not require authentication', async () => {
      const response = await request(app)
        .get('/api/subscription/plans');

      // No auth cookie, should still work
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/subscription/upgrade', () => {
    beforeEach(async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: 'ACTIVE',
          subscriptionStatus: JSON.stringify({
            status: 'active',
            planId: 'pro-monthly',
            subscriptionId: 'sub_test123',
          }),
        },
      });
    });

    describe('Happy Path', () => {
      it('switches from monthly to annual plan', async () => {
        const response = await request(app)
          .post('/api/subscription/upgrade')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId, planId: 'pro-annual' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.previousPlanId).toBe('pro-monthly');
        expect(response.body.data.newPlanId).toBe('pro-annual');
        expect(response.body.data.newPrice).toBe(470);
        expect(response.body.data.newInterval).toBe('annual');
        expect(response.body.data.upgradedAt).toBeDefined();
      });

      it('switches from annual to monthly plan', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            subscriptionStatus: JSON.stringify({
              status: 'active',
              planId: 'pro-annual',
            }),
          },
        });

        const response = await request(app)
          .post('/api/subscription/upgrade')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId, planId: 'pro-monthly' });

        expect(response.status).toBe(200);
        expect(response.body.data.previousPlanId).toBe('pro-annual');
        expect(response.body.data.newPlanId).toBe('pro-monthly');
      });

      it('updates subscription status in database', async () => {
        await request(app)
          .post('/api/subscription/upgrade')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId, planId: 'pro-annual' });

        const business = await prisma.business.findUnique({ where: { id: testBusinessId } });
        const status = JSON.parse(business!.subscriptionStatus!);
        expect(status.planId).toBe('pro-annual');
        expect(status.status).toBe('active');
      });
    });

    describe('Failure Scenarios', () => {
      it('returns 400 when no active subscription', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { subscriptionStatus: null, accountState: 'SETUP_COMPLETE' },
        });

        const response = await request(app)
          .post('/api/subscription/upgrade')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId, planId: 'pro-annual' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('NO_ACTIVE_SUBSCRIPTION');
      });

      it('returns 400 when switching to same plan', async () => {
        const response = await request(app)
          .post('/api/subscription/upgrade')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId, planId: 'pro-monthly' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('SAME_PLAN');
      });

      it('returns 400 for invalid plan', async () => {
        const response = await request(app)
          .post('/api/subscription/upgrade')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId, planId: 'nonexistent' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_PLAN');
      });

      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .post('/api/subscription/upgrade')
          .send({ businessId: testBusinessId, planId: 'pro-annual' });

        expect(response.status).toBe(401);
      });

      it('returns 400 when businessId is missing', async () => {
        const response = await request(app)
          .post('/api/subscription/upgrade')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ planId: 'pro-annual' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('BUSINESS_ID_REQUIRED');
      });
    });
  });

  describe('GET /api/subscription/billing-history', () => {
    describe('Happy Path', () => {
      it('returns billing history for business with state changes', async () => {
        await prisma.accountStateHistory.create({
          data: {
            businessId: testBusinessId,
            fromState: 'SETUP_COMPLETE',
            toState: 'TRIAL',
            reason: 'Free trial started (14 days)',
          },
        });

        const response = await request(app)
          .get('/api/subscription/billing-history')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0]).toHaveProperty('id');
        expect(response.body.data[0]).toHaveProperty('date');
        expect(response.body.data[0]).toHaveProperty('type');
        expect(response.body.data[0]).toHaveProperty('description');
      });

      it('returns empty array for business with no state changes', async () => {
        await prisma.accountStateHistory.deleteMany({ where: { businessId: testBusinessId } });

        const response = await request(app)
          .get('/api/subscription/billing-history')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId });

        expect(response.status).toBe(200);
        expect(response.body.data).toEqual([]);
      });
    });

    describe('Failure Scenarios', () => {
      it('returns 400 when businessId is missing', async () => {
        const response = await request(app)
          .get('/api/subscription/billing-history')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('BUSINESS_ID_REQUIRED');
      });

      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/subscription/billing-history')
          .query({ businessId: testBusinessId });

        expect(response.status).toBe(401);
      });

      it('returns 403 when user does not own business', async () => {
        const otherUser = await prisma.user.create({
          data: { email: 'billing-other@example.com', hashedPassword: 'not-used' },
        });
        const otherBusiness = await prisma.business.create({
          data: { name: 'Other Billing Coffee', slug: 'other-billing-coffee', ownerId: otherUser.id, accountState: 'ACTIVE' },
        });

        const response = await request(app)
          .get('/api/subscription/billing-history')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: otherBusiness.id });

        expect(response.status).toBe(403);

        await prisma.business.delete({ where: { id: otherBusiness.id } });
        await prisma.user.delete({ where: { id: otherUser.id } });
      });
    });
  });

  describe('POST /api/subscription/update-payment', () => {
    describe('Happy Path', () => {
      it('updates payment method for active subscription', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            accountState: 'ACTIVE',
            subscriptionStatus: JSON.stringify({
              status: 'active',
              planId: 'pro-monthly',
            }),
          },
        });

        const response = await request(app)
          .post('/api/subscription/update-payment')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId, paymentToken: 'cnon:card-nonce-ok' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.updatedAt).toBeDefined();
        expect(response.body.data.reactivated).toBe(false);
      });

      it('reactivates suspended subscription when payment updated', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            accountState: 'SUSPENDED',
            subscriptionStatus: JSON.stringify({
              status: 'suspended',
              planId: 'pro-monthly',
              suspendedAt: new Date().toISOString(),
              reason: 'payment_failed',
            }),
          },
        });

        const response = await request(app)
          .post('/api/subscription/update-payment')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId, paymentToken: 'cnon:card-nonce-ok' });

        expect(response.status).toBe(200);
        expect(response.body.data.reactivated).toBe(true);

        const business = await prisma.business.findUnique({ where: { id: testBusinessId } });
        expect(business!.accountState).toBe('ACTIVE');
        const status = JSON.parse(business!.subscriptionStatus!);
        expect(status.status).toBe('active');
      });
    });

    describe('Failure Scenarios', () => {
      it('returns 400 when paymentToken is missing', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: {
            subscriptionStatus: JSON.stringify({ status: 'active', planId: 'pro-monthly' }),
          },
        });

        const response = await request(app)
          .post('/api/subscription/update-payment')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('PAYMENT_TOKEN_REQUIRED');
      });

      it('returns 400 when no subscription exists', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { subscriptionStatus: null, accountState: 'SETUP_COMPLETE' },
        });

        const response = await request(app)
          .post('/api/subscription/update-payment')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ businessId: testBusinessId, paymentToken: 'cnon:card-nonce-ok' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('NO_SUBSCRIPTION');
      });

      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .post('/api/subscription/update-payment')
          .send({ businessId: testBusinessId, paymentToken: 'cnon:card-nonce-ok' });

        expect(response.status).toBe(401);
      });

      it('returns 400 when businessId is missing', async () => {
        const response = await request(app)
          .post('/api/subscription/update-payment')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ paymentToken: 'cnon:card-nonce-ok' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('BUSINESS_ID_REQUIRED');
      });
    });
  });
});

describe('Subscription Route Edge Cases', () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/subscription', createSubscriptionRouter(prisma));
  });

  describe('Concurrent requests', () => {
    it('handles concurrent subscription checks', async () => {
      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/subscription')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Invalid session', () => {
    it('returns 401 for expired session', async () => {
      // Create expired session
      const expiredSession = await prisma.session.create({
        data: {
          userId: testUserId,
          token: `expired-token-${Date.now()}`,
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      const response = await request(app)
        .get('/api/subscription')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${expiredSession.token}`)
        .query({ businessId: testBusinessId });

      expect(response.status).toBe(401);

      // Cleanup - use deleteMany since session may already be gone (deleted during auth check)
      await prisma.session.deleteMany({ where: { id: expiredSession.id } });
    });
  });
});
