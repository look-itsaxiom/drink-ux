/**
 * Catalog Sync Service
 *
 * Handles on-demand publishing of catalog changes to POS systems.
 * - Drink-UX wins conflicts (our data overwrites POS on sync)
 * - Non-destructive: never deletes from POS, only marks inactive
 * - On-demand: business clicks "Publish Changes" to sync
 */

import { PrismaClient, SyncStatus, Business, SyncHistory } from '../../generated/prisma';
import { POSAdapter, CatalogItem, CatalogModifier } from '../adapters/pos/POSAdapter';
import {
  calculateCatalogDiff,
  CatalogDiff,
  DiffItemChange,
  DiffModifierChange,
  LocalItem,
  LocalModifier,
} from '../utils/catalogDiff';

/**
 * Retry configuration for sync operations
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

/**
 * Error codes that should trigger a retry
 */
const RETRYABLE_ERROR_CODES = [
  'RATE_LIMIT_EXCEEDED',
  'TIMEOUT',
  'NETWORK_ERROR',
  'POS_UNAVAILABLE',
  'ECONNRESET',
  'ETIMEDOUT',
];

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Check for explicit retryable flag
    if ((error as any).retryable === true) {
      return true;
    }
    // Check for retryable error codes
    const code = (error as any).code;
    if (code && RETRYABLE_ERROR_CODES.includes(code)) {
      return true;
    }
    // Check message patterns for transient errors
    const message = error.message.toLowerCase();
    if (
      message.includes('timeout') ||
      message.includes('temporarily') ||
      message.includes('rate limit') ||
      message.includes('connection') ||
      message.includes('unavailable')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  modifiersCreated: number;
  modifiersUpdated: number;
  error?: string;
  syncHistoryId?: string;
}

/**
 * Sync status response
 */
export interface SyncStatusResponse {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  lastError: string | null;
  pendingChanges: number;
}

export class CatalogSyncService {
  private retryConfig: RetryConfig;

