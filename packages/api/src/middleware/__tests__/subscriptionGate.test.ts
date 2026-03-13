/**
 * Tests for Subscription Gate Middleware
 * TDD: Write tests BEFORE implementation
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, AccountState } from '../../../generated/prisma';
import {
  requireActiveSubscription,
  requireStorefrontAccess,
  requireEditAccess,
  checkSubscriptionStatus,
  SubscriptionRequest,
  SubscriptionStatus,
  AccountCapabilities,
  BYPASS_PATHS,
} from '../subscriptionGate';

const prisma = new PrismaClient();

// Test data
let testUserId: string;
let activeBusinessId: string;
let trialBusinessId: string;
let pausedBusinessId: string;
let suspendedBusinessId: string;
let churnedBusinessId: string;
let gracePeriodBusinessId: string;

// Mock response helpers
const createMockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const createMockNext = (): NextFunction => jest.fn();

// Mock console.error to prevent noise in test output
const originalConsoleError = console.error;
beforeAll(async () => {
  console.error = jest.fn();

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
      email: 'subscription-test@example.com',
      hashedPassword: 'not-used-in-this-test',
    },
  });
  testUserId = user.id;

  // Create businesses with different subscription states

  // Active subscription business
  const activeBusiness = await prisma.business.create({
    data: {
      name: 'Active Coffee',
      slug: 'active-coffee',
      ownerId: testUserId,
      accountState: 'ACTIVE',
      subscriptionStatus: JSON.stringify({
        status: 'active',
        planId: 'pro-monthly',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    },
  });
  activeBusinessId = activeBusiness.id;

  // Trial business
  const trialBusiness = await prisma.business.create({
    data: {
      name: 'Trial Coffee',
      slug: 'trial-coffee',
      ownerId: testUserId,
      accountState: 'ACTIVE',
      subscriptionStatus: JSON.stringify({
        status: 'trial',
        planId: 'pro-monthly',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    },
  });
  trialBusinessId = trialBusiness.id;

  // Paused business
  const pausedBusiness = await prisma.business.create({
    data: {
      name: 'Paused Coffee',
      slug: 'paused-coffee',
      ownerId: testUserId,
      accountState: 'PAUSED',
      subscriptionStatus: JSON.stringify({
        status: 'paused',
        planId: 'pro-monthly',
        pausedAt: new Date().toISOString(),
      }),
    },
  });
  pausedBusinessId = pausedBusiness.id;

  // Suspended business (payment failed)
  const suspendedBusiness = await prisma.business.create({
    data: {
      name: 'Suspended Coffee',
      slug: 'suspended-coffee',
      ownerId: testUserId,
      accountState: 'PAUSED',
      subscriptionStatus: JSON.stringify({
        status: 'suspended',
        planId: 'pro-monthly',
        suspendedAt: new Date().toISOString(),
        reason: 'payment_failed',
      }),
    },
  });
  suspendedBusinessId = suspendedBusiness.id;

  // Churned business (cancelled, no resubscribe)
  const churnedBusiness = await prisma.business.create({
    data: {
      name: 'Churned Coffee',
      slug: 'churned-coffee',
      ownerId: testUserId,
      accountState: 'EJECTED',
      subscriptionStatus: JSON.stringify({
        status: 'churned',
        planId: null,
        cancelledAt: new Date().toISOString(),
      }),
    },
  });
  churnedBusinessId = churnedBusiness.id;

  // Grace period business (recently lapsed but still readable)
  const gracePeriodBusiness = await prisma.business.create({
    data: {
      name: 'Grace Period Coffee',
      slug: 'grace-period-coffee',
      ownerId: testUserId,
      accountState: 'PAUSED',
      subscriptionStatus: JSON.stringify({
        status: 'grace_period',
        planId: 'pro-monthly',
        gracePeriodEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    },
  });
  gracePeriodBusinessId = gracePeriodBusiness.id;
});

afterAll(async () => {
  console.error = originalConsoleError;
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

describe('requireActiveSubscription', () => {
  const middleware = requireActiveSubscription(prisma);

  describe('Happy Path - allows access for active subscription', () => {
    it('allows access for active subscription', async () => {
      const req = {
        businessId: activeBusinessId,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows access during trial period', async () => {
      const req = {
        businessId: trialBusinessId,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('adds subscription info to request', async () => {
      const req = {
        businessId: activeBusinessId,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(req.subscriptionStatus).toBeDefined();
      expect(req.subscriptionStatus?.status).toBe('active');
    });
  });

  describe('Failure Scenarios - blocks access without subscription', () => {
    it('returns 402 for no subscription (setup_complete without subscription)', async () => {
      // Create business without subscription
      const noSubBusiness = await prisma.business.create({
        data: {
          name: 'No Subscription Coffee',
          slug: 'no-sub-coffee',
          ownerId: testUserId,
          accountState: 'SETUP_COMPLETE',
          subscriptionStatus: null,
        },
      });

      const req = {
        businessId: noSubBusiness.id,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SUBSCRIPTION_REQUIRED',
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();

      // Cleanup
      await prisma.business.delete({ where: { id: noSubBusiness.id } });
    });

    it('returns 402 for paused subscription', async () => {
      const req = {
        businessId: pausedBusinessId,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'SUBSCRIPTION_PAUSED',
          }),
        })
      );
    });

    it('returns 403 for suspended account', async () => {
      const req = {
        businessId: suspendedBusinessId,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'ACCOUNT_SUSPENDED',
          }),
        })
      );
    });

    it('returns 403 for churned account', async () => {
      const req = {
        businessId: churnedBusinessId,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'ACCOUNT_CHURNED',
          }),
        })
      );
    });

    it('includes upgrade URL in error response', async () => {
      const noSubBusiness = await prisma.business.create({
        data: {
          name: 'Upgrade Test Coffee',
          slug: 'upgrade-test-coffee',
          ownerId: testUserId,
          accountState: 'SETUP_COMPLETE',
          subscriptionStatus: null,
        },
      });

      const req = {
        businessId: noSubBusiness.id,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              upgradeUrl: expect.stringContaining('/subscription'),
            }),
          }),
        })
      );

      await prisma.business.delete({ where: { id: noSubBusiness.id } });
    });
  });

  describe('Bypass Logic - allows certain paths without checking', () => {
    it('allows health check endpoints', async () => {
      const req = {
        businessId: pausedBusinessId,
        path: '/health',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows webhook endpoints', async () => {
      const req = {
        businessId: pausedBusinessId,
        path: '/api/webhooks/stripe',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows auth endpoints', async () => {
      const req = {
        businessId: pausedBusinessId,
        path: '/api/auth/login',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows subscription management endpoints', async () => {
      const req = {
        businessId: pausedBusinessId,
        path: '/api/subscription/checkout',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('handles missing business ID', async () => {
      const req = {
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BUSINESS_ID_REQUIRED',
          }),
        })
      );
    });

    it('handles database errors gracefully', async () => {
      const mockPrisma = {
        business: {
          findUnique: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        },
      } as unknown as PrismaClient;

      const errorMiddleware = requireActiveSubscription(mockPrisma);
      const req = {
        businessId: 'some-id',
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await errorMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        })
      );
    });

    it('handles malformed subscription data', async () => {
      const malformedBusiness = await prisma.business.create({
        data: {
          name: 'Malformed Coffee',
          slug: 'malformed-coffee',
          ownerId: testUserId,
          accountState: 'ACTIVE',
          subscriptionStatus: 'invalid-json{',
        },
      });

      const req = {
        businessId: malformedBusiness.id,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      // Should handle gracefully - treat as no subscription
      expect(res.status).toHaveBeenCalledWith(402);

      await prisma.business.delete({ where: { id: malformedBusiness.id } });
    });
  });
});

describe('requireStorefrontAccess', () => {
  const middleware = requireStorefrontAccess(prisma);

  describe('Success Scenarios', () => {
    it('allows storefront access for active account', async () => {
      const req = {
        businessId: activeBusinessId,
        path: '/api/menu',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.accountCapabilities).toBeDefined();
      expect(req.accountCapabilities?.canProcessOrders).toBe(true);
    });

    it('allows storefront access during grace period (read-only)', async () => {
      const req = {
        businessId: gracePeriodBusinessId,
        path: '/api/menu',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.accountCapabilities?.canProcessOrders).toBe(false);
      expect(req.accountCapabilities?.canViewStorefront).toBe(true);
    });

    it('adds grace period remaining to request', async () => {
      const req = {
        businessId: gracePeriodBusinessId,
        path: '/api/menu',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(req.gracePeriodRemaining).toBeDefined();
      expect(req.gracePeriodRemaining).toBeGreaterThan(0);
    });
  });

  describe('Failure Scenarios', () => {
    it('blocks storefront for suspended account', async () => {
      const req = {
        businessId: suspendedBusinessId,
        path: '/api/menu',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'STOREFRONT_DISABLED',
          }),
        })
      );
    });

    it('blocks storefront for churned account', async () => {
      const req = {
        businessId: churnedBusinessId,
        path: '/api/menu',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.objectContaining({
              resubscribeUrl: expect.stringContaining('/subscription'),
            }),
          }),
        })
      );
    });
  });
});

describe('requireEditAccess', () => {
  const middleware = requireEditAccess(prisma);

  describe('Success Scenarios', () => {
    it('allows edit access for active account', async () => {
      const req = {
        businessId: activeBusinessId,
        path: '/api/catalog',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows edit access for paused account (can still manage)', async () => {
      const req = {
        businessId: pausedBusinessId,
        path: '/api/catalog',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Failure Scenarios', () => {
    it('blocks order processing for paused account', async () => {
      const req = {
        businessId: pausedBusinessId,
        path: '/api/orders',
        method: 'POST',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      // When checking order processing specifically
      const orderMiddleware = requireActiveSubscription(prisma);
      await orderMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(402);
    });

    it('blocks edit for suspended account', async () => {
      const req = {
        businessId: suspendedBusinessId,
        path: '/api/catalog',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('blocks edit for churned account', async () => {
      const req = {
        businessId: churnedBusinessId,
        path: '/api/catalog',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});

describe('checkSubscriptionStatus', () => {
  const middleware = checkSubscriptionStatus(prisma);

  describe('Request Enhancement', () => {
    it('adds subscriptionStatus to request without blocking', async () => {
      const req = {
        businessId: pausedBusinessId,
        path: '/api/dashboard',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      // Should continue even for paused
      expect(next).toHaveBeenCalled();
      expect(req.subscriptionStatus).toBeDefined();
      expect(req.subscriptionStatus?.status).toBe('paused');
    });

    it('adds accountCapabilities with capability flags', async () => {
      const req = {
        businessId: activeBusinessId,
        path: '/api/dashboard',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(req.accountCapabilities).toBeDefined();
      expect(req.accountCapabilities).toEqual(
        expect.objectContaining({
          canViewStorefront: expect.any(Boolean),
          canProcessOrders: expect.any(Boolean),
          canEditCatalog: expect.any(Boolean),
          canManageAccount: expect.any(Boolean),
        })
      );
    });

    it('adds gracePeriodRemaining if in grace period', async () => {
      const req = {
        businessId: gracePeriodBusinessId,
        path: '/api/dashboard',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(req.gracePeriodRemaining).toBeDefined();
      expect(typeof req.gracePeriodRemaining).toBe('number');
    });

    it('continues without blocking for any subscription status', async () => {
      const req = {
        businessId: churnedBusinessId,
        path: '/api/dashboard',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

describe('Edge Cases', () => {
  describe('Grace period last day', () => {
    it('handles last day of grace period', async () => {
      const lastDayBusiness = await prisma.business.create({
        data: {
          name: 'Last Day Coffee',
          slug: 'last-day-coffee',
          ownerId: testUserId,
          accountState: 'PAUSED',
          subscriptionStatus: JSON.stringify({
            status: 'grace_period',
            planId: 'pro-monthly',
            gracePeriodEndsAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour left
          }),
        },
      });

      const middleware = requireStorefrontAccess(prisma);
      const req = {
        businessId: lastDayBusiness.id,
        path: '/api/menu',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.gracePeriodRemaining).toBeDefined();
      expect(req.gracePeriodRemaining!).toBeLessThan(24 * 60 * 60 * 1000); // Less than 1 day in ms

      await prisma.business.delete({ where: { id: lastDayBusiness.id } });
    });
  });

  describe('Subscription expires mid-request handling', () => {
    it('handles expired subscription check', async () => {
      // Business with subscription that just expired
      const expiredBusiness = await prisma.business.create({
        data: {
          name: 'Expired Coffee',
          slug: 'expired-coffee',
          ownerId: testUserId,
          accountState: 'ACTIVE',
          subscriptionStatus: JSON.stringify({
            status: 'active',
            planId: 'pro-monthly',
            currentPeriodEnd: new Date(Date.now() - 1000).toISOString(), // Just expired
          }),
        },
      });

      const middleware = requireActiveSubscription(prisma);
      const req = {
        businessId: expiredBusiness.id,
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      // Should detect expired and return 402
      expect(res.status).toHaveBeenCalledWith(402);

      await prisma.business.delete({ where: { id: expiredBusiness.id } });
    });
  });

  describe('Business not found', () => {
    it('handles non-existent business ID', async () => {
      const middleware = requireActiveSubscription(prisma);
      const req = {
        businessId: 'non-existent-id',
        path: '/api/orders',
      } as SubscriptionRequest;
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BUSINESS_NOT_FOUND',
          }),
        })
      );
    });
  });
});

describe('BYPASS_PATHS constant', () => {
  it('includes health endpoints', () => {
    expect(BYPASS_PATHS).toContain('/health');
  });

  it('includes webhook endpoints', () => {
    expect(BYPASS_PATHS.some(p => p.includes('webhook'))).toBe(true);
  });

  it('includes auth endpoints', () => {
    expect(BYPASS_PATHS.some(p => p.includes('auth'))).toBe(true);
  });

  it('includes subscription endpoints', () => {
    expect(BYPASS_PATHS.some(p => p.includes('subscription'))).toBe(true);
  });
});
