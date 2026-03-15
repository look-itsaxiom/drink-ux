/**
 * Tests for Mapped Catalog API Routes
 */

import request from 'supertest';
import express, { Express } from 'express';
import { MappedCatalogService, MappedCatalogError } from '../../services/MappedCatalogService';
import { createMappedCatalogRouter } from '../catalog-mapped';

// Only mock the service class, not the error class
jest.mock('../../services/MappedCatalogService', () => {
  const actual = jest.requireActual('../../services/MappedCatalogService');
  return {
    ...actual,
    MappedCatalogService: jest.fn(),
  };
});

const MockMappedCatalogService = MappedCatalogService as jest.MockedClass<typeof MappedCatalogService>;

describe('Mapped Catalog Routes', () => {
  let app: Express;
  let mockService: jest.Mocked<MappedCatalogService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock service instance
    mockService = {
      getCatalog: jest.fn(),
      invalidateCache: jest.fn(),
    } as unknown as jest.Mocked<MappedCatalogService>;

    MockMappedCatalogService.mockImplementation(() => mockService);

    app = express();
    app.use(express.json());
    app.use('/api/catalog', createMappedCatalogRouter(mockService));
  });

  // Helper to create a valid mock catalog matching MappedCatalog interface
  const createMockCatalog = () => ({
    bases: [
      {
        squareItemId: 'sq-item-1',
        name: 'Latte',
        price: 450,
        category: 'Coffee',
        variations: [
          { variationId: 'var-1', name: 'Small', price: 400 },
          { variationId: 'var-2', name: 'Large', price: 500 },
        ],
        temperatures: ['hot', 'iced'],
        modifierGroupIds: ['mg-1', 'mg-2'],
      },
      {
        squareItemId: 'sq-item-2',
        name: 'Cappuccino',
        price: 450,
        category: 'Coffee',
        variations: [],
        temperatures: ['hot'],
        modifierGroupIds: ['mg-1'],
      },
    ],
    modifierGroups: [
      {
        id: 'mg-1',
        name: 'Milk Options',
        selectionMode: 'single' as const,
        minSelections: 0,
        maxSelections: 1,
        modifiers: [
          { squareModifierId: 'mod-1', name: 'Oat Milk', price: 75 },
          { squareModifierId: 'mod-2', name: 'Almond Milk', price: 75 },
        ],
      },
      {
        id: 'mg-2',
        name: 'Syrups',
        selectionMode: 'multi' as const,
        minSelections: 0,
        maxSelections: 5,
        modifiers: [
          { squareModifierId: 'mod-3', name: 'Vanilla', price: 50 },
        ],
      },
    ],
    presets: [],
  });

  // ===========================================
  // GET /api/catalog/:businessId/mapped
  // ===========================================
  describe('GET /api/catalog/:businessId/mapped', () => {
    it('returns 200 with full catalog structure', async () => {
      const mockCatalog = createMockCatalog();
      mockService.getCatalog.mockResolvedValue(mockCatalog);

      const response = await request(app).get('/api/catalog/biz-123/mapped');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCatalog);
      expect(response.body.data.bases).toHaveLength(2);
      expect(response.body.data.modifierGroups).toHaveLength(2);
      expect(mockService.getCatalog).toHaveBeenCalledWith('biz-123', { allowStale: true });
    });

    it('returns 200 with bases and modifierGroups correctly structured', async () => {
      const mockCatalog = createMockCatalog();
      mockService.getCatalog.mockResolvedValue(mockCatalog);

      const response = await request(app).get('/api/catalog/biz-123/mapped');

      expect(response.status).toBe(200);
      // Verify base structure
      const base = response.body.data.bases[0];
      expect(base).toHaveProperty('squareItemId');
      expect(base).toHaveProperty('name');
      expect(base).toHaveProperty('price');
      expect(base).toHaveProperty('category');
      expect(base).toHaveProperty('variations');
      expect(base).toHaveProperty('temperatures');

      // Verify modifier group structure
      const group = response.body.data.modifierGroups[0];
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('name');
      expect(group).toHaveProperty('modifiers');
      const mod = group.modifiers[0];
      expect(mod).toHaveProperty('squareModifierId');
      expect(mod).toHaveProperty('name');
      expect(mod).toHaveProperty('price');
    });

    it('returns 200 with empty catalog when no items exist', async () => {
      mockService.getCatalog.mockResolvedValue({
        bases: [],
        modifierGroups: [],
        presets: [],
      });

      const response = await request(app).get('/api/catalog/biz-empty/mapped');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bases).toEqual([]);
      expect(response.body.data.modifierGroups).toEqual([]);
    });

    it('returns 404 if business not found', async () => {
      mockService.getCatalog.mockRejectedValue(
        new MappedCatalogError('BUSINESS_NOT_FOUND', 'Business not-found-biz not found')
      );

      const response = await request(app).get('/api/catalog/not-found-biz/mapped');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/not found/i);
    });

    it('returns 503 if Square API fails', async () => {
      mockService.getCatalog.mockRejectedValue(
        new MappedCatalogError('SQUARE_API_ERROR', 'Square API error: Connection timeout')
      );

      const response = await request(app).get('/api/catalog/biz-123/mapped');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/unavailable/i);
    });

    it('returns 503 with appropriate error message when Square is unavailable', async () => {
      mockService.getCatalog.mockRejectedValue(
        new MappedCatalogError('SQUARE_API_ERROR', 'Square API error: Service unavailable')
      );

      const response = await request(app).get('/api/catalog/biz-123/mapped');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Catalog temporarily unavailable');
    });

    it('returns 424 if business has no POS credentials', async () => {
      mockService.getCatalog.mockRejectedValue(
        new MappedCatalogError('NO_POS_CREDENTIALS', 'Business has no POS credentials')
      );

      const response = await request(app).get('/api/catalog/biz-no-creds/mapped');

      expect(response.status).toBe(424);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/credentials/i);
    });
  });

  // ===========================================
  // Response format consistency
  // ===========================================
  describe('Response format', () => {
    it('always includes success field on success', async () => {
      mockService.getCatalog.mockResolvedValue(createMockCatalog());

      const response = await request(app).get('/api/catalog/biz-123/mapped');

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('always includes success and error fields on failure', async () => {
      mockService.getCatalog.mockRejectedValue(
        new MappedCatalogError('BUSINESS_NOT_FOUND', 'Business not found')
      );

      const response = await request(app).get('/api/catalog/bad-biz/mapped');

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
