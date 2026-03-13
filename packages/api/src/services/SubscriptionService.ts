import { PrismaClient, Subscription, SubscriptionPlan, SubscriptionStatus, BillingInterval } from '../../generated/prisma';
import { randomUUID } from 'crypto';

// =============================================================================
// ERROR CLASS
// =============================================================================

/**
 * Custom error class for subscription-related errors
 */
export class SubscriptionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Result from subscription creation
 */
export interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  squareSubscriptionId?: string;
  status?: string;
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}

/**
 * Result from subscription lifecycle operations
 */
export interface SubscriptionOperationResult {
  success: boolean;
  subscriptionId?: string;
  status?: string;
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}

/**
 * Result from checkout URL creation
 */
export interface CheckoutUrlResult {
  checkoutUrl: string;
  paymentLinkId: string;
}

/**
 * Enhanced subscription data with computed fields
 */
export interface SubscriptionWithStatus extends Subscription {
  inGracePeriod: boolean;
  isExpired: boolean;
  plan?: SubscriptionPlan;
}

/**
 * Square subscription plan from catalog
 */
export interface SquarePlan {
  id: string;
  name: string;
  price: number;
  interval: BillingInterval;
}

// =============================================================================
// SQUARE CLIENT INTERFACES
// =============================================================================

interface SquareSubscription {
  id: string;
  planVariationId?: string;
  customerId?: string;
  status?: string;
  startDate?: string;
  chargedThroughDate?: string;
  canceledDate?: string;
}

interface SquareCustomer {
  id: string;
  emailAddress?: string;
}

interface SquareCatalogObject {
  id: string;
  type: string;
  subscriptionPlanData?: {
    name: string;
    phases?: Array<{
      cadence: string;
      recurringPriceMoney?: {
        amount: bigint;
        currency: string;
      };
    }>;
  };
}

interface SquarePaymentLink {
  id: string;
  url: string;
  orderId?: string;
}

interface SquareApiError {
  errors?: Array<{
    category: string;
    code: string;
    detail: string;
  }>;
}

interface SquareClient {
  subscriptionsApi: {
    createSubscription(request: {
      idempotencyKey: string;
      locationId: string;
      planVariationId: string;
      customerId: string;
      cardId?: string;
      startDate?: string;
    }): Promise<{ result: { subscription: SquareSubscription } }>;

    cancelSubscription(subscriptionId: string): Promise<{ result: { subscription: SquareSubscription } }>;

    pauseSubscription(subscriptionId: string, request: {
      pauseCycleDuration?: number;
      pauseEffectiveDate?: string;
      pauseReason?: string;
    }): Promise<{ result: { subscription: SquareSubscription } }>;

    resumeSubscription(subscriptionId: string, request: {
      resumeEffectiveDate?: string;
      resumeChangeTiming?: string;
    }): Promise<{ result: { subscription: SquareSubscription } }>;

    retrieveSubscription(subscriptionId: string): Promise<{ result: { subscription: SquareSubscription } }>;

    listSubscriptionEvents(subscriptionId: string): Promise<{ result: { subscriptionEvents: unknown[] } }>;
  };

  catalogApi: {
    listCatalog(cursor?: string, types?: string[]): Promise<{ result: { objects?: SquareCatalogObject[]; cursor?: string } }>;
    retrieveCatalogObject(objectId: string): Promise<{ result: { object: SquareCatalogObject } }>;
  };

  checkoutApi: {
    createPaymentLink(request: {
      idempotencyKey: string;
      quickPay?: {
        name: string;
        priceMoney: { amount: bigint; currency: string };
        locationId: string;
      };
      checkoutOptions?: {
        redirectUrl?: string;
        subscriptionPlanId?: string;
      };
    }): Promise<{ result: { paymentLink: SquarePaymentLink } }>;
  };

