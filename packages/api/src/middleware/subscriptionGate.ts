/**
 * Subscription Gate Middleware
 *
 * Restricts API access based on subscription status.
 * Provides different levels of access control:
 * - requireActiveSubscription: Blocks if not active/trial
 * - requireStorefrontAccess: Blocks suspended/churned businesses
 * - requireEditAccess: Blocks if can't edit (suspended/churned)
 * - checkSubscriptionStatus: Adds subscription info without blocking
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Business } from '../../generated/prisma';
import { ApiResponse } from '@drink-ux/shared';

/**
 * Subscription status types
 */
export type SubscriptionStatusType =
  | 'active'
  | 'trial'
  | 'paused'
  | 'suspended'
  | 'churned'
  | 'grace_period'
  | 'cancelled'
  | null;

/**
 * Parsed subscription status from business.subscriptionStatus JSON
 */
export interface SubscriptionStatus {
  status: SubscriptionStatusType;
  planId: string | null;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  pausedAt?: string;
  suspendedAt?: string;
  cancelledAt?: string;
  gracePeriodEndsAt?: string;
  reason?: string;
  subscriptionId?: string;
}

/**
 * Account capabilities based on subscription status
 */
export interface AccountCapabilities {
  canViewStorefront: boolean;
  canProcessOrders: boolean;
  canEditCatalog: boolean;
  canManageAccount: boolean;
}

/**
 * Extended Request type with subscription properties
 */
export interface SubscriptionRequest extends Request {
  businessId?: string;
  subscriptionStatus?: SubscriptionStatus;
  accountCapabilities?: AccountCapabilities;
  gracePeriodRemaining?: number;
}

/**
 * Paths that bypass subscription checks
 */
export const BYPASS_PATHS = [
  '/health',
  '/api/health',
  '/api/webhooks',
  '/api/auth',
  '/api/subscription',
  '/api/public',
];

/**
 * Check if a path should bypass subscription checks
 */
function shouldBypass(path: string): boolean {
  return BYPASS_PATHS.some(bypassPath => path.startsWith(bypassPath));
}

/**
 * Parse subscription status from JSON string
 */
function parseSubscriptionStatus(subscriptionStatusJson: string | null): SubscriptionStatus | null {
  if (!subscriptionStatusJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(subscriptionStatusJson);
    return parsed as SubscriptionStatus;
  } catch {
    console.error('Failed to parse subscription status JSON:', subscriptionStatusJson);
    return null;
  }
}

/**
 * Check if subscription is expired based on currentPeriodEnd
 */
function isSubscriptionExpired(subscription: SubscriptionStatus): boolean {
  if (!subscription.currentPeriodEnd) {
    return false;
  }
  return new Date(subscription.currentPeriodEnd) < new Date();
}

/**
 * Calculate grace period remaining in milliseconds
 */
function calculateGracePeriodRemaining(subscription: SubscriptionStatus): number | undefined {
  if (subscription.status !== 'grace_period' || !subscription.gracePeriodEndsAt) {
    return undefined;
  }
  const remaining = new Date(subscription.gracePeriodEndsAt).getTime() - Date.now();
  return Math.max(0, remaining);
}

/**
 * Determine account capabilities based on subscription status
 */
function getAccountCapabilities(subscription: SubscriptionStatus | null): AccountCapabilities {
  if (!subscription) {
    return {
      canViewStorefront: false,
      canProcessOrders: false,
      canEditCatalog: false,
      canManageAccount: true,
    };
  }

  switch (subscription.status) {
    case 'active':
    case 'trial':
      return {
        canViewStorefront: true,
        canProcessOrders: true,
        canEditCatalog: true,
        canManageAccount: true,
      };
    case 'paused':
      return {
        canViewStorefront: false,
        canProcessOrders: false,
        canEditCatalog: true,
        canManageAccount: true,
      };
    case 'grace_period':
      return {
        canViewStorefront: true,
        canProcessOrders: false,
        canEditCatalog: true,
        canManageAccount: true,
      };
    case 'suspended':
    case 'churned':
    case 'cancelled':
    default:
      return {
        canViewStorefront: false,
        canProcessOrders: false,
        canEditCatalog: false,
        canManageAccount: true,
      };
  }
}

