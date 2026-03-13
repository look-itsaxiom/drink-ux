import { PrismaClient, AccountState, Business } from '../../generated/prisma';

/**
 * Custom error class for ejection errors
 */
export class EjectionError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'EjectionError';
  }
}

/**
 * Input for ejection operation
 */
export interface EjectInput {
  confirmed: boolean;
  reason?: string;
}

/**
 * Result of ejection operation
 */
export interface EjectResult {
  success: boolean;
  businessId: string;
  previousState: AccountState;
  newState: AccountState;
  ejectedAt: Date;
  dataPreserved: boolean;
  canStartOver: boolean;
  reason?: string;
}

/**
 * Input for start over operation
 */
export interface StartOverInput {
  confirmed: boolean;
  clearCatalog?: boolean;
  clearPOSConnection?: boolean;
}

/**
 * Result of start over operation
 */
export interface StartOverResult {
  success: boolean;
  businessId: string;
  previousState: AccountState;
  newState: AccountState;
  redirectTo: string;
  catalogCleared: boolean;
  posConnectionCleared: boolean;
}

/**
 * Storefront availability check result
 */
export interface StorefrontAvailabilityResult {
  available: boolean;
  reason?: string;
  businessName?: string;
}

/**
 * Ejection consequences check result
 */
export interface EjectionConsequences {
  businessId: string;
  businessName: string;
  currentState: AccountState;
  canEject: boolean;
  canStartOver: boolean;
  catalogItemCount: number;
  categoryCount: number;
  modifierCount: number;
  totalOrderCount: number;
  pendingOrderCount: number;
  hasPendingOrders: boolean;
  hasActiveSubscription: boolean;
  hasPOSConnection: boolean;
  warnings: string[];
}

/**
 * Ejection Service - handles business ejection and start-over flows
 *
 * This service follows the principle of psychological safety:
 * - Easy to leave (eject)
 * - Easy to return (start over)
 * - Non-destructive by default (data preserved)
 */
