import { PrismaClient, SyncStatus } from '../../../generated/prisma';
import { MockPOSAdapter } from '../../adapters/pos/MockPOSAdapter';
import { CatalogSyncService, SyncResult } from '../CatalogSyncService';

// Mock Prisma client
const mockPrisma = {
  business: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  base: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  modifier: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  preset: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  syncHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
} as unknown as PrismaClient;

describe('CatalogSyncService', () => {
  let service: CatalogSyncService;
  let mockAdapter: MockPOSAdapter;
  const businessId = 'test-business-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = new MockPOSAdapter();
    service = new CatalogSyncService(mockPrisma, mockAdapter);

    // Default mock responses
    mockPrisma.business.findUnique = jest.fn().mockResolvedValue({
      id: businessId,
      name: 'Test Business',
      syncStatus: SyncStatus.IDLE,
      lastSyncedAt: null,
      posAccessToken: 'encrypted-token',
      posRefreshToken: 'encrypted-refresh',
      posMerchantId: 'merchant-123',
    });
    mockPrisma.business.update = jest.fn().mockImplementation((args) =>
      Promise.resolve({ id: businessId, ...args.data })
    );
    mockPrisma.base.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.modifier.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.preset.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.syncHistory.create = jest.fn().mockResolvedValue({ id: 'history-1' });
    mockPrisma.syncHistory.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.syncHistory.update = jest.fn().mockResolvedValue({ id: 'history-1' });
  });

  // Happy path tests
  describe('happy path', () => {
    it('successfully syncs a catalog with no changes', async () => {
      const result = await service.sync(businessId);

      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(0);
      expect(result.itemsUpdated).toBe(0);
      expect(result.itemsDeactivated).toBe(0);
      expect(result.modifiersCreated).toBe(0);
    });

    it('creates new items in POS and stores posItemId', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        {
          id: 'base-1',
          name: 'Espresso',
          basePrice: 3.5,
          posItemId: null,
          available: true,
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.base.update = jest.fn().mockResolvedValue({ id: 'base-1' });
      mockAdapter.setPushItemResponse('pos-item-new-123');

      const result = await service.sync(businessId);

      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(1);
      expect(mockAdapter.getCalls('pushItem')).toHaveLength(1);
      expect(mockPrisma.base.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'base-1' },
          data: { posItemId: 'pos-item-new-123' },
        })
      );
    });

    it('creates new modifiers in POS and stores posModifierId', async () => {
      mockPrisma.modifier.findMany = jest.fn().mockResolvedValue([
        {
          id: 'mod-1',
          name: 'Oat Milk',
          type: 'MILK',
          price: 0.7,
          posModifierId: null,
          available: true,
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.modifier.update = jest.fn().mockResolvedValue({ id: 'mod-1' });
      mockAdapter.setPushModifierResponse('pos-mod-new-456');

      const result = await service.sync(businessId);

      expect(result.success).toBe(true);
      expect(result.modifiersCreated).toBe(1);
      expect(mockAdapter.getCalls('pushModifier')).toHaveLength(1);
      expect(mockPrisma.modifier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mod-1' },
          data: { posModifierId: 'pos-mod-new-456' },
        })
      );
    });

    it('updates lastSyncedAt on successful sync', async () => {
      await service.sync(businessId);

      expect(mockPrisma.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            syncStatus: SyncStatus.SUCCESS,
            lastSyncedAt: expect.any(Date),
            lastSyncError: null,
          }),
        })
      );
    });

    it('creates sync history record', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        {
          id: 'base-1',
          name: 'Espresso',
          basePrice: 3.5,
          posItemId: null,
          available: true,
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.base.update = jest.fn().mockResolvedValue({ id: 'base-1' });

      await service.sync(businessId);

      expect(mockPrisma.syncHistory.create).toHaveBeenCalled();
      expect(mockPrisma.syncHistory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SyncStatus.SUCCESS,
            itemsCreated: 1,
            completedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  // Success scenarios - various catalog states
  describe('success scenarios', () => {
    it('handles catalog with multiple new items', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: 'Item 1', basePrice: 3.0, posItemId: null, available: true, updatedAt: new Date() },
        { id: 'base-2', name: 'Item 2', basePrice: 4.0, posItemId: null, available: true, updatedAt: new Date() },
      ]);
      mockPrisma.base.update = jest.fn().mockResolvedValue({});
      let callCount = 0;
      mockAdapter.setPushItemResponse = jest.fn();
      // Use different IDs for each call
      jest.spyOn(mockAdapter, 'pushItem').mockImplementation(async () => {
        callCount++;
        return `pos-item-${callCount}`;
      });

      const result = await service.sync(businessId);

      expect(result.itemsCreated).toBe(2);
      expect(mockPrisma.base.update).toHaveBeenCalledTimes(2);
    });

    it('updates existing items that were modified since last sync', async () => {
      mockPrisma.business.findUnique = jest.fn().mockResolvedValue({
        id: businessId,
        syncStatus: SyncStatus.IDLE,
        lastSyncedAt: new Date('2024-01-01'),
        posAccessToken: 'token',
        posRefreshToken: 'refresh',
        posMerchantId: 'merchant-123',
      });
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        {
          id: 'base-1',
          name: 'Updated Item',
          basePrice: 4.5,
          posItemId: 'existing-pos-123',
          available: true,
          updatedAt: new Date('2024-01-02'), // After last sync
        },
      ]);

      const result = await service.sync(businessId);

      expect(result.success).toBe(true);
      expect(result.itemsUpdated).toBe(1);
      expect(mockAdapter.getCalls('updateItem')).toHaveLength(1);
      expect(mockAdapter.wasCalledWith('updateItem', 'existing-pos-123')).toBe(true);
    });

    it('deactivates items marked as unavailable (non-destructive)', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        {
          id: 'base-1',
          name: 'Discontinued Item',
          basePrice: 3.5,
          posItemId: 'existing-pos-456',
          available: false, // Deactivated
          updatedAt: new Date(),
        },
      ]);

      const result = await service.sync(businessId);

      expect(result.success).toBe(true);
      expect(result.itemsDeactivated).toBe(1);
      // Should call updateItem to mark as inactive, NOT delete
      expect(mockAdapter.getCalls('updateItem')).toHaveLength(1);
    });

    it('handles mixed operations in single sync', async () => {
      mockPrisma.business.findUnique = jest.fn().mockResolvedValue({
        id: businessId,
        syncStatus: SyncStatus.IDLE,
        lastSyncedAt: new Date('2024-01-01'),
        posAccessToken: 'token',
        posRefreshToken: 'refresh',
        posMerchantId: 'merchant-123',
      });
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-new', name: 'New', basePrice: 3.0, posItemId: null, available: true, updatedAt: new Date() },
        { id: 'base-upd', name: 'Updated', basePrice: 4.0, posItemId: 'pos-1', available: true, updatedAt: new Date('2024-01-02') },
        { id: 'base-deact', name: 'Deactivated', basePrice: 3.5, posItemId: 'pos-2', available: false, updatedAt: new Date() },
      ]);
      mockPrisma.modifier.findMany = jest.fn().mockResolvedValue([
        { id: 'mod-new', name: 'New Mod', type: 'SYRUP', price: 0.5, posModifierId: null, available: true, updatedAt: new Date() },
      ]);
      mockPrisma.base.update = jest.fn().mockResolvedValue({});
      mockPrisma.modifier.update = jest.fn().mockResolvedValue({});

      const result = await service.sync(businessId);

      expect(result.itemsCreated).toBe(1);
      expect(result.itemsUpdated).toBe(1);
      expect(result.itemsDeactivated).toBe(1);
      expect(result.modifiersCreated).toBe(1);
    });

    it('syncs presets alongside bases', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.preset.findMany = jest.fn().mockResolvedValue([
        {
          id: 'preset-1',
          name: 'Vanilla Latte',
          price: 5.5,
          posItemId: null,
          available: true,
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.preset.update = jest.fn().mockResolvedValue({});

      const result = await service.sync(businessId);

      expect(result.itemsCreated).toBe(1);
      expect(mockPrisma.preset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'preset-1' },
        })
      );
    });
  });

  // Failure scenarios - expected failures
  describe('failure scenarios', () => {
    it('fails when business not found', async () => {
      mockPrisma.business.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.sync(businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('fails when business has no POS connection', async () => {
      mockPrisma.business.findUnique = jest.fn().mockResolvedValue({
        id: businessId,
        syncStatus: SyncStatus.IDLE,
        posAccessToken: null,
        posRefreshToken: null,
        posMerchantId: null,
      });

      const result = await service.sync(businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('POS');
    });

    it('fails when sync is already in progress', async () => {
      mockPrisma.business.findUnique = jest.fn().mockResolvedValue({
        id: businessId,
        syncStatus: SyncStatus.SYNCING, // Already syncing
        posAccessToken: 'token',
        posRefreshToken: 'refresh',
        posMerchantId: 'merchant-123',
      });

      const result = await service.sync(businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('progress');
    });

    it('handles POS adapter push item failure', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: 'Item', basePrice: 3.0, posItemId: null, available: true, updatedAt: new Date() },
      ]);
      mockAdapter.setError('pushItem', new Error('POS API rate limit exceeded'));

      const result = await service.sync(businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('handles POS adapter update item failure', async () => {
      mockPrisma.business.findUnique = jest.fn().mockResolvedValue({
        id: businessId,
        syncStatus: SyncStatus.IDLE,
        lastSyncedAt: new Date('2024-01-01'),
        posAccessToken: 'token',
        posRefreshToken: 'refresh',
        posMerchantId: 'merchant-123',
      });
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: 'Item', basePrice: 3.0, posItemId: 'pos-123', available: true, updatedAt: new Date() },
      ]);
      mockAdapter.setError('updateItem', new Error('Item not found in POS'));

      const result = await service.sync(businessId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('records error in sync history on failure', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: 'Item', basePrice: 3.0, posItemId: null, available: true, updatedAt: new Date() },
      ]);
      mockAdapter.setError('pushItem', new Error('API Error'));

      await service.sync(businessId);

      expect(mockPrisma.syncHistory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SyncStatus.ERROR,
            errorMessage: expect.stringContaining('API Error'),
          }),
        })
      );
    });

    it('updates business sync status to ERROR on failure', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: 'Item', basePrice: 3.0, posItemId: null, available: true, updatedAt: new Date() },
      ]);
      mockAdapter.setError('pushItem', new Error('Network Error'));

      await service.sync(businessId);

      expect(mockPrisma.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            syncStatus: SyncStatus.ERROR,
            lastSyncError: expect.stringContaining('Network Error'),
          }),
        })
      );
    });
  });

  // Error scenarios - unexpected errors
  describe('error scenarios', () => {
    it('handles database errors gracefully', async () => {
      mockPrisma.base.findMany = jest.fn().mockRejectedValue(new Error('Database connection lost'));

      const result = await service.sync(businessId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles unexpected adapter exceptions', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: 'Item', basePrice: 3.0, posItemId: null, available: true, updatedAt: new Date() },
      ]);
      jest.spyOn(mockAdapter, 'pushItem').mockRejectedValue(new Error('Unexpected internal error'));

      const result = await service.sync(businessId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('cleans up sync status even when errors occur', async () => {
      mockPrisma.base.findMany = jest.fn().mockRejectedValue(new Error('Error'));

      await service.sync(businessId);

      // Should still update business status to ERROR, not leave in SYNCING
      expect(mockPrisma.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            syncStatus: SyncStatus.ERROR,
          }),
        })
      );
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles empty strings in item names', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: '', basePrice: 3.0, posItemId: null, available: true, updatedAt: new Date() },
      ]);
      mockPrisma.base.update = jest.fn().mockResolvedValue({});

      const result = await service.sync(businessId);

      // Should still attempt to sync - validation is POS's job
      expect(mockAdapter.getCalls('pushItem')).toHaveLength(1);
    });

    it('handles zero price items', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: 'Free Item', basePrice: 0, posItemId: null, available: true, updatedAt: new Date() },
      ]);
      mockPrisma.base.update = jest.fn().mockResolvedValue({});

      const result = await service.sync(businessId);

      expect(result.success).toBe(true);
      expect(result.itemsCreated).toBe(1);
    });

    it('converts prices to cents for POS', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: 'Latte', basePrice: 4.5, posItemId: null, available: true, updatedAt: new Date() },
      ]);
      mockPrisma.base.update = jest.fn().mockResolvedValue({});

      await service.sync(businessId);

      const calls = mockAdapter.getCalls('pushItem');
      expect(calls).toHaveLength(1);
      // Price should be in cents (450) for POS
      expect((calls[0][0] as { price: number }).price).toBe(450);
    });
  });

  // Get sync status
  describe('getSyncStatus', () => {
    it('returns pending changes count', async () => {
      mockPrisma.base.findMany = jest.fn().mockResolvedValue([
        { id: 'base-1', name: 'New Item', basePrice: 3.0, posItemId: null, available: true, updatedAt: new Date() },
        { id: 'base-2', name: 'Updated', basePrice: 4.0, posItemId: 'pos-1', available: true, updatedAt: new Date() },
      ]);
      mockPrisma.modifier.findMany = jest.fn().mockResolvedValue([
        { id: 'mod-1', name: 'New Mod', type: 'SYRUP', price: 0.5, posModifierId: null, available: true, updatedAt: new Date() },
      ]);

      const status = await service.getSyncStatus(businessId);

      expect(status).not.toBeNull();
      expect(status!.pendingChanges).toBe(3); // 1 new item + 1 updated item + 1 new modifier
    });

    it('returns current sync status', async () => {
      mockPrisma.business.findUnique = jest.fn().mockResolvedValue({
        id: businessId,
        syncStatus: SyncStatus.SUCCESS,
        lastSyncedAt: new Date('2024-01-15'),
        lastSyncError: null,
        posAccessToken: 'token',
        posRefreshToken: 'refresh',
        posMerchantId: 'merchant',
      });

      const status = await service.getSyncStatus(businessId);

      expect(status).not.toBeNull();
      expect(status!.status).toBe(SyncStatus.SUCCESS);
      expect(status!.lastSyncedAt).toEqual(new Date('2024-01-15'));
      expect(status!.lastError).toBeNull();
    });

    it('returns null for non-existent business', async () => {
      mockPrisma.business.findUnique = jest.fn().mockResolvedValue(null);

      const status = await service.getSyncStatus(businessId);

      expect(status).toBeNull();
    });
  });

  // Get sync history
  describe('getSyncHistory', () => {
    it('returns recent sync history records', async () => {
      const mockHistory = [
        { id: 'h1', status: SyncStatus.SUCCESS, startedAt: new Date(), completedAt: new Date(), itemsCreated: 5 },
        { id: 'h2', status: SyncStatus.ERROR, startedAt: new Date(), completedAt: new Date(), errorMessage: 'Failed' },
      ];
      mockPrisma.syncHistory.findMany = jest.fn().mockResolvedValue(mockHistory);

      const history = await service.getSyncHistory(businessId, 10);

      expect(history).toHaveLength(2);
      expect(mockPrisma.syncHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId },
          take: 10,
          orderBy: { startedAt: 'desc' },
        })
      );
    });

    it('defaults to 20 records', async () => {
      mockPrisma.syncHistory.findMany = jest.fn().mockResolvedValue([]);

      await service.getSyncHistory(businessId);

      expect(mockPrisma.syncHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });
  });
});
