import { SubscriptionExpiryService } from '../SubscriptionExpiryService';
import { AccountState } from '../../../generated/prisma';

// Mock business data
const now = new Date();
const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day ahead

function makeBusiness(id: string, name: string) {
  return { id, name };
}

// Mock Prisma
function createMockPrisma(options: {
  expiredTrials?: Array<{ id: string; name: string }>;
  expiredGracePeriods?: Array<{ id: string; name: string }>;
} = {}) {
  const { expiredTrials = [], expiredGracePeriods = [] } = options;

  return {
    business: {
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        if (where.accountState === AccountState.TRIAL) {
          return Promise.resolve(expiredTrials);
        }
        if (where.accountState === AccountState.GRACE_PERIOD) {
          return Promise.resolve(expiredGracePeriods);
        }
        return Promise.resolve([]);
      }),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        const id = where.id;
        // Return a business in the right state for AccountStateService
        const trialBiz = expiredTrials.find(b => b.id === id);
        if (trialBiz) {
          return Promise.resolve({ ...trialBiz, accountState: AccountState.TRIAL, trialEndsAt: pastDate });
        }
        const graceBiz = expiredGracePeriods.find(b => b.id === id);
        if (graceBiz) {
          return Promise.resolve({ ...graceBiz, accountState: AccountState.GRACE_PERIOD, gracePeriodEndsAt: pastDate });
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        return Promise.resolve({ id: where.id, ...data });
      }),
    },
    accountStateHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation((ops: any[]) => {
      return Promise.all(ops);
    }),
  } as any;
}

describe('SubscriptionExpiryService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('runExpirySweep', () => {
    it('returns empty results when no businesses need expiry', async () => {
      const prisma = createMockPrisma();
      const service = new SubscriptionExpiryService(prisma);

      const result = await service.runExpirySweep();

      expect(result.expiredTrials).toHaveLength(0);
      expect(result.expiredGracePeriods).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('expires businesses with past trialEndsAt', async () => {
      const prisma = createMockPrisma({
        expiredTrials: [makeBusiness('biz-1', 'Coffee Shop A')],
      });
      const service = new SubscriptionExpiryService(prisma);

      const result = await service.runExpirySweep();

      expect(result.expiredTrials).toEqual(['biz-1']);
      expect(result.errors).toHaveLength(0);

      // Verify it queried for TRIAL businesses with past trialEndsAt
      expect(prisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountState: AccountState.TRIAL,
            trialEndsAt: { lt: expect.any(Date) },
          }),
        })
      );
    });

    it('expires businesses with past gracePeriodEndsAt', async () => {
      const prisma = createMockPrisma({
        expiredGracePeriods: [makeBusiness('biz-2', 'Tea House B')],
      });
      const service = new SubscriptionExpiryService(prisma);

      const result = await service.runExpirySweep();

      expect(result.expiredGracePeriods).toEqual(['biz-2']);
      expect(result.errors).toHaveLength(0);

      // Verify it queried for GRACE_PERIOD businesses with past gracePeriodEndsAt
      expect(prisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountState: AccountState.GRACE_PERIOD,
            gracePeriodEndsAt: { lt: expect.any(Date) },
          }),
        })
      );
    });

    it('handles both trial and grace period expiry in one sweep', async () => {
      const prisma = createMockPrisma({
        expiredTrials: [makeBusiness('biz-1', 'Shop A')],
        expiredGracePeriods: [makeBusiness('biz-2', 'Shop B')],
      });
      const service = new SubscriptionExpiryService(prisma);

      const result = await service.runExpirySweep();

      expect(result.expiredTrials).toEqual(['biz-1']);
      expect(result.expiredGracePeriods).toEqual(['biz-2']);
      expect(result.errors).toHaveLength(0);
    });

    it('does not expire businesses with future trial/grace period dates', async () => {
      const prisma = createMockPrisma();
      // findMany returns nothing because Prisma filters by lt: now
      const service = new SubscriptionExpiryService(prisma);

      const result = await service.runExpirySweep();

      expect(result.expiredTrials).toHaveLength(0);
      expect(result.expiredGracePeriods).toHaveLength(0);
      // Verify the query used lt (less than) for date filtering
      expect(prisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountState: AccountState.TRIAL,
            trialEndsAt: { lt: expect.any(Date) },
          }),
        })
      );
      expect(prisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountState: AccountState.GRACE_PERIOD,
            gracePeriodEndsAt: { lt: expect.any(Date) },
          }),
        })
      );
    });

    it('records errors for individual failures without stopping the sweep', async () => {
      const prisma = createMockPrisma({
        expiredTrials: [
          makeBusiness('biz-ok', 'Good Shop'),
          makeBusiness('biz-fail', 'Bad Shop'),
        ],
      });

      // Override findUnique: return null for biz-fail to trigger BUSINESS_NOT_FOUND from AccountStateService
      prisma.business.findUnique.mockImplementation(({ where }: any) => {
        if (where.id === 'biz-fail') {
          return Promise.resolve(null);
        }
        if (where.id === 'biz-ok') {
          return Promise.resolve({
            id: 'biz-ok',
            name: 'Good Shop',
            accountState: AccountState.TRIAL,
            trialEndsAt: pastDate,
          });
        }
        return Promise.resolve(null);
      });

      const service = new SubscriptionExpiryService(prisma);
      const result = await service.runExpirySweep();

      expect(result.expiredTrials).toContain('biz-ok');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].businessId).toBe('biz-fail');
    });
  });

  describe('start/stop', () => {
    it('starts and stops the periodic sweep', () => {
      jest.useFakeTimers();
      const prisma = createMockPrisma();
      const service = new SubscriptionExpiryService(prisma);

      service.start(5000);

      // Should have run immediately
      expect(prisma.business.findMany).toHaveBeenCalled();

      // Advance timer — should run again
      prisma.business.findMany.mockClear();
      jest.advanceTimersByTime(5000);
      expect(prisma.business.findMany).toHaveBeenCalled();

      // Stop — should not run again
      service.stop();
      prisma.business.findMany.mockClear();
      jest.advanceTimersByTime(5000);
      expect(prisma.business.findMany).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('does not start twice', () => {
      jest.useFakeTimers();
      const prisma = createMockPrisma();
      const service = new SubscriptionExpiryService(prisma);

      service.start(5000);
      const firstCallCount = prisma.business.findMany.mock.calls.length;

      service.start(5000); // Should be a no-op
      expect(prisma.business.findMany.mock.calls.length).toBe(firstCallCount);

      service.stop();
      jest.useRealTimers();
    });
  });

  describe('dependency injection', () => {
    it('accepts an injected AccountStateService', async () => {
      const prisma = createMockPrisma({
        expiredTrials: [makeBusiness('biz-di', 'DI Shop')],
      });

      const mockAccountStateService = {
        expireTrial: jest.fn().mockResolvedValue(undefined),
        expireGracePeriod: jest.fn().mockResolvedValue(undefined),
      } as any;

      const service = new SubscriptionExpiryService(prisma, mockAccountStateService);
      const result = await service.runExpirySweep();

      expect(result.expiredTrials).toEqual(['biz-di']);
      expect(mockAccountStateService.expireTrial).toHaveBeenCalledWith('biz-di');
    });
  });
});
