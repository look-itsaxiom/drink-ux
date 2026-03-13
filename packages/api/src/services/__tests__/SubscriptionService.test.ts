import { PrismaClient, SubscriptionStatus, BillingInterval } from '../../../generated/prisma';
import { SubscriptionService, SubscriptionError } from '../SubscriptionService';

const prisma = new PrismaClient();

// =============================================================================
// MOCK SQUARE CLIENT
// =============================================================================

interface MockSquareClient {
  subscriptionsApi: {
    createSubscription: jest.Mock;
    cancelSubscription: jest.Mock;
    pauseSubscription: jest.Mock;
    resumeSubscription: jest.Mock;
    retrieveSubscription: jest.Mock;
    listSubscriptionEvents: jest.Mock;
  };
  catalogApi: {
    listCatalog: jest.Mock;
    retrieveCatalogObject: jest.Mock;
  };
  checkoutApi: {
    createPaymentLink: jest.Mock;
  };
  customersApi: {
    createCustomer: jest.Mock;
    retrieveCustomer: jest.Mock;
  };
}

function createMockSquareClient(): MockSquareClient {
  return {
    subscriptionsApi: {
      createSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
      pauseSubscription: jest.fn(),
      resumeSubscription: jest.fn(),
      retrieveSubscription: jest.fn(),
      listSubscriptionEvents: jest.fn(),
    },
    catalogApi: {
      listCatalog: jest.fn(),
      retrieveCatalogObject: jest.fn(),
    },
    checkoutApi: {
      createPaymentLink: jest.fn(),
    },
    customersApi: {
      createCustomer: jest.fn(),
      retrieveCustomer: jest.fn(),
    },
  };
}

// =============================================================================
// TEST HELPERS
// =============================================================================

async function createTestBusiness(): Promise<{
  userId: string;
  businessId: string;
}> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const user = await prisma.user.create({
    data: {
      email: `owner-${uniqueSuffix}@test.com`,
      hashedPassword: 'hashed_password',
      businesses: {
        create: {
          name: 'Test Coffee Shop',
          slug: `test-shop-${uniqueSuffix}`,
          posProvider: 'SQUARE',
          posAccessToken: 'test-access-token',
          posLocationId: 'test-location-id',
          posMerchantId: 'test-merchant-id',
        },
      },
    },
    include: { businesses: true },
  });

  return {
    userId: user.id,
    businessId: user.businesses[0].id,
  };
}

async function createTestPlan(squarePlanId?: string): Promise<string> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const plan = await prisma.subscriptionPlan.create({
    data: {
      squarePlanId: squarePlanId || `sq-plan-${uniqueSuffix}`,
      name: 'Pro Plan',
      description: 'Full access to all features',
      price: 29.99,
      interval: 'MONTHLY',
      features: ['Unlimited orders', 'Custom branding', 'Analytics'],
      isActive: true,
    },
  });

  return plan.id;
}

async function createTestSubscription(
  businessId: string,
  planId: string,
  status: SubscriptionStatus = 'ACTIVE'
): Promise<string> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const subscription = await prisma.subscription.create({
    data: {
      businessId,
      planId,
      squareSubscriptionId: `sq-sub-${uniqueSuffix}`,
      squareCustomerId: `sq-cust-${uniqueSuffix}`,
      status,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      startedAt: new Date(),
    },
  });

  return subscription.id;
}

