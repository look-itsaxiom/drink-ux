/**
 * Subscription Routes
 *
 * Handles subscription management operations:
 * - GET /subscription - Get current subscription status
 * - POST /subscription/checkout - Create checkout session
 * - POST /subscription/cancel - Cancel subscription
 * - POST /subscription/pause - Pause subscription
 * - POST /subscription/resume - Resume subscription
 * - POST /subscription/upgrade - Switch plans without cancel/re-subscribe
 * - GET /subscription/billing-history - Get billing event history
 * - POST /subscription/update-payment - Update payment method (reactivates if suspended)
 * - GET /subscription/plans - List available plans
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, AccountState } from '../../generated/prisma';
import { ApiResponse } from '@drink-ux/shared';
import {
  sessionMiddleware,
  requireAuth,
  AuthenticatedRequest,
  SESSION_COOKIE_NAME,
} from '../middleware/session';
import { AuthService } from '../services/AuthService';

/**
 * Subscription status from database
 */
interface SubscriptionStatus {
  status: 'active' | 'trial' | 'paused' | 'suspended' | 'churned' | 'grace_period' | 'cancelled' | null;
  planId: string | null;
  subscriptionId?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  pausedAt?: string;
  suspendedAt?: string;
  cancelledAt?: string;
  gracePeriodEndsAt?: string;
  resumeAt?: string;
  reason?: string;
}

/**
 * Plan information
 */
interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'annual';
  features: string[];
}

/**
 * Available subscription plans
 */
const AVAILABLE_PLANS: Plan[] = [
  {
    id: 'pro-monthly',
    name: 'Pro Monthly',
    price: 49,
    interval: 'monthly',
    features: [
      'Unlimited orders',
      'Custom branding',
      'POS integration',
      'Analytics dashboard',
      'Priority support',
    ],
  },
  {
    id: 'pro-annual',
    name: 'Pro Annual',
    price: 470,
    interval: 'annual',
    features: [
      'Unlimited orders',
      'Custom branding',
      'POS integration',
      'Analytics dashboard',
      'Priority support',
      '2 months free',
    ],
  },
];

/**
 * Valid plan IDs
 */
const VALID_PLAN_IDS = AVAILABLE_PLANS.map(p => p.id);

/**
 * Parse subscription status from JSON string
 */
function parseSubscriptionStatus(subscriptionStatusJson: string | null): SubscriptionStatus | null {
  if (!subscriptionStatusJson) {
    return null;
  }

  try {
    return JSON.parse(subscriptionStatusJson) as SubscriptionStatus;
  } catch {
    return null;
  }
}

/**
 * Stringify subscription status to JSON
 */
function stringifySubscriptionStatus(status: SubscriptionStatus): string {
  return JSON.stringify(status);
}

/**
 * Extended request with user and business
 */
interface SubscriptionRequest extends AuthenticatedRequest {
  business?: {
    id: string;
    ownerId: string;
    subscriptionStatus: string | null;
    accountState: AccountState;
  };
}

/**
 * Map account state to billing event type
 */
function mapStateToEventType(state: string): string {
  switch (state) {
    case 'ACTIVE': return 'payment_success';
    case 'TRIAL': return 'trial_started';
    case 'GRACE_PERIOD': return 'payment_failed';
    case 'SUSPENDED': return 'subscription_suspended';
    case 'PAUSED': return 'subscription_paused';
    default: return 'status_change';
  }
}

/**
 * Creates the subscription router
 */