/**
 * Generate upgrade URL for subscription
 */
function getUpgradeUrl(businessId: string): string {
  return `/api/subscription/checkout?businessId=${businessId}`;
}

/**
 * Generate resubscribe URL
 */
function getResubscribeUrl(businessId: string): string {
  return `/api/subscription/checkout?businessId=${businessId}&resubscribe=true`;
}

/**
 * Middleware: Require active subscription
 *
 * Blocks requests if subscription is not active or trial.
 * Returns 402 for payment issues, 403 for suspended/churned.
 */
export function requireActiveSubscription(prisma: PrismaClient) {
  return async (
    req: SubscriptionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if path should bypass
      if (shouldBypass(req.path)) {
        next();
        return;
      }

      // Check for business ID
      const businessId = req.businessId || req.query?.businessId as string || req.body?.businessId;
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

      // Parse subscription status
      const subscription = parseSubscriptionStatus(business.subscriptionStatus);
      req.subscriptionStatus = subscription || { status: null, planId: null };
      req.accountCapabilities = getAccountCapabilities(subscription);

      // Check subscription status
      if (!subscription) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'SUBSCRIPTION_REQUIRED',
            message: 'An active subscription is required to access this resource',
            details: {
              upgradeUrl: getUpgradeUrl(businessId),
            },
          },
        };
        res.status(402).json(response);
        return;
      }

      // Check for expired active subscription
      if (subscription.status === 'active' && isSubscriptionExpired(subscription)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'SUBSCRIPTION_EXPIRED',
            message: 'Your subscription has expired',
            details: {
              upgradeUrl: getUpgradeUrl(businessId),
            },
          },
        };
        res.status(402).json(response);
        return;
      }

      // Handle different subscription states
      switch (subscription.status) {
        case 'active':
        case 'trial':
          // Allow access
          next();
          return;

        case 'paused':
          const pausedResponse: ApiResponse<never> = {
            success: false,
            error: {
              code: 'SUBSCRIPTION_PAUSED',
              message: 'Your subscription is paused. Resume to continue.',
              details: {
                upgradeUrl: getUpgradeUrl(businessId),
                status: 'paused',
              },
            },
          };
          res.status(402).json(pausedResponse);
          return;

        case 'grace_period':
          // Allow read but not orders - this middleware blocks
          const graceResponse: ApiResponse<never> = {
            success: false,
            error: {
              code: 'SUBSCRIPTION_GRACE_PERIOD',
              message: 'Your subscription is in grace period. Update payment to continue.',
              details: {
                upgradeUrl: getUpgradeUrl(businessId),
                gracePeriodRemaining: calculateGracePeriodRemaining(subscription),
              },
            },
          };
          res.status(402).json(graceResponse);
          return;

        case 'suspended':
          const suspendedResponse: ApiResponse<never> = {
            success: false,
            error: {
              code: 'ACCOUNT_SUSPENDED',
              message: 'Your account has been suspended due to payment issues',
              details: {
                upgradeUrl: getUpgradeUrl(businessId),
                reason: subscription.reason,
              },
            },
          };
          res.status(403).json(suspendedResponse);
          return;

        case 'churned':
        case 'cancelled':
          const churnedResponse: ApiResponse<never> = {
            success: false,
            error: {
              code: 'ACCOUNT_CHURNED',
              message: 'Your subscription has been cancelled',
              details: {
                resubscribeUrl: getResubscribeUrl(businessId),
              },
            },
          };
          res.status(403).json(churnedResponse);
          return;

        default:
          // Unknown status - treat as no subscription
          const defaultResponse: ApiResponse<never> = {
            success: false,
            error: {
              code: 'SUBSCRIPTION_REQUIRED',
              message: 'An active subscription is required',
              details: {
                upgradeUrl: getUpgradeUrl(businessId),
              },
            },
          };
          res.status(402).json(defaultResponse);
          return;
      }
    } catch (error) {
      console.error('Subscription gate error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check subscription status',
        },
      };
      res.status(500).json(response);
    }
  };
}