async function cleanDatabase() {
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.accountStateHistory.deleteMany();
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

// =============================================================================
// TEST SUITE
// =============================================================================

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let mockSquareClient: MockSquareClient;
  let testBusiness: { userId: string; businessId: string };
  let testPlanId: string;

  beforeEach(async () => {
    await cleanDatabase();

    mockSquareClient = createMockSquareClient();
    subscriptionService = new SubscriptionService(prisma, mockSquareClient as any, 'test-location-id');

    testBusiness = await createTestBusiness();
    testPlanId = await createTestPlan('sq-plan-monthly');
  });

  // ===========================================================================
  // HAPPY PATH TESTS
  // ===========================================================================
  describe('Happy Path', () => {
    describe('createSubscription', () => {
      it('creates subscription successfully with valid plan and payment source', async () => {
        mockSquareClient.customersApi.createCustomer.mockResolvedValueOnce({
          result: {
            customer: {
              id: 'sq-customer-123',
              emailAddress: 'owner@test.com',
            },
          },
        });

        mockSquareClient.subscriptionsApi.createSubscription.mockResolvedValueOnce({
          result: {
            subscription: {
              id: 'sq-subscription-123',
              planVariationId: 'sq-plan-monthly',
              customerId: 'sq-customer-123',
              status: 'ACTIVE',
              startDate: '2024-01-01',
              chargedThroughDate: '2024-02-01',
            },
          },
        });

        const result = await subscriptionService.createSubscription(
          testBusiness.businessId,
          testPlanId,
          'cnon:card-nonce-ok'
        );

        expect(result.success).toBe(true);
        expect(result.subscriptionId).toBeDefined();
        expect(result.squareSubscriptionId).toBe('sq-subscription-123');

        // Verify database record
        const subscription = await prisma.subscription.findUnique({
          where: { id: result.subscriptionId },
        });
        expect(subscription).toBeDefined();
        expect(subscription?.status).toBe('ACTIVE');
      });
    });

    describe('getPlans', () => {
      it('fetches available subscription plans from Square', async () => {
        mockSquareClient.catalogApi.listCatalog.mockResolvedValueOnce({
          result: {
            objects: [
              {
                id: 'sq-plan-monthly',
                type: 'SUBSCRIPTION_PLAN',
                subscriptionPlanData: {
                  name: 'Pro Monthly',
                  phases: [
                    {
                      cadence: 'MONTHLY',
                      recurringPriceMoney: { amount: BigInt(2999), currency: 'USD' },
                    },
                  ],
                },
              },
              {
                id: 'sq-plan-yearly',
                type: 'SUBSCRIPTION_PLAN',
                subscriptionPlanData: {
                  name: 'Pro Yearly',
                  phases: [
                    {
                      cadence: 'ANNUAL',
                      recurringPriceMoney: { amount: BigInt(29900), currency: 'USD' },
                    },
                  ],
                },
              },
            ],
          },
        });

        const plans = await subscriptionService.getPlans();

        expect(plans).toHaveLength(2);
        expect(plans[0].name).toBe('Pro Monthly');
        expect(mockSquareClient.catalogApi.listCatalog).toHaveBeenCalledWith(
          undefined,
          ['SUBSCRIPTION_PLAN']
        );
      });
    });

    describe('createCheckoutUrl', () => {
      it('generates Square checkout URL for subscription', async () => {
        mockSquareClient.checkoutApi.createPaymentLink.mockResolvedValueOnce({
          result: {
            paymentLink: {
              id: 'payment-link-123',
              url: 'https://square.link/checkout/abc123',
              orderId: 'order-123',
            },
          },
        });

        const result = await subscriptionService.createCheckoutUrl(
          testBusiness.businessId,
          testPlanId,
          'https://example.com/return'
        );

        expect(result.checkoutUrl).toBe('https://square.link/checkout/abc123');
        expect(result.paymentLinkId).toBe('payment-link-123');
      });
    });

    describe('getBusinessSubscription', () => {
      it('gets subscription by business ID', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'ACTIVE'
        );

        const subscription = await subscriptionService.getBusinessSubscription(
          testBusiness.businessId
        );

        expect(subscription).toBeDefined();
        expect(subscription?.id).toBe(subscriptionId);
        expect(subscription?.status).toBe('ACTIVE');
      });
    });
  });

  // ===========================================================================
  // SUCCESS SCENARIOS
  // ===========================================================================
  describe('Success Scenarios', () => {
    describe('cancelSubscription', () => {
      it('cancels active subscription', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'ACTIVE'
        );

        const subscription = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
        });

        mockSquareClient.subscriptionsApi.cancelSubscription.mockResolvedValueOnce({
          result: {
            subscription: {
              id: subscription?.squareSubscriptionId,
              status: 'CANCELED',
              canceledDate: '2024-01-15',
            },
          },
        });

        const result = await subscriptionService.cancelSubscription(
          subscriptionId,
          'Customer requested cancellation'
        );

        expect(result.success).toBe(true);
        expect(result.status).toBe('CANCELED');

        // Verify database update
        const updated = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
        });
        expect(updated?.status).toBe('CANCELED');
        expect(updated?.cancelReason).toBe('Customer requested cancellation');
        expect(updated?.canceledAt).toBeDefined();
      });
    });

    describe('pauseSubscription', () => {
      it('pauses active subscription', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'ACTIVE'
        );

        const subscription = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
        });

        mockSquareClient.subscriptionsApi.pauseSubscription.mockResolvedValueOnce({
          result: {
            subscription: {
              id: subscription?.squareSubscriptionId,
              status: 'PAUSED',
            },
          },
        });

        const result = await subscriptionService.pauseSubscription(subscriptionId);

        expect(result.success).toBe(true);
        expect(result.status).toBe('PAUSED');

        // Verify database update
        const updated = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
        });
        expect(updated?.status).toBe('PAUSED');
        expect(updated?.pausedAt).toBeDefined();
      });
    });

    describe('resumeSubscription', () => {
      it('resumes paused subscription', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'PAUSED'
        );

        // Update to set pausedAt
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: { pausedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days ago
        });

        const subscription = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
        });

        mockSquareClient.subscriptionsApi.resumeSubscription.mockResolvedValueOnce({
          result: {
            subscription: {
              id: subscription?.squareSubscriptionId,
              status: 'ACTIVE',
            },
          },
        });

        const result = await subscriptionService.resumeSubscription(subscriptionId);

        expect(result.success).toBe(true);
        expect(result.status).toBe('ACTIVE');

        // Verify database update
        const updated = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
        });
        expect(updated?.status).toBe('ACTIVE');
        expect(updated?.resumedAt).toBeDefined();
      });
    });

    describe('updateSubscriptionOnRenewal', () => {
      it('updates subscription on renewal', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'ACTIVE'
        );

        const newPeriodStart = new Date();
        const newPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const result = await subscriptionService.updateSubscriptionOnRenewal(
          subscriptionId,
          newPeriodStart,
          newPeriodEnd
        );

        expect(result.success).toBe(true);

        // Verify database update
        const updated = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
        });
        expect(updated?.currentPeriodStart?.getTime()).toBe(newPeriodStart.getTime());
        expect(updated?.currentPeriodEnd?.getTime()).toBe(newPeriodEnd.getTime());
      });
    });
  });

  // ===========================================================================
  // FAILURE SCENARIOS
  // ===========================================================================
  describe('Failure Scenarios', () => {
    describe('createSubscription', () => {
      it('fails to create subscription with invalid plan', async () => {
        await expect(
          subscriptionService.createSubscription(
            testBusiness.businessId,
            'non-existent-plan-id',
            'cnon:card-nonce-ok'
          )
        ).rejects.toThrow(SubscriptionError);

        try {
          await subscriptionService.createSubscription(
            testBusiness.businessId,
            'non-existent-plan-id',
            'cnon:card-nonce-ok'
          );
        } catch (error) {
          expect((error as SubscriptionError).code).toBe('PLAN_NOT_FOUND');
        }
      });

      it('fails to create subscription with invalid business', async () => {
        await expect(
          subscriptionService.createSubscription(
            'non-existent-business-id',
            testPlanId,
            'cnon:card-nonce-ok'
          )
        ).rejects.toThrow(SubscriptionError);

        try {
          await subscriptionService.createSubscription(
            'non-existent-business-id',
            testPlanId,
            'cnon:card-nonce-ok'
          );
        } catch (error) {
          expect((error as SubscriptionError).code).toBe('BUSINESS_NOT_FOUND');
        }
      });
    });

    describe('cancelSubscription', () => {
      it('fails to cancel already canceled subscription', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'CANCELED'
        );

        await expect(
          subscriptionService.cancelSubscription(subscriptionId)
        ).rejects.toThrow(SubscriptionError);

        try {
          await subscriptionService.cancelSubscription(subscriptionId);
        } catch (error) {
          expect((error as SubscriptionError).code).toBe('ALREADY_CANCELED');
        }
      });
    });

    describe('pauseSubscription', () => {
      it('fails to pause already paused subscription', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'PAUSED'
        );

        await expect(
          subscriptionService.pauseSubscription(subscriptionId)
        ).rejects.toThrow(SubscriptionError);

        try {
          await subscriptionService.pauseSubscription(subscriptionId);
        } catch (error) {
          expect((error as SubscriptionError).code).toBe('ALREADY_PAUSED');
        }
      });
    });

    describe('resumeSubscription', () => {
      it('fails to resume non-paused subscription', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'ACTIVE'
        );

        await expect(
          subscriptionService.resumeSubscription(subscriptionId)
        ).rejects.toThrow(SubscriptionError);

        try {
          await subscriptionService.resumeSubscription(subscriptionId);
        } catch (error) {
          expect((error as SubscriptionError).code).toBe('NOT_PAUSED');
        }
      });
    });

    describe('createSubscription with invalid payment source', () => {
      it('fails with invalid payment source', async () => {
        // Mock customer creation to succeed
        mockSquareClient.customersApi.createCustomer.mockResolvedValueOnce({
          result: {
            customer: {
              id: 'sq-customer-123',
            },
          },
        });

        // Mock subscription creation to fail with payment error
        mockSquareClient.subscriptionsApi.createSubscription.mockRejectedValueOnce({
          errors: [
            {
              category: 'PAYMENT_METHOD_ERROR',
              code: 'CARD_DECLINED',
              detail: 'Card was declined',
            },
          ],
        });

        try {
          await subscriptionService.createSubscription(
            testBusiness.businessId,
            testPlanId,
            'invalid-payment-source'
          );
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(SubscriptionError);
          expect((error as SubscriptionError).code).toBe('PAYMENT_FAILED');
          expect((error as SubscriptionError).message).toBe('Payment method was declined');
        }
      });
    });
  });

  // ===========================================================================
  // ERROR SCENARIOS
  // ===========================================================================
  describe('Error Scenarios', () => {
    describe('Square API errors', () => {
      it('handles Square API errors gracefully', async () => {
        mockSquareClient.catalogApi.listCatalog.mockRejectedValueOnce({
          errors: [
            {
              category: 'API_ERROR',
              code: 'INTERNAL_SERVER_ERROR',
              detail: 'Internal server error',
            },
          ],
        });

        await expect(subscriptionService.getPlans()).rejects.toThrow(SubscriptionError);

        try {
          await subscriptionService.getPlans();
        } catch (error) {
          expect((error as SubscriptionError).code).toBe('SQUARE_API_ERROR');
        }
      });
    });

    describe('Network timeouts', () => {
      it('handles network timeouts', async () => {
        mockSquareClient.catalogApi.listCatalog.mockImplementationOnce(
          () => new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 100);
          })
        );

        await expect(subscriptionService.getPlans()).rejects.toThrow(SubscriptionError);
      });
    });

    describe('Invalid subscription ID', () => {
      it('handles invalid subscription ID', async () => {
        await expect(
          subscriptionService.getSubscription('non-existent-id')
        ).rejects.toThrow(SubscriptionError);

        try {
          await subscriptionService.getSubscription('non-existent-id');
        } catch (error) {
          expect((error as SubscriptionError).code).toBe('SUBSCRIPTION_NOT_FOUND');
        }
      });

      it('handles invalid subscription ID for cancel', async () => {
        await expect(
          subscriptionService.cancelSubscription('non-existent-id')
        ).rejects.toThrow(SubscriptionError);

        try {
          await subscriptionService.cancelSubscription('non-existent-id');
        } catch (error) {
          expect((error as SubscriptionError).code).toBe('SUBSCRIPTION_NOT_FOUND');
        }
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================
  describe('Edge Cases', () => {
    describe('Business with no subscription', () => {
      it('returns null for business with no subscription', async () => {
        const subscription = await subscriptionService.getBusinessSubscription(
          testBusiness.businessId
        );

        expect(subscription).toBeNull();
      });
    });

    describe('Subscription in grace period', () => {
      it('handles subscription in grace period', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'DELINQUENT'
        );

        // Set grace period end to future
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            gracePeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          },
        });

        const subscription = await subscriptionService.getSubscription(subscriptionId);

        expect(subscription).toBeDefined();
        expect(subscription?.status).toBe('DELINQUENT');
        expect(subscription?.inGracePeriod).toBe(true);
      });

      it('handles expired grace period', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'DELINQUENT'
        );

        // Set grace period end to past
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            gracePeriodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          },
        });

        const subscription = await subscriptionService.getSubscription(subscriptionId);

        expect(subscription).toBeDefined();
        expect(subscription?.inGracePeriod).toBe(false);
      });
    });

    describe('Multiple subscription attempts for same business', () => {
      it('prevents duplicate subscription for same business', async () => {
        // Create first subscription
        await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'ACTIVE'
        );

        // Attempt to create another subscription
        mockSquareClient.customersApi.createCustomer.mockResolvedValueOnce({
          result: { customer: { id: 'sq-customer-456' } },
        });

        await expect(
          subscriptionService.createSubscription(
            testBusiness.businessId,
            testPlanId,
            'cnon:card-nonce-ok'
          )
        ).rejects.toThrow(SubscriptionError);

        try {
          await subscriptionService.createSubscription(
            testBusiness.businessId,
            testPlanId,
            'cnon:card-nonce-ok'
          );
        } catch (error) {
          expect((error as SubscriptionError).code).toBe('SUBSCRIPTION_EXISTS');
        }
      });
    });

    describe('Expired subscription handling', () => {
      it('identifies expired subscription', async () => {
        const subscriptionId = await createTestSubscription(
          testBusiness.businessId,
          testPlanId,
          'ACTIVE'
        );

        // Set current period end to past
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            currentPeriodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          },
        });

        const subscription = await subscriptionService.getSubscription(subscriptionId);

        expect(subscription).toBeDefined();
        expect(subscription?.isExpired).toBe(true);
      });
    });

    describe('getPlan by ID', () => {
      it('gets specific plan details', async () => {
        mockSquareClient.catalogApi.retrieveCatalogObject.mockResolvedValueOnce({
          result: {
            object: {
              id: 'sq-plan-monthly',
              type: 'SUBSCRIPTION_PLAN',
              subscriptionPlanData: {
                name: 'Pro Monthly',
                phases: [
                  {
                    cadence: 'MONTHLY',
                    recurringPriceMoney: { amount: BigInt(2999), currency: 'USD' },
                  },
                ],
              },
            },
          },
        });

        const plan = await subscriptionService.getPlan(testPlanId);

        expect(plan).toBeDefined();
        expect(plan?.name).toBe('Pro Plan'); // From DB
      });

      it('returns null for non-existent plan', async () => {
        const plan = await subscriptionService.getPlan('non-existent-plan-id');

        expect(plan).toBeNull();
      });
    });
  });

  // ===========================================================================
  // SUBSCRIPTION PLAN TESTS
  // ===========================================================================
  describe('SubscriptionPlan Management', () => {
    it('syncs plans from Square to database', async () => {
      mockSquareClient.catalogApi.listCatalog.mockResolvedValueOnce({
        result: {
          objects: [
            {
              id: 'sq-plan-new',
              type: 'SUBSCRIPTION_PLAN',
              subscriptionPlanData: {
                name: 'New Plan',
                phases: [
                  {
                    cadence: 'MONTHLY',
                    recurringPriceMoney: { amount: BigInt(1999), currency: 'USD' },
                  },
                ],
              },
            },
          ],
        },
      });

      await subscriptionService.syncPlansFromSquare();

      const plan = await prisma.subscriptionPlan.findUnique({
        where: { squarePlanId: 'sq-plan-new' },
      });

      expect(plan).toBeDefined();
      expect(plan?.name).toBe('New Plan');
      expect(plan?.price).toBe(19.99);
    });

    it('updates existing plan on sync', async () => {
      // Create existing plan
      await prisma.subscriptionPlan.create({
        data: {
          squarePlanId: 'sq-plan-existing',
          name: 'Old Name',
          price: 10.00,
          interval: 'MONTHLY',
        },
      });

      mockSquareClient.catalogApi.listCatalog.mockResolvedValueOnce({
        result: {
          objects: [
            {
              id: 'sq-plan-existing',
              type: 'SUBSCRIPTION_PLAN',
              subscriptionPlanData: {
                name: 'Updated Name',
                phases: [
                  {
                    cadence: 'MONTHLY',
                    recurringPriceMoney: { amount: BigInt(1500), currency: 'USD' },
                  },
                ],
              },
            },
          ],
        },
      });

      await subscriptionService.syncPlansFromSquare();

      const plan = await prisma.subscriptionPlan.findUnique({
        where: { squarePlanId: 'sq-plan-existing' },
      });

      expect(plan?.name).toBe('Updated Name');
      expect(plan?.price).toBe(15.00);
    });
  });
});