export function createSubscriptionRouter(prisma: PrismaClient): Router {
  const router = Router();

  // Create AuthService for session middleware
  const authService = new AuthService(prisma);

  // Apply session middleware to all routes
  router.use(sessionMiddleware(authService));

  /**
   * GET /api/subscription
   * Get current subscription status
   */
  router.get('/', requireAuth, async (req: SubscriptionRequest, res: Response) => {
    try {
      const businessId = req.query.businessId as string;

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_ID_REQUIRED',
            message: 'Business ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Look up business
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: 'Business not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check ownership
      if (business.ownerId !== req.user!.id) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to view this business subscription',
          },
        };
        res.status(403).json(response);
        return;
      }

      // Parse subscription status
      const subscriptionStatus = parseSubscriptionStatus(business.subscriptionStatus);

      const response: ApiResponse<SubscriptionStatus> = {
        success: true,
        data: subscriptionStatus || { status: null, planId: null },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get subscription error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get subscription status',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/subscription/checkout
   * Create checkout session for subscription
   */
  router.post('/checkout', requireAuth, async (req: SubscriptionRequest, res: Response) => {
    try {
      const { businessId, planId } = req.body;

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_ID_REQUIRED',
            message: 'Business ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      if (!planId || !VALID_PLAN_IDS.includes(planId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_PLAN',
            message: 'Invalid plan ID. Valid plans are: ' + VALID_PLAN_IDS.join(', '),
          },
        };
        res.status(400).json(response);
        return;
      }

      // Look up business
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: 'Business not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check ownership
      if (business.ownerId !== req.user!.id) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to manage this business subscription',
          },
        };
        res.status(403).json(response);
        return;
      }

      // Check if already subscribed
      const currentSubscription = parseSubscriptionStatus(business.subscriptionStatus);
      if (currentSubscription?.status === 'active' || currentSubscription?.status === 'trial') {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'ALREADY_SUBSCRIBED',
            message: 'This business already has an active subscription',
          },
        };
        res.status(400).json(response);
        return;
      }

      // In a real implementation, this would create a Stripe checkout session
      // For now, simulate checkout session creation
      const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const checkoutUrl = `/checkout?session=${sessionId}&plan=${planId}&business=${businessId}`;

      const response: ApiResponse<{ sessionId: string; checkoutUrl: string }> = {
        success: true,
        data: {
          sessionId,
          checkoutUrl,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Create checkout error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create checkout session',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/subscription/cancel
   * Cancel subscription
   */
  router.post('/cancel', requireAuth, async (req: SubscriptionRequest, res: Response) => {
    try {
      const { businessId, immediate = false } = req.body;

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_ID_REQUIRED',
            message: 'Business ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Look up business
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: 'Business not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check ownership
      if (business.ownerId !== req.user!.id) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to manage this business subscription',
          },
        };
        res.status(403).json(response);
        return;
      }

      // Check current subscription status
      const currentSubscription = parseSubscriptionStatus(business.subscriptionStatus);

      if (!currentSubscription || !currentSubscription.status || currentSubscription.status === 'cancelled') {
        if (currentSubscription?.status === 'cancelled') {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'ALREADY_CANCELLED',
              message: 'Subscription is already cancelled',
            },
          };
          res.status(400).json(response);
          return;
        }

        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NO_ACTIVE_SUBSCRIPTION',
            message: 'No active subscription to cancel',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Calculate effective date
      const canceledAt = new Date().toISOString();
      const effectiveAt = immediate
        ? canceledAt
        : currentSubscription.currentPeriodEnd || canceledAt;

      // Update subscription status
      const newSubscription: SubscriptionStatus = {
        ...currentSubscription,
        status: immediate ? 'cancelled' : currentSubscription.status,
        cancelledAt: canceledAt,
      };

      await prisma.business.update({
        where: { id: businessId },
        data: {
          subscriptionStatus: stringifySubscriptionStatus(newSubscription),
          accountState: immediate ? 'PAUSED' : business.accountState,
        },
      });

      const response: ApiResponse<{ canceledAt: string; effectiveAt: string }> = {
        success: true,
        data: {
          canceledAt,
          effectiveAt,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Cancel subscription error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel subscription',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/subscription/pause
   * Pause subscription
   */
  router.post('/pause', requireAuth, async (req: SubscriptionRequest, res: Response) => {
    try {
      const { businessId, durationDays } = req.body;

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_ID_REQUIRED',
            message: 'Business ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Look up business
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: 'Business not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check ownership
      if (business.ownerId !== req.user!.id) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to manage this business subscription',
          },
        };
        res.status(403).json(response);
        return;
      }

      // Check current subscription status
      const currentSubscription = parseSubscriptionStatus(business.subscriptionStatus);

      if (!currentSubscription || currentSubscription.status !== 'active') {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'CANNOT_PAUSE',
            message: 'Only active subscriptions can be paused',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Calculate pause details
      const pausedAt = new Date().toISOString();
      const resumeAt = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      // Update subscription status
      const newSubscription: SubscriptionStatus = {
        ...currentSubscription,
        status: 'paused',
        pausedAt,
        resumeAt,
      };

      await prisma.business.update({
        where: { id: businessId },
        data: {
          subscriptionStatus: stringifySubscriptionStatus(newSubscription),
          accountState: 'PAUSED',
        },
      });

      const response: ApiResponse<{ status: string; pausedAt: string; resumeAt?: string }> = {
        success: true,
        data: {
          status: 'paused',
          pausedAt,
          ...(resumeAt && { resumeAt }),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Pause subscription error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to pause subscription',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/subscription/resume
   * Resume paused subscription
   */
  router.post('/resume', requireAuth, async (req: SubscriptionRequest, res: Response) => {
    try {
      const { businessId } = req.body;

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_ID_REQUIRED',
            message: 'Business ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Look up business
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: 'Business not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check ownership
      if (business.ownerId !== req.user!.id) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to manage this business subscription',
          },
        };
        res.status(403).json(response);
        return;
      }

      // Check current subscription status
      const currentSubscription = parseSubscriptionStatus(business.subscriptionStatus);

      // Handle suspended accounts - need payment update
      if (currentSubscription?.status === 'suspended') {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'PAYMENT_REQUIRED',
            message: 'Payment method update required to resume subscription',
            details: {
              updatePaymentUrl: `/subscription/update-payment?businessId=${businessId}`,
            },
          },
        };
        res.status(402).json(response);
        return;
      }

      // Check if subscription is paused
      if (!currentSubscription || currentSubscription.status !== 'paused') {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_PAUSED',
            message: 'Subscription is not paused',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Update subscription status
      const resumedAt = new Date().toISOString();
      const newSubscription: SubscriptionStatus = {
        ...currentSubscription,
        status: 'active',
        pausedAt: undefined,
        resumeAt: undefined,
      };

      await prisma.business.update({
        where: { id: businessId },
        data: {
          subscriptionStatus: stringifySubscriptionStatus(newSubscription),
          accountState: 'ACTIVE',
        },
      });

      const response: ApiResponse<{ status: string; resumedAt: string }> = {
        success: true,
        data: {
          status: 'active',
          resumedAt,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Resume subscription error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to resume subscription',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/subscription/start-trial
   * Start a free trial for a business
   */
  router.post('/start-trial', requireAuth, async (req: SubscriptionRequest, res: Response) => {
    try {
      const { businessId } = req.body;

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_ID_REQUIRED',
            message: 'Business ID is required',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Look up business
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: 'Business not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check ownership
      if (business.ownerId !== req.user!.id) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'You do not have permission to manage this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      // Must be in SETUP_COMPLETE state
      if (business.accountState !== 'SETUP_COMPLETE') {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: 'Trial can only be started after completing setup',
          },
        };
        res.status(400).json(response);
        return;
      }

      const TRIAL_DAYS = 14;
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

      // Transition to TRIAL state
      await prisma.$transaction([
        prisma.accountStateHistory.create({
          data: {
            businessId,
            fromState: business.accountState,
            toState: 'TRIAL',
            reason: `Free trial started (${TRIAL_DAYS} days)`,
          },
        }),
        prisma.business.update({
          where: { id: businessId },
          data: {
            accountState: 'TRIAL',
            trialEndsAt,
            subscriptionStatus: JSON.stringify({
              status: 'trial',
              planId: null,
              trialEndsAt: trialEndsAt.toISOString(),
            }),
          },
        }),
      ]);

      const response: ApiResponse<{ status: string; trialEndsAt: string; trialDays: number }> = {
        success: true,
        data: {
          status: 'trial',
          trialEndsAt: trialEndsAt.toISOString(),
          trialDays: TRIAL_DAYS,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Start trial error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to start trial',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/subscription/upgrade
   * Switch subscription plan (e.g. monthly → annual) without cancelling
   */
  router.post('/upgrade', requireAuth, async (req: SubscriptionRequest, res: Response) => {
    try {
      const { businessId, planId } = req.body;

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'BUSINESS_ID_REQUIRED', message: 'Business ID is required' },
        };
        res.status(400).json(response);
        return;
      }

      if (!planId || !VALID_PLAN_IDS.includes(planId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'INVALID_PLAN', message: 'Invalid plan ID. Valid plans are: ' + VALID_PLAN_IDS.join(', ') },
        };
        res.status(400).json(response);
        return;
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });

      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'BUSINESS_NOT_FOUND', message: 'Business not found' },
        };
        res.status(404).json(response);
        return;
      }

      if (business.ownerId !== req.user!.id) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'AUTHORIZATION_ERROR', message: 'You do not have permission to manage this business subscription' },
        };
        res.status(403).json(response);
        return;
      }

      const currentSubscription = parseSubscriptionStatus(business.subscriptionStatus);

      if (!currentSubscription || (currentSubscription.status !== 'active' && currentSubscription.status !== 'trial')) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'An active subscription is required to switch plans' },
        };
        res.status(400).json(response);
        return;
      }

      if (currentSubscription.planId === planId) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'SAME_PLAN', message: 'Already subscribed to this plan' },
        };
        res.status(400).json(response);
        return;
      }

      const newPlan = AVAILABLE_PLANS.find(p => p.id === planId)!;
      const upgradedAt = new Date().toISOString();

      const newSubscription: SubscriptionStatus = {
        ...currentSubscription,
        planId,
      };

      await prisma.business.update({
        where: { id: businessId },
        data: {
          subscriptionStatus: stringifySubscriptionStatus(newSubscription),
        },
      });

      const response: ApiResponse<{ previousPlanId: string | null; newPlanId: string; newPrice: number; newInterval: string; upgradedAt: string }> = {
        success: true,
        data: {
          previousPlanId: currentSubscription.planId,
          newPlanId: planId,
          newPrice: newPlan.price,
          newInterval: newPlan.interval,
          upgradedAt,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to upgrade subscription' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/subscription/billing-history
   * Get billing/payment history for a business subscription
   */
  router.get('/billing-history', requireAuth, async (req: SubscriptionRequest, res: Response) => {
    try {
      const businessId = req.query.businessId as string;

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'BUSINESS_ID_REQUIRED', message: 'Business ID is required' },
        };
        res.status(400).json(response);
        return;
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });

      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'BUSINESS_NOT_FOUND', message: 'Business not found' },
        };
        res.status(404).json(response);
        return;
      }

      if (business.ownerId !== req.user!.id) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'AUTHORIZATION_ERROR', message: 'You do not have permission to view this business billing history' },
        };
        res.status(403).json(response);
        return;
      }

      // Pull billing events from account state history as a proxy for billing history.
      // In production, this would query Square Invoices API for actual payment records.
      const stateHistory = await prisma.accountStateHistory.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const billingEvents = stateHistory
        .filter(h => ['ACTIVE', 'TRIAL', 'GRACE_PERIOD', 'SUSPENDED', 'PAUSED'].includes(h.toState))
        .map(h => ({
          id: h.id,
          date: h.createdAt.toISOString(),
          type: mapStateToEventType(h.toState),
          description: h.reason || `Account state changed to ${h.toState}`,
          fromState: h.fromState,
          toState: h.toState,
        }));

      const response: ApiResponse<typeof billingEvents> = {
        success: true,
        data: billingEvents,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Billing history error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get billing history' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/subscription/update-payment
   * Update payment method for subscription (reactivates if suspended)
   */
  router.post('/update-payment', requireAuth, async (req: SubscriptionRequest, res: Response) => {
    try {
      const { businessId, paymentToken } = req.body;

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'BUSINESS_ID_REQUIRED', message: 'Business ID is required' },
        };
        res.status(400).json(response);
        return;
      }

      if (!paymentToken) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'PAYMENT_TOKEN_REQUIRED', message: 'Payment token is required' },
        };
        res.status(400).json(response);
        return;
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });

      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'BUSINESS_NOT_FOUND', message: 'Business not found' },
        };
        res.status(404).json(response);
        return;
      }

      if (business.ownerId !== req.user!.id) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'AUTHORIZATION_ERROR', message: 'You do not have permission to manage this business payment method' },
        };
        res.status(403).json(response);
        return;
      }

      const currentSubscription = parseSubscriptionStatus(business.subscriptionStatus);

      if (!currentSubscription || !currentSubscription.status) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'NO_SUBSCRIPTION', message: 'No subscription found for this business' },
        };
        res.status(400).json(response);
        return;
      }

      // In production, this would call Square Cards API to store the new payment method
      // and update the subscription's payment source.
      const updatedAt = new Date().toISOString();
      const wasSuspended = currentSubscription.status === 'suspended';

      // If the business was suspended due to payment failure, reactivate
      if (wasSuspended) {
        const newSubscription: SubscriptionStatus = {
          ...currentSubscription,
          status: 'active',
          suspendedAt: undefined,
          reason: undefined,
        };

        await prisma.business.update({
          where: { id: businessId },
          data: {
            subscriptionStatus: stringifySubscriptionStatus(newSubscription),
            accountState: 'ACTIVE',
          },
        });
      }

      const response: ApiResponse<{ updatedAt: string; reactivated: boolean }> = {
        success: true,
        data: {
          updatedAt,
          reactivated: wasSuspended,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Update payment error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update payment method' },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/subscription/plans
   * List available subscription plans
   * Public endpoint - no authentication required
   */
  router.get('/plans', (req: Request, res: Response) => {
    const response: ApiResponse<Plan[]> = {
      success: true,
      data: AVAILABLE_PLANS,
    };

    res.status(200).json(response);
  });

  return router;
}