/**
 * Middleware: Require storefront access
 *
 * Blocks suspended/churned businesses from serving storefront.
 * Allows active, trial, and grace period (read-only).
 */
export function requireStorefrontAccess(prisma: PrismaClient) {
  return async (
    req: SubscriptionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if path should bypass
      if (shouldBypass(req.path)) {
        next();
        return;
      }

      // Check for business ID
      const businessId = req.businessId || req.query?.businessId as string || req.body?.businessId;
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

      // Parse subscription status
      const subscription = parseSubscriptionStatus(business.subscriptionStatus);
      req.subscriptionStatus = subscription || { status: null, planId: null };
      req.accountCapabilities = getAccountCapabilities(subscription);

      // Calculate grace period remaining if applicable
      if (subscription?.status === 'grace_period') {
        req.gracePeriodRemaining = calculateGracePeriodRemaining(subscription);
      }

      // Check if storefront access is allowed
      const capabilities = getAccountCapabilities(subscription);

      if (!capabilities.canViewStorefront) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'STOREFRONT_DISABLED',
            message: 'Storefront is currently disabled',
            details: {
              resubscribeUrl: getResubscribeUrl(businessId),
              status: subscription?.status || 'none',
            },
          },
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      console.error('Storefront access error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check storefront access',
        },
      };
      res.status(500).json(response);
    }
  };
}

/**
 * Middleware: Require edit access
 *
 * Blocks suspended/churned from editing.
 * Allows active, trial, paused, and grace period to edit.
 */
export function requireEditAccess(prisma: PrismaClient) {
  return async (
    req: SubscriptionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if path should bypass
      if (shouldBypass(req.path)) {
        next();
        return;
      }

      // Check for business ID
      const businessId = req.businessId || req.query?.businessId as string || req.body?.businessId;
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

      // Parse subscription status
      const subscription = parseSubscriptionStatus(business.subscriptionStatus);
      req.subscriptionStatus = subscription || { status: null, planId: null };
      req.accountCapabilities = getAccountCapabilities(subscription);

      // Check if edit access is allowed
      const capabilities = getAccountCapabilities(subscription);

      if (!capabilities.canEditCatalog) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'EDIT_ACCESS_DENIED',
            message: 'Edit access is currently disabled',
            details: {
              resubscribeUrl: getResubscribeUrl(businessId),
              status: subscription?.status || 'none',
            },
          },
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      console.error('Edit access error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check edit access',
        },
      };
      res.status(500).json(response);
    }
  };
}

/**
 * Middleware: Check subscription status (non-blocking)
 *
 * Adds subscription info to request without blocking.
 * Useful for dashboard/info endpoints that need status but don't require active sub.
 */
export function checkSubscriptionStatus(prisma: PrismaClient) {
  return async (
    req: SubscriptionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check for business ID
      const businessId = req.businessId || req.query?.businessId as string || req.body?.businessId;

      if (!businessId) {
        // No business ID - just continue without subscription info
        next();
        return;
      }

      // Look up business
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        // Business not found - continue without subscription info
        next();
        return;
      }

      // Parse and attach subscription status
      const subscription = parseSubscriptionStatus(business.subscriptionStatus);
      req.subscriptionStatus = subscription || { status: null, planId: null };
      req.accountCapabilities = getAccountCapabilities(subscription);

      // Calculate grace period remaining if applicable
      if (subscription?.status === 'grace_period') {
        req.gracePeriodRemaining = calculateGracePeriodRemaining(subscription);
      }

      // Non-blocking - always continue
      next();
    } catch (error) {
      console.error('Check subscription status error:', error);
      // Non-blocking - continue even on error
      next();
    }
  };
}