  customersApi: {
    createCustomer(request: {
      idempotencyKey: string;
      emailAddress?: string;
      givenName?: string;
      familyName?: string;
      referenceId?: string;
    }): Promise<{ result: { customer: SquareCustomer } }>;

    retrieveCustomer(customerId: string): Promise<{ result: { customer: SquareCustomer } }>;
  };
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

/**
 * Subscription Service - handles subscription management via Square Subscriptions API
 */
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly squareClient: SquareClient,
    private readonly locationId: string
  ) {}

  // ===========================================================================
  // SUBSCRIPTION PLANS
  // ===========================================================================

  /**
   * Fetch available subscription plans from Square
   */
  async getPlans(): Promise<SquarePlan[]> {
    try {
      const response = await this.squareClient.catalogApi.listCatalog(
        undefined,
        ['SUBSCRIPTION_PLAN']
      );

      const plans: SquarePlan[] = [];
      const objects = response.result.objects || [];

      for (const obj of objects) {
        if (obj.type === 'SUBSCRIPTION_PLAN' && obj.subscriptionPlanData) {
          const phase = obj.subscriptionPlanData.phases?.[0];
          const priceCents = phase?.recurringPriceMoney?.amount || BigInt(0);
          const cadence = phase?.cadence || 'MONTHLY';

          plans.push({
            id: obj.id,
            name: obj.subscriptionPlanData.name,
            price: Number(priceCents) / 100,
            interval: cadence === 'ANNUAL' ? 'YEARLY' : 'MONTHLY',
          });
        }
      }

      return plans;
    } catch (error) {
      const squareError = error as SquareApiError;
      if (squareError.errors && squareError.errors.length > 0) {
        const firstError = squareError.errors[0];
        throw new SubscriptionError(
          'SQUARE_API_ERROR',
          'Failed to fetch subscription plans',
          firstError.detail
        );
      }

      throw new SubscriptionError(
        'SQUARE_API_ERROR',
        'Failed to fetch subscription plans',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get specific plan details by ID
   */
  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    return plan;
  }

  /**
   * Sync subscription plans from Square to local database
   */
  async syncPlansFromSquare(): Promise<void> {
    const squarePlans = await this.getPlans();

    for (const squarePlan of squarePlans) {
      await this.prisma.subscriptionPlan.upsert({
        where: { squarePlanId: squarePlan.id },
        update: {
          name: squarePlan.name,
          price: squarePlan.price,
          interval: squarePlan.interval,
        },
        create: {
          squarePlanId: squarePlan.id,
          name: squarePlan.name,
          price: squarePlan.price,
          interval: squarePlan.interval,
        },
      });
    }
  }

  // ===========================================================================
  // SUBSCRIPTION LIFECYCLE
  // ===========================================================================

  /**
   * Create a new subscription for a business
   */
  async createSubscription(
    businessId: string,
    planId: string,
    paymentSourceId: string
  ): Promise<CreateSubscriptionResult> {
    // Check if business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { owner: true },
    });

    if (!business) {
      throw new SubscriptionError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    // Check if plan exists
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new SubscriptionError('PLAN_NOT_FOUND', 'Subscription plan not found');
    }

    // Check if business already has an active subscription
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });

    if (existingSubscription) {
      throw new SubscriptionError(
        'SUBSCRIPTION_EXISTS',
        'Business already has a subscription'
      );
    }

    try {
      // Create Square customer
      const customerResponse = await this.squareClient.customersApi.createCustomer({
        idempotencyKey: `customer-${businessId}-${randomUUID()}`,
        emailAddress: business.owner.email,
        referenceId: businessId,
      });

      const customerId = customerResponse.result.customer.id;

      // Create Square subscription
      const subscriptionResponse = await this.squareClient.subscriptionsApi.createSubscription({
        idempotencyKey: `subscription-${businessId}-${randomUUID()}`,
        locationId: this.locationId,
        planVariationId: plan.squarePlanId,
        customerId,
        cardId: paymentSourceId,
      });

      const squareSubscription = subscriptionResponse.result.subscription;

      // Create local subscription record
      const subscription = await this.prisma.subscription.create({
        data: {
          businessId,
          planId,
          squareSubscriptionId: squareSubscription.id,
          squareCustomerId: customerId,
          status: 'ACTIVE',
          currentPeriodStart: squareSubscription.startDate
            ? new Date(squareSubscription.startDate)
            : new Date(),
          currentPeriodEnd: squareSubscription.chargedThroughDate
            ? new Date(squareSubscription.chargedThroughDate)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          startedAt: new Date(),
        },
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        squareSubscriptionId: squareSubscription.id,
        status: 'ACTIVE',
      };
    } catch (error) {
      const squareError = error as SquareApiError;
      if (squareError.errors && squareError.errors.length > 0) {
        const firstError = squareError.errors[0];

        // Handle payment errors specifically
        if (
          firstError.category === 'PAYMENT_METHOD_ERROR' ||
          firstError.code === 'CARD_DECLINED'
        ) {
          throw new SubscriptionError(
            'PAYMENT_FAILED',
            'Payment method was declined',
            firstError.detail
          );
        }

        throw new SubscriptionError(
          'SUBSCRIPTION_CREATION_FAILED',
          'Failed to create subscription',
          firstError.detail
        );
      }

      throw new SubscriptionError(
        'SUBSCRIPTION_CREATION_FAILED',
        'Failed to create subscription',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    reason?: string
  ): Promise<SubscriptionOperationResult> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new SubscriptionError('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }

    if (subscription.status === 'CANCELED') {
      throw new SubscriptionError(
        'ALREADY_CANCELED',
        'Subscription is already canceled'
      );
    }

    try {
      // Cancel in Square
      if (subscription.squareSubscriptionId) {
        await this.squareClient.subscriptionsApi.cancelSubscription(
          subscription.squareSubscriptionId
        );
      }

      // Update local record
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          cancelReason: reason,
        },
      });

      return {
        success: true,
        subscriptionId,
        status: 'CANCELED',
      };
    } catch (error) {
      const squareError = error as SquareApiError;
      if (squareError.errors && squareError.errors.length > 0) {
        throw new SubscriptionError(
          'CANCEL_FAILED',
          'Failed to cancel subscription',
          squareError.errors[0].detail
        );
      }

      throw new SubscriptionError(
        'CANCEL_FAILED',
        'Failed to cancel subscription',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(subscriptionId: string): Promise<SubscriptionOperationResult> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new SubscriptionError('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }

    if (subscription.status === 'PAUSED') {
      throw new SubscriptionError('ALREADY_PAUSED', 'Subscription is already paused');
    }

    try {
      // Pause in Square
      if (subscription.squareSubscriptionId) {
        await this.squareClient.subscriptionsApi.pauseSubscription(
          subscription.squareSubscriptionId,
          {}
        );
      }

      // Update local record
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
        },
      });

      return {
        success: true,
        subscriptionId,
        status: 'PAUSED',
      };
    } catch (error) {
      const squareError = error as SquareApiError;
      if (squareError.errors && squareError.errors.length > 0) {
        throw new SubscriptionError(
          'PAUSE_FAILED',
          'Failed to pause subscription',
          squareError.errors[0].detail
        );
      }

      throw new SubscriptionError(
        'PAUSE_FAILED',
        'Failed to pause subscription',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<SubscriptionOperationResult> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new SubscriptionError('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }

    if (subscription.status !== 'PAUSED') {
      throw new SubscriptionError('NOT_PAUSED', 'Subscription is not paused');
    }

    try {
      // Resume in Square
      if (subscription.squareSubscriptionId) {
        await this.squareClient.subscriptionsApi.resumeSubscription(
          subscription.squareSubscriptionId,
          {}
        );
      }

      // Update local record
      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          resumedAt: new Date(),
        },
      });

      return {
        success: true,
        subscriptionId,
        status: 'ACTIVE',
      };
    } catch (error) {
      const squareError = error as SquareApiError;
      if (squareError.errors && squareError.errors.length > 0) {
        throw new SubscriptionError(
          'RESUME_FAILED',
          'Failed to resume subscription',
          squareError.errors[0].detail
        );
      }

      throw new SubscriptionError(
        'RESUME_FAILED',
        'Failed to resume subscription',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get subscription details by ID
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionWithStatus | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new SubscriptionError('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }

    return this.enhanceSubscriptionWithStatus(subscription);
  }

  /**
   * Get subscription for a business
   */
  async getBusinessSubscription(
    businessId: string
  ): Promise<SubscriptionWithStatus | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: { plan: true },
    });

    if (!subscription) {
      return null;
    }

    return this.enhanceSubscriptionWithStatus(subscription);
  }

  /**
   * Update subscription on renewal
   */
  async updateSubscriptionOnRenewal(
    subscriptionId: string,
    newPeriodStart: Date,
    newPeriodEnd: Date
  ): Promise<SubscriptionOperationResult> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new SubscriptionError('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        status: 'ACTIVE', // Ensure status is active on renewal
        gracePeriodEnd: null, // Clear any grace period
      },
    });

    return {
      success: true,
      subscriptionId,
      status: 'ACTIVE',
    };
  }

  // ===========================================================================
  // CHECKOUT FLOW
  // ===========================================================================

  /**
   * Generate Square checkout URL for subscription
   */
  async createCheckoutUrl(
    businessId: string,
    planId: string,
    returnUrl: string
  ): Promise<CheckoutUrlResult> {
    // Verify business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new SubscriptionError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    // Verify plan exists
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new SubscriptionError('PLAN_NOT_FOUND', 'Subscription plan not found');
    }

    try {
      const priceInCents = Math.round(plan.price * 100);

      const response = await this.squareClient.checkoutApi.createPaymentLink({
        idempotencyKey: `checkout-${businessId}-${randomUUID()}`,
        quickPay: {
          name: `${plan.name} Subscription`,
          priceMoney: {
            amount: BigInt(priceInCents),
            currency: 'USD',
          },
          locationId: this.locationId,
        },
        checkoutOptions: {
          redirectUrl: returnUrl,
          subscriptionPlanId: plan.squarePlanId,
        },
      });

      return {
        checkoutUrl: response.result.paymentLink.url,
        paymentLinkId: response.result.paymentLink.id,
      };
    } catch (error) {
      const squareError = error as SquareApiError;
      if (squareError.errors && squareError.errors.length > 0) {
        throw new SubscriptionError(
          'CHECKOUT_CREATION_FAILED',
          'Failed to create checkout URL',
          squareError.errors[0].detail
        );
      }

      throw new SubscriptionError(
        'CHECKOUT_CREATION_FAILED',
        'Failed to create checkout URL',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Enhance subscription with computed status fields
   */
  private enhanceSubscriptionWithStatus(
    subscription: Subscription & { plan?: SubscriptionPlan }
  ): SubscriptionWithStatus {
    const now = new Date();

    // Check if in grace period
    const inGracePeriod =
      subscription.status === 'DELINQUENT' &&
      subscription.gracePeriodEnd !== null &&
      subscription.gracePeriodEnd > now;

    // Check if subscription period has expired
    const isExpired =
      subscription.currentPeriodEnd !== null &&
      subscription.currentPeriodEnd < now;

    return {
      ...subscription,
      inGracePeriod,
      isExpired,
    };
  }
}
