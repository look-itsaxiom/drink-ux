import { PrismaClient, Business, AccountState, AccountStateHistory } from '../../generated/prisma';

/**
 * Custom error class for account state-related errors
 */
export class AccountStateError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AccountStateError';
  }
}

/**
 * Account capabilities based on state
 */
export interface AccountCapabilities {
  canAccessStorefront: boolean;
  canEditMenu: boolean;
  canProcessOrders: boolean;
  canManageSubscription: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  isReadOnly: boolean;
}

/**
 * Grace period status
 */
export interface GracePeriodStatus {
  inGracePeriod: boolean;
  daysRemaining: number;
  endsAt: Date | null;
  isExpired?: boolean;
}

/**
 * State history entry
 */
export interface StateHistoryEntry {
  id: string;
  businessId: string;
  fromState: AccountState;
  toState: AccountState;
  reason: string | null;
  createdAt: Date;
}

/**
 * Valid state transitions map
 * Key: current state, Value: array of valid next states
 */
const VALID_TRANSITIONS: Record<AccountState, AccountState[]> = {
  [AccountState.ONBOARDING]: [
    AccountState.SETUP_COMPLETE,
  ],
  [AccountState.SETUP_COMPLETE]: [
    AccountState.TRIAL,
    AccountState.ACTIVE,
  ],
  [AccountState.TRIAL]: [
    AccountState.ACTIVE,
    AccountState.SUSPENDED,
  ],
  [AccountState.ACTIVE]: [
    AccountState.PAUSED,
    AccountState.GRACE_PERIOD,
    AccountState.CHURNED,
    AccountState.EJECTED,
  ],
  [AccountState.GRACE_PERIOD]: [
    AccountState.ACTIVE,
    AccountState.SUSPENDED,
    AccountState.CHURNED,
  ],
  [AccountState.PAUSED]: [
    AccountState.ACTIVE,
    AccountState.CHURNED,
  ],
  [AccountState.SUSPENDED]: [
    AccountState.SETUP_COMPLETE, // Resubscribe flow
    AccountState.CHURNED,
  ],
  [AccountState.CHURNED]: [], // Terminal state - no transitions allowed
  [AccountState.EJECTED]: [], // Terminal state
};

/**
 * States that allow storefront access
 */
const STOREFRONT_ACCESS_STATES: AccountState[] = [
  AccountState.ACTIVE,
  AccountState.TRIAL,
  AccountState.GRACE_PERIOD,
];

/**
 * States that allow menu editing
 */
const MENU_EDIT_STATES: AccountState[] = [
  AccountState.ACTIVE,
  AccountState.TRIAL,
  AccountState.PAUSED,
  AccountState.GRACE_PERIOD,
  AccountState.ONBOARDING,
  AccountState.SETUP_COMPLETE,
];

/**
 * States that allow order processing
 */
const ORDER_PROCESSING_STATES: AccountState[] = [
  AccountState.ACTIVE,
  AccountState.TRIAL,
];

/**
 * Account State Service - manages account state machine for subscription-based accounts
 */
export class AccountStateService {
  constructor(private readonly prisma: PrismaClient) {}

  // ===========================================================================
  // STATE TRANSITIONS
  // ===========================================================================

  /**
   * Transition a business to a new account state
   * @param businessId - The business ID
   * @param newState - The target state
   * @param reason - Optional reason for the transition
   * @returns The updated business
   */
  async transitionTo(
    businessId: string,
    newState: AccountState,
    reason?: string
  ): Promise<Business> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new AccountStateError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    const currentState = business.accountState;

    // Same state transition is a no-op
    if (currentState === newState) {
      return business;
    }

    // Validate transition
    if (!this.canTransition(currentState, newState)) {
      throw new AccountStateError(
        'INVALID_TRANSITION',
        `Cannot transition from ${currentState} to ${newState}`
      );
    }