  constructor(
    private prisma: PrismaClient,
    private adapter: POSAdapter,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Execute an operation with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        if (attempt <= this.retryConfig.maxRetries && isRetryableError(error)) {
          const delay = calculateBackoffDelay(attempt, this.retryConfig);
          console.warn(`Retry attempt ${attempt} for ${operationName} after ${delay}ms`, {
            error: lastError.message,
            code: (error as any).code,
          });
          await sleep(delay);
        } else {
          // Non-retryable error or max retries reached
          throw lastError;
        }
      }
    }

    // Should not reach here, but TypeScript needs this
    throw lastError;
  }

  /**
   * Sync catalog changes to POS
   *
   * @param businessId The business to sync
   * @returns SyncResult with success status and counts
   */
  async sync(businessId: string): Promise<SyncResult> {
    let syncHistoryId: string | undefined;

    try {
      // 1. Get and validate business
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        return {
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsDeactivated: 0,
          modifiersCreated: 0,
          modifiersUpdated: 0,
          error: `Business ${businessId} not found`,
        };
      }

      // 2. Validate POS connection
      if (!business.posAccessToken || !business.posMerchantId) {
        return {
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsDeactivated: 0,
          modifiersCreated: 0,
          modifiersUpdated: 0,
          error: 'Business has no POS connection configured',
        };
      }

      // 3. Check if sync is already in progress
      if (business.syncStatus === SyncStatus.SYNCING) {
        return {
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsDeactivated: 0,
          modifiersCreated: 0,
          modifiersUpdated: 0,
          error: 'Sync already in progress',
        };
      }

      // 4. Set sync status to SYNCING and create history record
      await this.prisma.business.update({
        where: { id: businessId },
        data: { syncStatus: SyncStatus.SYNCING },
      });

      const syncHistory = await this.prisma.syncHistory.create({
        data: {
          businessId,
          status: SyncStatus.SYNCING,
        },
      });
      syncHistoryId = syncHistory.id;

      // 5. Get catalog data
      const [bases, modifiers, presets] = await Promise.all([
        this.prisma.base.findMany({ where: { businessId } }),
        this.prisma.modifier.findMany({ where: { businessId } }),
        this.prisma.preset.findMany({ where: { businessId } }),
      ]);

      // 6. Calculate diff
      const localBases: LocalItem[] = bases.map((b) => ({
        id: b.id,
        name: b.name,
        basePrice: b.basePrice,
        posItemId: b.posItemId,
        available: b.available,
        updatedAt: b.updatedAt,
      }));

      const localModifiers: LocalModifier[] = modifiers.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        price: m.price,
        posModifierId: m.posModifierId,
        available: m.available,
        updatedAt: m.updatedAt,
      }));

      const localPresets: LocalItem[] = presets.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        posItemId: p.posItemId,
        available: p.available,
        updatedAt: p.updatedAt,
      }));

      const diff = calculateCatalogDiff(
        { bases: localBases, modifiers: localModifiers, presets: localPresets },
        business.lastSyncedAt
      );

      // 7. Execute sync operations
      const result = await this.executeSyncOperations(businessId, diff);

      // 8. Update business and history on success
      await this.prisma.business.update({
        where: { id: businessId },
        data: {
          syncStatus: SyncStatus.SUCCESS,
          lastSyncedAt: new Date(),
          lastSyncError: null,
        },
      });

      await this.prisma.syncHistory.update({
        where: { id: syncHistoryId },
        data: {
          status: SyncStatus.SUCCESS,
          completedAt: new Date(),
          itemsCreated: result.itemsCreated,
          itemsUpdated: result.itemsUpdated,
          itemsDeactivated: result.itemsDeactivated,
          modifiersCreated: result.modifiersCreated,
          modifiersUpdated: result.modifiersUpdated,
        },
      });

      return {
        ...result,
        success: true,
        syncHistoryId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update business status to ERROR
      await this.prisma.business.update({
        where: { id: businessId },
        data: {
          syncStatus: SyncStatus.ERROR,
          lastSyncError: errorMessage,
        },
      });

      // Update history if we created one
      if (syncHistoryId) {
        await this.prisma.syncHistory.update({
          where: { id: syncHistoryId },
          data: {
            status: SyncStatus.ERROR,
            completedAt: new Date(),
            errorMessage,
          },
        });
      }

      return {
        success: false,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsDeactivated: 0,
        modifiersCreated: 0,
        modifiersUpdated: 0,
        error: errorMessage,
        syncHistoryId,
      };
    }
  }

  /**
   * Execute sync operations for a diff
   */
  private async executeSyncOperations(
    businessId: string,
    diff: CatalogDiff
  ): Promise<Omit<SyncResult, 'success' | 'error' | 'syncHistoryId'>> {
    let itemsCreated = 0;
    let itemsUpdated = 0;
    let itemsDeactivated = 0;
    let modifiersCreated = 0;
    const modifiersUpdated = diff.modifiers.updated.length;

    // Create new items with retry
    for (const item of diff.items.created) {
      const posItemId = await this.withRetry(
        () => this.adapter.pushItem(this.toCatalogItem(item)),
        `pushItem:${item.name}`
      );
      await this.updateItemPosId(item, posItemId);
      itemsCreated++;
    }

    // Update existing items with retry
    for (const item of diff.items.updated) {
      await this.withRetry(
        () => this.adapter.updateItem(item.posItemId!, this.toCatalogItem(item)),
        `updateItem:${item.name}`
      );
      itemsUpdated++;
    }

    // Deactivate items (mark inactive in POS, don't delete) with retry
    for (const item of diff.items.deactivated) {
      const deactivatedItem = this.toCatalogItem(item);
      // Mark as inactive/unavailable in POS
      await this.withRetry(
        () => this.adapter.updateItem(item.posItemId!, deactivatedItem),
        `deactivateItem:${item.name}`
      );
      itemsDeactivated++;
    }

    // Create new modifiers with retry
    for (const modifier of diff.modifiers.created) {
      const posModifierId = await this.withRetry(
        () => this.adapter.pushModifier(this.toCatalogModifier(modifier)),
        `pushModifier:${modifier.name}`
      );
      await this.updateModifierPosId(modifier, posModifierId);
      modifiersCreated++;
    }

    return {
      itemsCreated,
      itemsUpdated,
      itemsDeactivated,
      modifiersCreated,
      modifiersUpdated,
    };
  }

  /**
   * Convert diff item to CatalogItem for POS adapter
   */
  private toCatalogItem(item: DiffItemChange): CatalogItem {
    return {
      name: item.name,
      price: Math.round(item.price * 100), // Convert to cents
    };
  }

  /**
   * Convert diff modifier to CatalogModifier for POS adapter
   */
  private toCatalogModifier(modifier: DiffModifierChange): CatalogModifier {
    return {
      name: modifier.name,
      price: Math.round(modifier.price * 100), // Convert to cents
      modifierListName: modifier.modifierType,
    };
  }

  /**
   * Update item with POS ID after successful push
   */
  private async updateItemPosId(item: DiffItemChange, posItemId: string): Promise<void> {
    if (item.itemType === 'base') {
      await this.prisma.base.update({
        where: { id: item.localId },
        data: { posItemId },
      });
    } else {
      await this.prisma.preset.update({
        where: { id: item.localId },
        data: { posItemId },
      });
    }
  }

  /**
   * Update modifier with POS ID after successful push
   */
  private async updateModifierPosId(modifier: DiffModifierChange, posModifierId: string): Promise<void> {
    await this.prisma.modifier.update({
      where: { id: modifier.localId },
      data: { posModifierId },
    });
  }

  /**
   * Get current sync status for a business
   */
  async getSyncStatus(businessId: string): Promise<SyncStatusResponse | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return null;
    }

    // Calculate pending changes
    const [bases, modifiers, presets] = await Promise.all([
      this.prisma.base.findMany({ where: { businessId } }),
      this.prisma.modifier.findMany({ where: { businessId } }),
      this.prisma.preset.findMany({ where: { businessId } }),
    ]);

    const localBases: LocalItem[] = bases.map((b) => ({
      id: b.id,
      name: b.name,
      basePrice: b.basePrice,
      posItemId: b.posItemId,
      available: b.available,
      updatedAt: b.updatedAt,
    }));

    const localModifiers: LocalModifier[] = modifiers.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      price: m.price,
      posModifierId: m.posModifierId,
      available: m.available,
      updatedAt: m.updatedAt,
    }));

    const localPresets: LocalItem[] = presets.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      posItemId: p.posItemId,
      available: p.available,
      updatedAt: p.updatedAt,
    }));

    const diff = calculateCatalogDiff(
      { bases: localBases, modifiers: localModifiers, presets: localPresets },
      business.lastSyncedAt
    );

    return {
      status: business.syncStatus,
      lastSyncedAt: business.lastSyncedAt,
      lastError: business.lastSyncError,
      pendingChanges: diff.totalChanges,
    };
  }

  /**
   * Get sync history for a business
   */
  async getSyncHistory(businessId: string, limit: number = 20): Promise<SyncHistory[]> {
    return this.prisma.syncHistory.findMany({
      where: { businessId },
      take: limit,
      orderBy: { startedAt: 'desc' },
    });
  }
}
