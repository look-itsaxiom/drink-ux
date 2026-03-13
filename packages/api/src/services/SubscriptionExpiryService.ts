import { PrismaClient, AccountState } from '../../generated/prisma';
import { AccountStateService } from './AccountStateService';

export interface ExpiryResult {
  expiredTrials: string[];
  expiredGracePeriods: string[];
  errors: Array<{ businessId: string; error: string }>;
}

/**
 * Handles periodic expiry of trials and grace periods.
 * Finds businesses past their deadline and transitions them to SUSPENDED.
 */
export class SubscriptionExpiryService {
  private readonly accountStateService: AccountStateService;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    accountStateService?: AccountStateService,
  ) {
    this.accountStateService = accountStateService ?? new AccountStateService(prisma);
  }

  /**
   * Run a single expiry sweep: find and suspend expired trials and grace periods.
   */
  async runExpirySweep(): Promise<ExpiryResult> {
    const now = new Date();
    const result: ExpiryResult = {
      expiredTrials: [],
      expiredGracePeriods: [],
      errors: [],
    };

    // Find expired trials
    const expiredTrialBusinesses = await this.prisma.business.findMany({
      where: {
        accountState: AccountState.TRIAL,
        trialEndsAt: { lt: now },
      },
      select: { id: true, name: true },
    });

    for (const business of expiredTrialBusinesses) {
      try {
        await this.accountStateService.expireTrial(business.id);
        result.expiredTrials.push(business.id);
        console.log(`[ExpiryService] Trial expired for business ${business.id} (${business.name})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({ businessId: business.id, error: message });
        console.error(`[ExpiryService] Failed to expire trial for ${business.id}:`, message);
      }
    }

    // Find expired grace periods
    const expiredGraceBusinesses = await this.prisma.business.findMany({
      where: {
        accountState: AccountState.GRACE_PERIOD,
        gracePeriodEndsAt: { lt: now },
      },
      select: { id: true, name: true },
    });

    for (const business of expiredGraceBusinesses) {
      try {
        await this.accountStateService.expireGracePeriod(business.id);
        result.expiredGracePeriods.push(business.id);
        console.log(`[ExpiryService] Grace period expired for business ${business.id} (${business.name})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({ businessId: business.id, error: message });
        console.error(`[ExpiryService] Failed to expire grace period for ${business.id}:`, message);
      }
    }

    if (result.expiredTrials.length > 0 || result.expiredGracePeriods.length > 0) {
      console.log(
        `[ExpiryService] Sweep complete: ${result.expiredTrials.length} trials expired, ` +
        `${result.expiredGracePeriods.length} grace periods expired, ${result.errors.length} errors`
      );
    }

    return result;
  }

  /**
   * Start periodic expiry checks.
   * @param intervalMs - How often to run (default: 1 hour)
   */
  start(intervalMs: number = 60 * 60 * 1000): void {
    if (this.intervalHandle) {
      return; // Already running
    }

    console.log(`[ExpiryService] Starting periodic sweep (every ${intervalMs / 1000}s)`);

    // Run immediately on start, then at interval
    this.runExpirySweep().catch(err => {
      console.error('[ExpiryService] Initial sweep failed:', err);
    });

    this.intervalHandle = setInterval(() => {
      this.runExpirySweep().catch(err => {
        console.error('[ExpiryService] Periodic sweep failed:', err);
      });
    }, intervalMs);
  }

  /**
   * Stop periodic expiry checks.
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[ExpiryService] Stopped periodic sweep');
    }
  }
}