    // Perform transition in a transaction
    const [_, updatedBusiness] = await this.prisma.$transaction([
      // Record history
      this.prisma.accountStateHistory.create({
        data: {
          businessId,
          fromState: currentState,
          toState: newState,
          reason: reason || null,
        },
      }),
      // Update business state
      this.prisma.business.update({
        where: { id: businessId },
        data: {
          accountState: newState,
          // Clear grace period end date when leaving grace period
          ...(currentState === AccountState.GRACE_PERIOD && newState !== AccountState.GRACE_PERIOD
            ? { gracePeriodEndsAt: null }
            : {}),
        },
      }),
    ]);

    return updatedBusiness;
  }

  /**
   * Check if a transition is valid
   * @param currentState - The current state
   * @param newState - The target state
   * @returns true if the transition is valid
   */
  canTransition(currentState: AccountState, newState: AccountState): boolean {
    const validNextStates = VALID_TRANSITIONS[currentState] || [];
    return validNextStates.includes(newState);
  }

  /**
   * Get all valid transitions from a given state
   * @param currentState - The current state
   * @returns Array of valid next states
   */
  getValidTransitions(currentState: AccountState): AccountState[] {
    return VALID_TRANSITIONS[currentState] || [];
  }

  // ===========================================================================
  // STATE-BASED ACCESS CONTROL
  // ===========================================================================

  /**
   * Check if a business can access the customer storefront
   * @param businessId - The business ID
   * @returns true if storefront access is allowed
   */
  async canAccessStorefront(businessId: string): Promise<boolean> {
    const business = await this.getBusiness(businessId);
    return STOREFRONT_ACCESS_STATES.includes(business.accountState);
  }

  /**
   * Check if a business can edit their menu
   * @param businessId - The business ID
   * @returns true if menu editing is allowed
   */
  async canEditMenu(businessId: string): Promise<boolean> {
    const business = await this.getBusiness(businessId);
    return MENU_EDIT_STATES.includes(business.accountState);
  }

  /**
   * Check if a business can process orders
   * @param businessId - The business ID
   * @returns true if order processing is allowed
   */
  async canProcessOrders(businessId: string): Promise<boolean> {
    const business = await this.getBusiness(businessId);
    return ORDER_PROCESSING_STATES.includes(business.accountState);
  }

  /**
   * Get full capability map for a business
   * @param businessId - The business ID
   * @returns Account capabilities object
   */
  async getAccountCapabilities(businessId: string): Promise<AccountCapabilities> {
    const business = await this.getBusiness(businessId);
    const state = business.accountState;

    // Churned accounts have no capabilities
    if (state === AccountState.CHURNED) {
      return {
        canAccessStorefront: false,
        canEditMenu: false,
        canProcessOrders: false,
        canManageSubscription: false,
        canViewAnalytics: false,
        canExportData: false,
        isReadOnly: true,
      };
    }

    // Suspended accounts have read-only access
    if (state === AccountState.SUSPENDED) {
      return {
        canAccessStorefront: false,
        canEditMenu: false,
        canProcessOrders: false,
        canManageSubscription: true, // Can resubscribe
        canViewAnalytics: true,
        canExportData: true,
        isReadOnly: true,
      };
    }

    // Grace period - limited functionality
    if (state === AccountState.GRACE_PERIOD) {
      return {
        canAccessStorefront: true,
        canEditMenu: true,
        canProcessOrders: false,
        canManageSubscription: true,
        canViewAnalytics: true,
        canExportData: true,
        isReadOnly: false,
      };
    }

    // Paused - can edit but not process
    if (state === AccountState.PAUSED) {
      return {
        canAccessStorefront: false,
        canEditMenu: true,
        canProcessOrders: false,
        canManageSubscription: true,
        canViewAnalytics: true,
        canExportData: true,
        isReadOnly: false,
      };
    }

    // Active and Trial - full capabilities
    if (state === AccountState.ACTIVE || state === AccountState.TRIAL) {
      return {
        canAccessStorefront: true,
        canEditMenu: true,
        canProcessOrders: true,
        canManageSubscription: true,
        canViewAnalytics: true,
        canExportData: true,
        isReadOnly: false,
      };
    }

    // Onboarding and Setup Complete - limited
    return {
      canAccessStorefront: false,
      canEditMenu: true,
      canProcessOrders: false,
      canManageSubscription: true,
      canViewAnalytics: false,
      canExportData: false,
      isReadOnly: false,
    };
  }

  // ===========================================================================
  // GRACE PERIOD MANAGEMENT
  // ===========================================================================

  /**
   * Start a grace period for a business
   * @param businessId - The business ID
   * @param daysRemaining - Number of days for the grace period
   * @returns The updated business
   */
  async startGracePeriod(businessId: string, daysRemaining: number): Promise<Business> {
    const business = await this.getBusiness(businessId);

    // Calculate grace period end date
    const gracePeriodEndsAt = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);

    // Transition to grace period
    await this.transitionTo(businessId, AccountState.GRACE_PERIOD, 'Payment failed - grace period started');

    // Update grace period end date
    return this.prisma.business.update({
      where: { id: businessId },
      data: { gracePeriodEndsAt },
    });
  }

  /**
   * Extend an existing grace period
   * @param businessId - The business ID
   * @param days - Number of days to extend
   * @returns The updated business
   */
  async extendGracePeriod(businessId: string, days: number): Promise<Business> {
    const business = await this.getBusiness(businessId);

    if (business.accountState !== AccountState.GRACE_PERIOD) {
      throw new AccountStateError('NOT_IN_GRACE_PERIOD', 'Business is not in grace period');
    }

    // Get current end date or use now if not set
    const currentEnd = business.gracePeriodEndsAt || new Date();
    const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

    return this.prisma.business.update({
      where: { id: businessId },
      data: { gracePeriodEndsAt: newEnd },
    });
  }

  /**
   * Get grace period status for a business
   * @param businessId - The business ID
   * @returns Grace period status
   */
  async getGracePeriodStatus(businessId: string): Promise<GracePeriodStatus> {
    const business = await this.getBusiness(businessId);

    if (business.accountState !== AccountState.GRACE_PERIOD) {
      return {
        inGracePeriod: false,
        daysRemaining: 0,
        endsAt: null,
      };
    }

    const endsAt = business.gracePeriodEndsAt;
    if (!endsAt) {
      return {
        inGracePeriod: true,
        daysRemaining: 0,
        endsAt: null,
      };
    }

    const now = new Date();
    const msRemaining = endsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
    const isExpired = msRemaining < 0;

    return {
      inGracePeriod: true,
      daysRemaining,
      endsAt,
      isExpired,
    };
  }

  /**
   * Expire a grace period and move to suspended state
   * @param businessId - The business ID
   * @returns The updated business
   */
  async expireGracePeriod(businessId: string): Promise<Business> {
    const business = await this.getBusiness(businessId);

    if (business.accountState !== AccountState.GRACE_PERIOD) {
      throw new AccountStateError('NOT_IN_GRACE_PERIOD', 'Business is not in grace period');
    }

    // Transition to suspended
    const updated = await this.transitionTo(
      businessId,
      AccountState.SUSPENDED,
      'Grace period expired without payment'
    );

    // Clear grace period end date
    return this.prisma.business.update({
      where: { id: businessId },
      data: { gracePeriodEndsAt: null },
    });
  }

  // ===========================================================================
  // STATE HISTORY
  // ===========================================================================

  /**
   * Get state transition history for a business
   * @param businessId - The business ID
   * @param limit - Maximum number of entries to return (default: 50)
   * @returns Array of state history entries
   */
  async getStateHistory(businessId: string, limit: number = 50): Promise<StateHistoryEntry[]> {
    await this.getBusiness(businessId); // Validate business exists

    const history = await this.prisma.accountStateHistory.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history.map((h: AccountStateHistory) => ({
      id: h.id,
      businessId: h.businessId,
      fromState: h.fromState,
      toState: h.toState,
      reason: h.reason,
      createdAt: h.createdAt,
    }));
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Get business or throw error if not found
   */
  private async getBusiness(businessId: string): Promise<Business> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new AccountStateError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    return business;
  }
}
