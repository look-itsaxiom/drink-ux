import { PrismaClient, AccountState } from '../../../generated/prisma';
import { AccountStateService, AccountStateError, AccountCapabilities } from '../AccountStateService';
import { AuthService } from '../AuthService';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database before tests
  await prisma.$transaction([
    prisma.accountStateHistory.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AccountStateService', () => {
  let stateService: AccountStateService;
  let authService: AuthService;
  let testBusinessId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Clean database before each test
    await prisma.$transaction([
      prisma.accountStateHistory.deleteMany(),
      prisma.syncHistory.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.presetModifier.deleteMany(),
      prisma.preset.deleteMany(),
      prisma.modifier.deleteMany(),
      prisma.base.deleteMany(),
      prisma.category.deleteMany(),
      prisma.session.deleteMany(),
      prisma.business.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    stateService = new AccountStateService(prisma);
    authService = new AuthService(prisma);

    // Create a test user and business
    const result = await authService.signup({
      email: 'test@example.com',
      password: 'SecureP@ss1',
      businessName: 'Test Coffee Shop',
    });

    testBusinessId = result.business.id;
    testUserId = result.user.id;
  });

  // ===========================================================================
  // HAPPY PATH - STANDARD WORKFLOW
  // ===========================================================================
  describe('Happy Path', () => {
    it('transitions from setup_complete to active', async () => {
      // Set up business in SETUP_COMPLETE state
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.SETUP_COMPLETE },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.ACTIVE,
        'Subscription activated'
      );

      expect(result.accountState).toBe(AccountState.ACTIVE);
    });

    it('returns correct capabilities for active account', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      const capabilities = await stateService.getAccountCapabilities(testBusinessId);

      expect(capabilities.canAccessStorefront).toBe(true);
      expect(capabilities.canEditMenu).toBe(true);
      expect(capabilities.canProcessOrders).toBe(true);
      expect(capabilities.canManageSubscription).toBe(true);
    });

    it('allows storefront access for active subscription', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      const canAccess = await stateService.canAccessStorefront(testBusinessId);
      expect(canAccess).toBe(true);
    });
  });

  // ===========================================================================
  // VALID STATE TRANSITIONS
  // ===========================================================================
  describe('Valid State Transitions', () => {
    it('valid transition: onboarding -> setup_complete', async () => {
      // Business starts in ONBOARDING state by default
      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.SETUP_COMPLETE,
        'Onboarding completed'
      );

      expect(result.accountState).toBe(AccountState.SETUP_COMPLETE);

      // Verify history was recorded
      const history = await prisma.accountStateHistory.findMany({
        where: { businessId: testBusinessId },
      });
      expect(history).toHaveLength(1);
      expect(history[0].fromState).toBe(AccountState.ONBOARDING);
      expect(history[0].toState).toBe(AccountState.SETUP_COMPLETE);
      expect(history[0].reason).toBe('Onboarding completed');
    });

    it('valid transition: setup_complete -> trial', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.SETUP_COMPLETE },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.TRIAL,
        'Trial period started'
      );

      expect(result.accountState).toBe(AccountState.TRIAL);
    });

    it('valid transition: setup_complete -> active', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.SETUP_COMPLETE },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.ACTIVE,
        'Direct subscription activation'
      );

      expect(result.accountState).toBe(AccountState.ACTIVE);
    });

    it('valid transition: trial -> active', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.TRIAL },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.ACTIVE,
        'Trial converted to subscription'
      );

      expect(result.accountState).toBe(AccountState.ACTIVE);
    });

    it('valid transition: active -> paused', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.PAUSED,
        'User requested pause'
      );

      expect(result.accountState).toBe(AccountState.PAUSED);
    });

    it('valid transition: paused -> active', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.PAUSED },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.ACTIVE,
        'Subscription resumed'
      );

      expect(result.accountState).toBe(AccountState.ACTIVE);
    });

    it('valid transition: active -> grace_period', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.GRACE_PERIOD,
        'Payment failed'
      );

      expect(result.accountState).toBe(AccountState.GRACE_PERIOD);
    });

    it('valid transition: grace_period -> active (payment fixed)', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.GRACE_PERIOD },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.ACTIVE,
        'Payment method updated'
      );

      expect(result.accountState).toBe(AccountState.ACTIVE);
    });

    it('valid transition: grace_period -> suspended (payment not fixed)', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.GRACE_PERIOD },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.SUSPENDED,
        'Grace period expired'
      );

      expect(result.accountState).toBe(AccountState.SUSPENDED);
    });

    it('valid transition: suspended -> setup_complete (resubscribe flow)', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.SUSPENDED },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.SETUP_COMPLETE,
        'Account reactivation initiated'
      );

      expect(result.accountState).toBe(AccountState.SETUP_COMPLETE);
    });

    it('valid transition: trial -> suspended (trial expired without conversion)', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.TRIAL },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.SUSPENDED,
        'Trial period expired without subscription'
      );

      expect(result.accountState).toBe(AccountState.SUSPENDED);
    });
  });

  // ===========================================================================
  // INVALID STATE TRANSITIONS
  // ===========================================================================
  describe('Invalid State Transitions', () => {
    it('invalid transition: onboarding -> active (must go through setup)', async () => {
      // Business starts in ONBOARDING state
      await expect(
        stateService.transitionTo(testBusinessId, AccountState.ACTIVE)
      ).rejects.toThrow(AccountStateError);

      try {
        await stateService.transitionTo(testBusinessId, AccountState.ACTIVE);
      } catch (error) {
        expect((error as AccountStateError).code).toBe('INVALID_TRANSITION');
      }
    });

    it('invalid transition: suspended -> active (must resubscribe through setup)', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.SUSPENDED },
      });

      await expect(
        stateService.transitionTo(testBusinessId, AccountState.ACTIVE)
      ).rejects.toThrow(AccountStateError);

      try {
        await stateService.transitionTo(testBusinessId, AccountState.ACTIVE);
      } catch (error) {
        expect((error as AccountStateError).code).toBe('INVALID_TRANSITION');
      }
    });

    it('invalid transition: churned -> any state', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.CHURNED },
      });

      const allStates = [
        AccountState.ONBOARDING,
        AccountState.SETUP_COMPLETE,
        AccountState.TRIAL,
        AccountState.ACTIVE,
        AccountState.GRACE_PERIOD,
        AccountState.PAUSED,
        AccountState.SUSPENDED,
      ];

      for (const state of allStates) {
        await expect(
          stateService.transitionTo(testBusinessId, state)
        ).rejects.toThrow(AccountStateError);
      }
    });

    it('invalid transition: paused -> suspended (must go through grace_period or active)', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.PAUSED },
      });

      await expect(
        stateService.transitionTo(testBusinessId, AccountState.SUSPENDED)
      ).rejects.toThrow(AccountStateError);
    });

    it('invalid transition: setup_complete -> grace_period (never had active subscription)', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.SETUP_COMPLETE },
      });

      await expect(
        stateService.transitionTo(testBusinessId, AccountState.GRACE_PERIOD)
      ).rejects.toThrow(AccountStateError);
    });
  });

  // ===========================================================================
  // ERROR SCENARIOS
  // ===========================================================================
  describe('Error Scenarios', () => {
    it('transition for non-existent business throws error', async () => {
      await expect(
        stateService.transitionTo('non-existent-id', AccountState.ACTIVE)
      ).rejects.toThrow(AccountStateError);

      try {
        await stateService.transitionTo('non-existent-id', AccountState.ACTIVE);
      } catch (error) {
        expect((error as AccountStateError).code).toBe('BUSINESS_NOT_FOUND');
      }
    });

    it('canAccessStorefront for non-existent business throws error', async () => {
      await expect(
        stateService.canAccessStorefront('non-existent-id')
      ).rejects.toThrow(AccountStateError);
    });

    it('getAccountCapabilities for non-existent business throws error', async () => {
      await expect(
        stateService.getAccountCapabilities('non-existent-id')
      ).rejects.toThrow(AccountStateError);
    });

    it('getGracePeriodStatus for non-existent business throws error', async () => {
      await expect(
        stateService.getGracePeriodStatus('non-existent-id')
      ).rejects.toThrow(AccountStateError);
    });
  });

  // ===========================================================================
  // TRIAL MANAGEMENT
  // ===========================================================================
  describe('Trial Management', () => {
    it('startTrial transitions setup_complete to trial and sets trialEndsAt', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.SETUP_COMPLETE },
      });

      const result = await stateService.startTrial(testBusinessId);
      const history = await prisma.accountStateHistory.findFirst({
        where: { businessId: testBusinessId },
        orderBy: { createdAt: 'desc' },
      });

      expect(result.accountState).toBe(AccountState.TRIAL);
      expect(result.trialEndsAt).toBeDefined();
      expect(history?.fromState).toBe(AccountState.SETUP_COMPLETE);
      expect(history?.toState).toBe(AccountState.TRIAL);
    });

    it('isTrialExpired returns true when trial end date is in the past', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: AccountState.TRIAL,
          trialEndsAt: new Date(Date.now() - 60 * 1000),
        },
      });

      const expired = await stateService.isTrialExpired(testBusinessId);
      expect(expired).toBe(true);
    });

    it('isTrialExpired returns false when trial end date is in the future', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: AccountState.TRIAL,
          trialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const expired = await stateService.isTrialExpired(testBusinessId);
      expect(expired).toBe(false);
    });

    it('expireTrial transitions trial to suspended', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: AccountState.TRIAL,
          trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      const result = await stateService.expireTrial(testBusinessId);
      expect(result.accountState).toBe(AccountState.SUSPENDED);
    });

    it('expireTrial throws when business is not in trial', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      await expect(
        stateService.expireTrial(testBusinessId)
      ).rejects.toThrow(AccountStateError);

      try {
        await stateService.expireTrial(testBusinessId);
      } catch (error) {
        expect((error as AccountStateError).code).toBe('NOT_IN_TRIAL');
      }
    });
  });

  // ===========================================================================
  // CAN TRANSITION CHECK
  // ===========================================================================
  describe('canTransition', () => {
    it('returns true for valid transitions', () => {
      expect(stateService.canTransition(AccountState.ONBOARDING, AccountState.SETUP_COMPLETE)).toBe(true);
      expect(stateService.canTransition(AccountState.SETUP_COMPLETE, AccountState.TRIAL)).toBe(true);
      expect(stateService.canTransition(AccountState.SETUP_COMPLETE, AccountState.ACTIVE)).toBe(true);
      expect(stateService.canTransition(AccountState.TRIAL, AccountState.ACTIVE)).toBe(true);
      expect(stateService.canTransition(AccountState.ACTIVE, AccountState.PAUSED)).toBe(true);
      expect(stateService.canTransition(AccountState.PAUSED, AccountState.ACTIVE)).toBe(true);
      expect(stateService.canTransition(AccountState.ACTIVE, AccountState.GRACE_PERIOD)).toBe(true);
      expect(stateService.canTransition(AccountState.GRACE_PERIOD, AccountState.ACTIVE)).toBe(true);
      expect(stateService.canTransition(AccountState.GRACE_PERIOD, AccountState.SUSPENDED)).toBe(true);
    });

    it('returns false for invalid transitions', () => {
      expect(stateService.canTransition(AccountState.ONBOARDING, AccountState.ACTIVE)).toBe(false);
      expect(stateService.canTransition(AccountState.SUSPENDED, AccountState.ACTIVE)).toBe(false);
      expect(stateService.canTransition(AccountState.CHURNED, AccountState.ACTIVE)).toBe(false);
      expect(stateService.canTransition(AccountState.CHURNED, AccountState.ONBOARDING)).toBe(false);
    });
  });

  // ===========================================================================
  // GET VALID TRANSITIONS
  // ===========================================================================
  describe('getValidTransitions', () => {
    it('returns valid transitions from onboarding', () => {
      const valid = stateService.getValidTransitions(AccountState.ONBOARDING);
      expect(valid).toContain(AccountState.SETUP_COMPLETE);
      expect(valid).not.toContain(AccountState.ACTIVE);
    });

    it('returns valid transitions from setup_complete', () => {
      const valid = stateService.getValidTransitions(AccountState.SETUP_COMPLETE);
      expect(valid).toContain(AccountState.TRIAL);
      expect(valid).toContain(AccountState.ACTIVE);
      expect(valid).not.toContain(AccountState.GRACE_PERIOD);
    });

    it('returns valid transitions from active', () => {
      const valid = stateService.getValidTransitions(AccountState.ACTIVE);
      expect(valid).toContain(AccountState.PAUSED);
      expect(valid).toContain(AccountState.GRACE_PERIOD);
      expect(valid).toContain(AccountState.CHURNED);
    });

    it('returns empty array for churned state', () => {
      const valid = stateService.getValidTransitions(AccountState.CHURNED);
      expect(valid).toHaveLength(0);
    });
  });

  // ===========================================================================
  // STATE-BASED ACCESS CONTROL
  // ===========================================================================
  describe('State-Based Access Control', () => {
    describe('canAccessStorefront', () => {
      it('returns true for active state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.ACTIVE },
        });

        expect(await stateService.canAccessStorefront(testBusinessId)).toBe(true);
      });

      it('returns true for trial state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.TRIAL },
        });

        expect(await stateService.canAccessStorefront(testBusinessId)).toBe(true);
      });

      it('returns false for paused state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.PAUSED },
        });

        expect(await stateService.canAccessStorefront(testBusinessId)).toBe(false);
      });

      it('returns false for suspended state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.SUSPENDED },
        });

        expect(await stateService.canAccessStorefront(testBusinessId)).toBe(false);
      });

      it('returns false for onboarding state', async () => {
        // Default state is ONBOARDING
        expect(await stateService.canAccessStorefront(testBusinessId)).toBe(false);
      });
    });

    describe('canEditMenu', () => {
      it('returns true for active state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.ACTIVE },
        });

        expect(await stateService.canEditMenu(testBusinessId)).toBe(true);
      });

      it('returns true for trial state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.TRIAL },
        });

        expect(await stateService.canEditMenu(testBusinessId)).toBe(true);
      });

      it('returns true for paused state (can still edit while paused)', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.PAUSED },
        });

        expect(await stateService.canEditMenu(testBusinessId)).toBe(true);
      });

      it('returns false for suspended state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.SUSPENDED },
        });

        expect(await stateService.canEditMenu(testBusinessId)).toBe(false);
      });
    });

    describe('canProcessOrders', () => {
      it('returns true for active state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.ACTIVE },
        });

        expect(await stateService.canProcessOrders(testBusinessId)).toBe(true);
      });

      it('returns true for trial state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.TRIAL },
        });

        expect(await stateService.canProcessOrders(testBusinessId)).toBe(true);
      });

      it('returns false for paused state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.PAUSED },
        });

        expect(await stateService.canProcessOrders(testBusinessId)).toBe(false);
      });

      it('returns false for grace_period state', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.GRACE_PERIOD },
        });

        expect(await stateService.canProcessOrders(testBusinessId)).toBe(false);
      });
    });

    describe('getAccountCapabilities', () => {
      it('returns full capabilities for active account', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.ACTIVE },
        });

        const capabilities = await stateService.getAccountCapabilities(testBusinessId);

        expect(capabilities).toEqual({
          canAccessStorefront: true,
          canEditMenu: true,
          canProcessOrders: true,
          canManageSubscription: true,
          canViewAnalytics: true,
          canExportData: true,
          isReadOnly: false,
        });
      });

      it('returns limited capabilities for suspended account', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.SUSPENDED },
        });

        const capabilities = await stateService.getAccountCapabilities(testBusinessId);

        expect(capabilities.canAccessStorefront).toBe(false);
        expect(capabilities.canEditMenu).toBe(false);
        expect(capabilities.canProcessOrders).toBe(false);
        expect(capabilities.canViewAnalytics).toBe(true);
        expect(capabilities.canExportData).toBe(true);
        expect(capabilities.isReadOnly).toBe(true);
      });

      it('returns grace period capabilities', async () => {
        await prisma.business.update({
          where: { id: testBusinessId },
          data: { accountState: AccountState.GRACE_PERIOD },
        });

        const capabilities = await stateService.getAccountCapabilities(testBusinessId);

        // Grace period allows storefront access but not order processing
        expect(capabilities.canAccessStorefront).toBe(true);
        expect(capabilities.canEditMenu).toBe(true);
        expect(capabilities.canProcessOrders).toBe(false);
        expect(capabilities.canManageSubscription).toBe(true);
      });
    });
  });

  // ===========================================================================
  // GRACE PERIOD MANAGEMENT
  // ===========================================================================
  describe('Grace Period Management', () => {
    it('startGracePeriod sets correct end date', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      const daysRemaining = 7;
      const result = await stateService.startGracePeriod(testBusinessId, daysRemaining);

      expect(result.accountState).toBe(AccountState.GRACE_PERIOD);
      expect(result.gracePeriodEndsAt).toBeDefined();

      // Check grace period end is approximately 7 days from now
      const now = new Date();
      const expectedEnd = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
      const actualEnd = new Date(result.gracePeriodEndsAt!);

      // Allow 1 minute tolerance for test execution time
      expect(Math.abs(actualEnd.getTime() - expectedEnd.getTime())).toBeLessThan(60000);
    });

    it('extendGracePeriod adds days to existing period', async () => {
      // Start with grace period
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: AccountState.GRACE_PERIOD,
          gracePeriodEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        },
      });

      const result = await stateService.extendGracePeriod(testBusinessId, 5);

      // Should now be 8 days from the original start (3 + 5)
      const status = await stateService.getGracePeriodStatus(testBusinessId);
      expect(status.daysRemaining).toBeGreaterThanOrEqual(7);
      expect(status.daysRemaining).toBeLessThanOrEqual(8);
    });

    it('getGracePeriodStatus returns correct remaining days', async () => {
      const daysRemaining = 5;
      const gracePeriodEndsAt = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);

      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: AccountState.GRACE_PERIOD,
          gracePeriodEndsAt,
        },
      });

      const status = await stateService.getGracePeriodStatus(testBusinessId);

      expect(status.inGracePeriod).toBe(true);
      expect(status.daysRemaining).toBeGreaterThanOrEqual(4);
      expect(status.daysRemaining).toBeLessThanOrEqual(5);
      expect(status.endsAt).toEqual(gracePeriodEndsAt);
    });

    it('getGracePeriodStatus returns not in grace period for other states', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      const status = await stateService.getGracePeriodStatus(testBusinessId);

      expect(status.inGracePeriod).toBe(false);
      expect(status.daysRemaining).toBe(0);
      expect(status.endsAt).toBeNull();
    });

    it('expireGracePeriod moves to suspended state', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: AccountState.GRACE_PERIOD,
          gracePeriodEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const result = await stateService.expireGracePeriod(testBusinessId);

      expect(result.accountState).toBe(AccountState.SUSPENDED);
      expect(result.gracePeriodEndsAt).toBeNull();
    });

    it('expireGracePeriod throws if not in grace period', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      await expect(
        stateService.expireGracePeriod(testBusinessId)
      ).rejects.toThrow(AccountStateError);

      try {
        await stateService.expireGracePeriod(testBusinessId);
      } catch (error) {
        expect((error as AccountStateError).code).toBe('NOT_IN_GRACE_PERIOD');
      }
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================
  describe('Edge Cases', () => {
    it('grace period expiration at exactly deadline', async () => {
      // Set grace period to expire right now
      const exactlyNow = new Date();

      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: AccountState.GRACE_PERIOD,
          gracePeriodEndsAt: exactlyNow,
        },
      });

      const status = await stateService.getGracePeriodStatus(testBusinessId);

      // At deadline, should show 0 days remaining but still technically in grace period
      expect(status.inGracePeriod).toBe(true);
      expect(status.daysRemaining).toBe(0);
    });

    it('grace period already expired', async () => {
      // Set grace period to have expired yesterday
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          accountState: AccountState.GRACE_PERIOD,
          gracePeriodEndsAt: yesterday,
        },
      });

      const status = await stateService.getGracePeriodStatus(testBusinessId);

      expect(status.inGracePeriod).toBe(true); // Still in the state, but expired
      expect(status.isExpired).toBe(true);
      expect(status.daysRemaining).toBe(0);
    });

    it('multiple rapid state changes are recorded in history', async () => {
      // Transition through multiple states rapidly
      await stateService.transitionTo(testBusinessId, AccountState.SETUP_COMPLETE, 'Step 1');
      await stateService.transitionTo(testBusinessId, AccountState.TRIAL, 'Step 2');
      await stateService.transitionTo(testBusinessId, AccountState.ACTIVE, 'Step 3');
      await stateService.transitionTo(testBusinessId, AccountState.PAUSED, 'Step 4');
      await stateService.transitionTo(testBusinessId, AccountState.ACTIVE, 'Step 5');

      const history = await prisma.accountStateHistory.findMany({
        where: { businessId: testBusinessId },
        orderBy: { createdAt: 'asc' },
      });

      expect(history).toHaveLength(5);
      expect(history[0].fromState).toBe(AccountState.ONBOARDING);
      expect(history[0].toState).toBe(AccountState.SETUP_COMPLETE);
      expect(history[4].fromState).toBe(AccountState.PAUSED);
      expect(history[4].toState).toBe(AccountState.ACTIVE);
    });

    it('transition to same state is no-op', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.ACTIVE,
        'Redundant transition'
      );

      expect(result.accountState).toBe(AccountState.ACTIVE);

      // No history should be recorded for same-state transition
      const history = await prisma.accountStateHistory.findMany({
        where: { businessId: testBusinessId },
      });
      expect(history).toHaveLength(0);
    });

    it('historical state queries return ordered results', async () => {
      // Create multiple transitions
      await stateService.transitionTo(testBusinessId, AccountState.SETUP_COMPLETE, 'First');
      await stateService.transitionTo(testBusinessId, AccountState.ACTIVE, 'Second');
      await stateService.transitionTo(testBusinessId, AccountState.PAUSED, 'Third');

      const history = await stateService.getStateHistory(testBusinessId);

      expect(history).toHaveLength(3);
      // Should be ordered by createdAt descending (most recent first)
      expect(history[0].toState).toBe(AccountState.PAUSED);
      expect(history[2].toState).toBe(AccountState.SETUP_COMPLETE);
    });

    it('getStateHistory with limit returns correct count', async () => {
      await stateService.transitionTo(testBusinessId, AccountState.SETUP_COMPLETE);
      await stateService.transitionTo(testBusinessId, AccountState.ACTIVE);
      await stateService.transitionTo(testBusinessId, AccountState.PAUSED);
      await stateService.transitionTo(testBusinessId, AccountState.ACTIVE);

      const history = await stateService.getStateHistory(testBusinessId, 2);

      expect(history).toHaveLength(2);
    });
  });

  // ===========================================================================
  // TRANSITION REASON RECORDING
  // ===========================================================================
  describe('Transition Reason Recording', () => {
    it('records reason when provided', async () => {
      await stateService.transitionTo(
        testBusinessId,
        AccountState.SETUP_COMPLETE,
        'User completed onboarding wizard'
      );

      const history = await prisma.accountStateHistory.findFirst({
        where: { businessId: testBusinessId },
      });

      expect(history?.reason).toBe('User completed onboarding wizard');
    });

    it('allows transition without reason', async () => {
      await stateService.transitionTo(testBusinessId, AccountState.SETUP_COMPLETE);

      const history = await prisma.accountStateHistory.findFirst({
        where: { businessId: testBusinessId },
      });

      expect(history?.reason).toBeNull();
    });
  });

  // ===========================================================================
  // CHURN TRANSITION
  // ===========================================================================
  describe('Churn Transition', () => {
    it('allows transition to churned from active', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.ACTIVE },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.CHURNED,
        'Account closure requested'
      );

      expect(result.accountState).toBe(AccountState.CHURNED);
    });

    it('allows transition to churned from suspended', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.SUSPENDED },
      });

      const result = await stateService.transitionTo(
        testBusinessId,
        AccountState.CHURNED,
        'Account deleted after inactivity'
      );

      expect(result.accountState).toBe(AccountState.CHURNED);
    });

    it('churned accounts have no capabilities', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: { accountState: AccountState.CHURNED },
      });

      const capabilities = await stateService.getAccountCapabilities(testBusinessId);

      expect(capabilities.canAccessStorefront).toBe(false);
      expect(capabilities.canEditMenu).toBe(false);
      expect(capabilities.canProcessOrders).toBe(false);
      expect(capabilities.canManageSubscription).toBe(false);
      expect(capabilities.canViewAnalytics).toBe(false);
      expect(capabilities.canExportData).toBe(false);
    });
  });
});