export class EjectionService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Eject a business from Drink-UX
   *
   * This operation:
   * - Changes account state to EJECTED
   * - Clears POS access tokens (security)
   * - Preserves all catalog and order data
   * - Allows the business to start over later
   */
  async eject(businessId: string, input: EjectInput): Promise<EjectResult> {
    const { confirmed, reason } = input;

    // Require explicit confirmation
    if (!confirmed) {
      throw new EjectionError(
        'CONFIRMATION_REQUIRED',
        'Ejection requires explicit confirmation'
      );
    }

    // Find the business
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new EjectionError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    // Cannot eject already ejected business
    if (business.accountState === 'EJECTED') {
      throw new EjectionError(
        'ALREADY_EJECTED',
        'Business is already ejected'
      );
    }

    const previousState = business.accountState;
    const ejectedAt = new Date();

    // Perform ejection in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update business state and clear sensitive tokens
      await tx.business.update({
        where: { id: businessId },
        data: {
          accountState: 'EJECTED',
          // Clear POS tokens for security
          posAccessToken: null,
          posRefreshToken: null,
          // Reset sync status
          syncStatus: 'IDLE',
          updatedAt: ejectedAt,
        },
      });

      // In a full implementation, we would also:
      // - Log the ejection event to an audit table
      // - Queue email notification
      // - Cancel any active subscriptions via payment provider
    });

    return {
      success: true,
      businessId,
      previousState,
      newState: 'EJECTED',
      ejectedAt,
      dataPreserved: true,
      canStartOver: true,
      reason,
    };
  }

  /**
   * Check if a storefront is available for customer access
   */
  async isStorefrontAvailable(businessId: string): Promise<StorefrontAvailabilityResult> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        accountState: true,
        name: true,
      },
    });

    if (!business) {
      return {
        available: false,
        reason: 'Storefront not found',
      };
    }

    switch (business.accountState) {
      case 'ACTIVE':
        return {
          available: true,
          businessName: business.name,
        };

      case 'EJECTED':
        return {
          available: false,
          reason: `${business.name} is no longer available on Drink-UX`,
          businessName: business.name,
        };

      case 'PAUSED':
        return {
          available: false,
          reason: `${business.name} is temporarily unavailable`,
          businessName: business.name,
        };

      case 'ONBOARDING':
      case 'SETUP_COMPLETE':
        return {
          available: false,
          reason: `${business.name} is not yet accepting orders`,
          businessName: business.name,
        };

      default:
        return {
          available: false,
          reason: 'Storefront unavailable',
          businessName: business.name,
        };
    }
  }

  /**
   * Start over - reset an ejected business to onboarding state
   *
   * This allows a previously ejected business to return to Drink-UX
   * with options to preserve or clear their data.
   */
  async startOver(businessId: string, input: StartOverInput): Promise<StartOverResult> {
    const { confirmed, clearCatalog = false, clearPOSConnection = false } = input;

    // Require explicit confirmation
    if (!confirmed) {
      throw new EjectionError(
        'CONFIRMATION_REQUIRED',
        'Start over requires explicit confirmation'
      );
    }

    // Find the business
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new EjectionError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    // Can only start over if ejected
    if (business.accountState !== 'EJECTED') {
      throw new EjectionError(
        'NOT_EJECTED',
        'Can only start over for ejected businesses'
      );
    }

    const previousState = business.accountState;

    // Perform start over in transaction
    await this.prisma.$transaction(async (tx) => {
      // Clear catalog if requested
      if (clearCatalog) {
        // Delete in correct order to respect foreign keys
        await tx.presetModifier.deleteMany({
          where: {
            preset: { businessId },
          },
        });
        await tx.preset.deleteMany({ where: { businessId } });
        await tx.modifier.deleteMany({ where: { businessId } });
        await tx.base.deleteMany({ where: { businessId } });
        await tx.category.deleteMany({ where: { businessId } });
      }

      // Build update data
      const updateData: any = {
        accountState: 'ONBOARDING',
        syncStatus: 'IDLE',
        lastSyncedAt: null,
        lastSyncError: null,
      };

      // Clear POS connection if requested
      if (clearPOSConnection) {
        updateData.posProvider = null;
        updateData.posMerchantId = null;
        updateData.posLocationId = null;
        // Tokens were already cleared on ejection
      }

      await tx.business.update({
        where: { id: businessId },
        data: updateData,
      });
    });

    return {
      success: true,
      businessId,
      previousState,
      newState: 'ONBOARDING',
      redirectTo: '/onboarding',
      catalogCleared: clearCatalog,
      posConnectionCleared: clearPOSConnection,
    };
  }

  /**
   * Check consequences of ejection before performing it
   *
   * Returns information about what will happen if the business ejects,
   * including warnings about pending orders, active subscriptions, etc.
   */
  async checkEjectionConsequences(businessId: string): Promise<EjectionConsequences> {
    // Find the business with counts
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        _count: {
          select: {
            categories: true,
            bases: true,
            modifiers: true,
            orders: true,
          },
        },
      },
    });

    if (!business) {
      throw new EjectionError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    // Count pending orders separately
    const pendingOrderCount = await this.prisma.order.count({
      where: {
        businessId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING'],
        },
      },
    });

    // Build warnings list
    const warnings: string[] = [];

    if (pendingOrderCount > 0) {
      warnings.push(
        `You have ${pendingOrderCount} pending orders that should be resolved before ejecting`
      );
    }

    const hasActiveSubscription = !!business.subscriptionStatus;
    if (hasActiveSubscription) {
      warnings.push(
        'You have an active subscription that will need to be cancelled'
      );
    }

    const hasPOSConnection = !!business.posAccessToken || !!business.posProvider;
    if (hasPOSConnection) {
      warnings.push(
        'Your POS connection tokens will be cleared for security'
      );
    }

    const canEject = business.accountState !== 'EJECTED';
    // canStartOver indicates whether the business can start over after ejection
    // This is always true for non-ejected businesses (they can eject, then start over)
    // For already ejected businesses, they can start over immediately
    const canStartOver = true;

    return {
      businessId,
      businessName: business.name,
      currentState: business.accountState,
      canEject,
      canStartOver,
      catalogItemCount: business._count.bases,
      categoryCount: business._count.categories,
      modifierCount: business._count.modifiers,
      totalOrderCount: business._count.orders,
      pendingOrderCount,
      hasPendingOrders: pendingOrderCount > 0,
      hasActiveSubscription,
      hasPOSConnection,
      warnings,
    };
  }
}
