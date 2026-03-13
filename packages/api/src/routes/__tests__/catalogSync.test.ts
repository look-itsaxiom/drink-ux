import request from 'supertest';
import express, { Express } from 'express';
import { catalogSyncRouter } from '../catalogSync';
import { CatalogSyncService, SyncResult, SyncStatusResponse } from '../../services/CatalogSyncService';
import { SyncStatus, POSProvider } from '../../../generated/prisma';

// Mock dependencies
jest.mock('../../database', () => ({
  __esModule: true,
  default: {
    business: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../adapters/pos', () => ({
  getAdapter: jest.fn(),
  POSAdapter: {},
}));

jest.mock('../../services/CatalogSyncService');

import prisma from '../../database';
import { getAdapter } from '../../adapters/pos';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetAdapter = getAdapter as jest.Mock;
const MockCatalogSyncService = CatalogSyncService as jest.MockedClass<typeof CatalogSyncService>;

describe('Catalog Sync Routes', () => {
  let app: Express;
  let mockService: jest.Mocked<CatalogSyncService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock service instance
    mockService = {
      sync: jest.fn(),
      getSyncStatus: jest.fn(),
      getSyncHistory: jest.fn(),
    } as unknown as jest.Mocked<CatalogSyncService>;

    // Make the constructor return our mock instance
    MockCatalogSyncService.mockImplementation(() => mockService);

    // Default mock for getAdapter
    mockGetAdapter.mockReturnValue({});

    // Default mock for prisma business lookups
    (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
      id: 'biz-123',
      posProvider: POSProvider.SQUARE,
    });

    app = express();
    app.use(express.json());
    app.use('/api/catalog/sync', catalogSyncRouter);
  });

  // Happy path tests
  describe('happy path', () => {
    describe('GET /api/catalog/sync/status', () => {
      it('returns sync status with pending changes count', async () => {
        const mockStatus: SyncStatusResponse = {
          status: SyncStatus.IDLE,
          lastSyncedAt: new Date('2024-01-15T10:00:00Z'),
          lastError: null,
          pendingChanges: 5,
        };
        mockService.getSyncStatus.mockResolvedValue(mockStatus);

        const response = await request(app)
          .get('/api/catalog/sync/status')
          .query({ businessId: 'biz-123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('IDLE');
        expect(response.body.data.pendingChanges).toBe(5);
        expect(response.body.data.lastSyncedAt).toBe('2024-01-15T10:00:00.000Z');
      });

      it('returns status showing sync in progress', async () => {
        const mockStatus: SyncStatusResponse = {
          status: SyncStatus.SYNCING,
          lastSyncedAt: null,
          lastError: null,
          pendingChanges: 3,
        };
        mockService.getSyncStatus.mockResolvedValue(mockStatus);

        const response = await request(app)
          .get('/api/catalog/sync/status')
          .query({ businessId: 'biz-123' });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('SYNCING');
      });

      it('returns status with last error', async () => {
        const mockStatus: SyncStatusResponse = {
          status: SyncStatus.ERROR,
          lastSyncedAt: new Date('2024-01-14T10:00:00Z'),
          lastError: 'POS API rate limit exceeded',
          pendingChanges: 10,
        };
        mockService.getSyncStatus.mockResolvedValue(mockStatus);

        const response = await request(app)
          .get('/api/catalog/sync/status')
          .query({ businessId: 'biz-123' });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('ERROR');
        expect(response.body.data.lastError).toBe('POS API rate limit exceeded');
      });
    });

    describe('POST /api/catalog/sync', () => {
      it('triggers sync and returns success result', async () => {
        const mockResult: SyncResult = {
          success: true,
          itemsCreated: 3,
          itemsUpdated: 2,
          itemsDeactivated: 1,
          modifiersCreated: 2,
          modifiersUpdated: 0,
          syncHistoryId: 'history-123',
        };
        mockService.sync.mockResolvedValue(mockResult);

        const response = await request(app)
          .post('/api/catalog/sync')
          .send({ businessId: 'biz-123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.itemsCreated).toBe(3);
        expect(response.body.data.itemsUpdated).toBe(2);
        expect(response.body.data.itemsDeactivated).toBe(1);
        expect(response.body.data.modifiersCreated).toBe(2);
      });

      it('calls service with correct businessId', async () => {
        (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
          id: 'specific-biz-456',
          posProvider: POSProvider.SQUARE,
        });
        mockService.sync.mockResolvedValue({
          success: true,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsDeactivated: 0,
          modifiersCreated: 0,
          modifiersUpdated: 0,
        });

        await request(app)
          .post('/api/catalog/sync')
          .send({ businessId: 'specific-biz-456' });

        expect(mockService.sync).toHaveBeenCalledWith('specific-biz-456');
      });
    });

    describe('GET /api/catalog/sync/history', () => {
      it('returns sync history records', async () => {
        const mockHistory = [
          {
            id: 'h1',
            businessId: 'biz-123',
            status: SyncStatus.SUCCESS,
            startedAt: new Date('2024-01-15T10:00:00Z'),
            completedAt: new Date('2024-01-15T10:00:30Z'),
            itemsCreated: 5,
            itemsUpdated: 2,
            itemsDeactivated: 0,
            modifiersCreated: 3,
            modifiersUpdated: 0,
            errorMessage: null,
            errorDetails: null,
          },
          {
            id: 'h2',
            businessId: 'biz-123',
            status: SyncStatus.ERROR,
            startedAt: new Date('2024-01-14T10:00:00Z'),
            completedAt: new Date('2024-01-14T10:00:05Z'),
            itemsCreated: 0,
            itemsUpdated: 0,
            itemsDeactivated: 0,
            modifiersCreated: 0,
            modifiersUpdated: 0,
            errorMessage: 'Network error',
            errorDetails: null,
          },
        ];
        mockService.getSyncHistory.mockResolvedValue(mockHistory);

        const response = await request(app)
          .get('/api/catalog/sync/history')
          .query({ businessId: 'biz-123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.history).toHaveLength(2);
        expect(response.body.data.history[0].status).toBe('SUCCESS');
        expect(response.body.data.history[1].status).toBe('ERROR');
      });

      it('accepts limit parameter', async () => {
        mockService.getSyncHistory.mockResolvedValue([]);

        await request(app)
          .get('/api/catalog/sync/history')
          .query({ businessId: 'biz-123', limit: '5' });

        expect(mockService.getSyncHistory).toHaveBeenCalledWith('biz-123', 5);
      });

      it('defaults to 20 records without limit', async () => {
        mockService.getSyncHistory.mockResolvedValue([]);

        await request(app)
          .get('/api/catalog/sync/history')
          .query({ businessId: 'biz-123' });

        expect(mockService.getSyncHistory).toHaveBeenCalledWith('biz-123', 20);
      });
    });
  });

  // Failure scenarios
  describe('failure scenarios', () => {
    describe('GET /api/catalog/sync/status', () => {
      it('returns 400 when businessId is missing', async () => {
        const response = await request(app)
          .get('/api/catalog/sync/status');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_BUSINESS_ID');
      });

      it('returns 404 when business not found', async () => {
        mockService.getSyncStatus.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/catalog/sync/status')
          .query({ businessId: 'nonexistent' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('BUSINESS_NOT_FOUND');
      });
    });

    describe('POST /api/catalog/sync', () => {
      it('returns 400 when businessId is missing', async () => {
        const response = await request(app)
          .post('/api/catalog/sync')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_BUSINESS_ID');
      });

      it('returns 409 when sync already in progress', async () => {
        mockService.sync.mockResolvedValue({
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsDeactivated: 0,
          modifiersCreated: 0,
          modifiersUpdated: 0,
          error: 'Sync already in progress',
        });

        const response = await request(app)
          .post('/api/catalog/sync')
          .send({ businessId: 'biz-123' });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SYNC_IN_PROGRESS');
      });

      it('returns 404 when business not found', async () => {
        (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .post('/api/catalog/sync')
          .send({ businessId: 'biz-123' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('BUSINESS_NOT_FOUND');
      });

      it('returns 400 when no POS connection', async () => {
        (mockPrisma.business.findUnique as jest.Mock).mockResolvedValue({
          id: 'biz-123',
          posProvider: null, // No POS provider
        });

        const response = await request(app)
          .post('/api/catalog/sync')
          .send({ businessId: 'biz-123' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NO_POS_CONNECTION');
      });

      it('returns 502 when POS API fails', async () => {
        mockService.sync.mockResolvedValue({
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsDeactivated: 0,
          modifiersCreated: 0,
          modifiersUpdated: 0,
          error: 'POS API rate limit exceeded',
        });

        const response = await request(app)
          .post('/api/catalog/sync')
          .send({ businessId: 'biz-123' });

        expect(response.status).toBe(502);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SYNC_FAILED');
      });
    });

    describe('GET /api/catalog/sync/history', () => {
      it('returns 400 when businessId is missing', async () => {
        const response = await request(app)
          .get('/api/catalog/sync/history');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_BUSINESS_ID');
      });

      it('handles invalid limit parameter', async () => {
        mockService.getSyncHistory.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/catalog/sync/history')
          .query({ businessId: 'biz-123', limit: 'invalid' });

        // Should use default limit
        expect(response.status).toBe(200);
        expect(mockService.getSyncHistory).toHaveBeenCalledWith('biz-123', 20);
      });
    });
  });

  // Error scenarios - unexpected server errors
  describe('error scenarios', () => {
    it('returns 500 on unexpected service error for status', async () => {
      mockService.getSyncStatus.mockRejectedValue(new Error('Database connection lost'));

      const response = await request(app)
        .get('/api/catalog/sync/status')
        .query({ businessId: 'biz-123' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('returns 500 on unexpected service error for sync', async () => {
      mockService.sync.mockRejectedValue(new Error('Unexpected failure'));

      const response = await request(app)
        .post('/api/catalog/sync')
        .send({ businessId: 'biz-123' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('returns 500 on unexpected service error for history', async () => {
      mockService.getSyncHistory.mockRejectedValue(new Error('Unexpected failure'));

      const response = await request(app)
        .get('/api/catalog/sync/history')
        .query({ businessId: 'biz-123' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles sync with zero changes', async () => {
      mockService.sync.mockResolvedValue({
        success: true,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsDeactivated: 0,
        modifiersCreated: 0,
        modifiersUpdated: 0,
      });

      const response = await request(app)
        .post('/api/catalog/sync')
        .send({ businessId: 'biz-123' });

      expect(response.status).toBe(200);
      expect(response.body.data.itemsCreated).toBe(0);
    });

    it('handles status with null lastSyncedAt', async () => {
      mockService.getSyncStatus.mockResolvedValue({
        status: SyncStatus.IDLE,
        lastSyncedAt: null,
        lastError: null,
        pendingChanges: 10,
      });

      const response = await request(app)
        .get('/api/catalog/sync/status')
        .query({ businessId: 'biz-123' });

      expect(response.status).toBe(200);
      expect(response.body.data.lastSyncedAt).toBeNull();
    });

    it('handles empty sync history', async () => {
      mockService.getSyncHistory.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/catalog/sync/history')
        .query({ businessId: 'biz-123' });

      expect(response.status).toBe(200);
      expect(response.body.data.history).toEqual([]);
    });

    it('limits max history records to 100', async () => {
      mockService.getSyncHistory.mockResolvedValue([]);

      await request(app)
        .get('/api/catalog/sync/history')
        .query({ businessId: 'biz-123', limit: '500' });

      expect(mockService.getSyncHistory).toHaveBeenCalledWith('biz-123', 100);
    });
  });
});
