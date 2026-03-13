/**
 * Tests for Item Mappings API Routes
 * TDD Red Phase: Tests written before implementation
 */

import request from 'supertest';
import express, { Express } from 'express';
import { ItemType } from '../../../generated/prisma';

// Mock the ItemMappingService
jest.mock('../../services/ItemMappingService');

import { ItemMappingService, ItemMappingError } from '../../services/ItemMappingService';
import { createMappingsRouter } from '../mappings';

const MockItemMappingService = ItemMappingService as jest.MockedClass<typeof ItemMappingService>;

describe('Mappings Routes', () => {
  let app: Express;
  let mockService: jest.Mocked<ItemMappingService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock service instance
    mockService = {
      createMapping: jest.fn(),
      getMappings: jest.fn(),
      updateMapping: jest.fn(),
      deleteMapping: jest.fn(),
      getUnmappedItems: jest.fn(),
    } as unknown as jest.Mocked<ItemMappingService>;

    MockItemMappingService.mockImplementation(() => mockService);

    app = express();
    app.use(express.json());
    app.use('/api/mappings', createMappingsRouter(mockService));
  });

  // Helper to create valid mock mapping
  const createMockMapping = (overrides = {}) => ({
    id: 'map-1',
    businessId: 'biz-123',
    squareItemId: 'sq-item-1',
    squareVariationId: null,
    itemType: ItemType.BASE,
    category: null,
    displayName: null,
    displayOrder: 0,
    temperatureOptions: [],
    sizeOptions: [],
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  });

  // ===========================================
  // GET /api/mappings/:businessId
  // ===========================================
  describe('GET /api/mappings/:businessId', () => {
    it('returns 200 with all mappings for a business', async () => {
      const mockMappings = [
        createMockMapping({
          id: 'map-1',
          squareItemId: 'sq-item-1',
          itemType: ItemType.BASE,
          category: 'Coffee',
        }),
        createMockMapping({
          id: 'map-2',
          squareItemId: 'sq-item-2',
          itemType: ItemType.MODIFIER,
          displayName: 'Extra Shot',
          displayOrder: 1,
        }),
      ];
      mockService.getMappings.mockResolvedValue(mockMappings);

      const response = await request(app).get('/api/mappings/biz-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].squareItemId).toBe('sq-item-1');
      expect(mockService.getMappings).toHaveBeenCalledWith('biz-123');
    });

    it('returns 200 with empty array when no mappings exist', async () => {
      mockService.getMappings.mockResolvedValue([]);

      const response = await request(app).get('/api/mappings/biz-456');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  // ===========================================
  // POST /api/mappings
  // ===========================================
  describe('POST /api/mappings', () => {
    it('returns 201 when creating a new mapping', async () => {
      const mockMapping = createMockMapping({
        id: 'map-new',
        squareItemId: 'sq-item-new',
        itemType: ItemType.BASE,
        category: 'Coffee',
      });
      mockService.createMapping.mockResolvedValue(mockMapping);

      const response = await request(app)
        .post('/api/mappings')
        .send({
          businessId: 'biz-123',
          squareItemId: 'sq-item-new',
          itemType: 'BASE',
          category: 'Coffee',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('map-new');
      expect(mockService.createMapping).toHaveBeenCalledWith(
        'biz-123',
        'sq-item-new',
        'BASE',
        'Coffee'
      );
    });

    it('returns 201 when creating a mapping without optional category', async () => {
      const mockMapping = createMockMapping({
        id: 'map-new',
        squareItemId: 'sq-item-new',
        itemType: ItemType.MODIFIER,
      });
      mockService.createMapping.mockResolvedValue(mockMapping);

      const response = await request(app)
        .post('/api/mappings')
        .send({
          businessId: 'biz-123',
          squareItemId: 'sq-item-new',
          itemType: 'MODIFIER',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockService.createMapping).toHaveBeenCalledWith(
        'biz-123',
        'sq-item-new',
        'MODIFIER',
        undefined
      );
    });

    it('returns 400 when businessId is missing', async () => {
      const response = await request(app)
        .post('/api/mappings')
        .send({
          squareItemId: 'sq-item-new',
          itemType: 'BASE',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/businessId/i);
    });

    it('returns 400 when squareItemId is missing', async () => {
      const response = await request(app)
        .post('/api/mappings')
        .send({
          businessId: 'biz-123',
          itemType: 'BASE',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/squareItemId/i);
    });

    it('returns 400 when itemType is missing', async () => {
      const response = await request(app)
        .post('/api/mappings')
        .send({
          businessId: 'biz-123',
          squareItemId: 'sq-item-new',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/itemType/i);
    });

    it('returns 400 when itemType is invalid', async () => {
      const response = await request(app)
        .post('/api/mappings')
        .send({
          businessId: 'biz-123',
          squareItemId: 'sq-item-new',
          itemType: 'INVALID_TYPE',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/itemType/i);
    });

    it('returns 404 when business does not exist', async () => {
      mockService.createMapping.mockRejectedValue(
        new ItemMappingError('Business not found', 'BUSINESS_NOT_FOUND')
      );

      const response = await request(app)
        .post('/api/mappings')
        .send({
          businessId: 'non-existent',
          squareItemId: 'sq-item-new',
          itemType: 'BASE',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/not found/i);
    });

    it('returns 409 when mapping already exists', async () => {
      mockService.createMapping.mockRejectedValue(
        new ItemMappingError('Mapping already exists', 'DUPLICATE_MAPPING')
      );

      const response = await request(app)
        .post('/api/mappings')
        .send({
          businessId: 'biz-123',
          squareItemId: 'sq-item-existing',
          itemType: 'BASE',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/already exists/i);
    });
  });

  // ===========================================
  // PUT /api/mappings/:id
  // ===========================================
  describe('PUT /api/mappings/:id', () => {
    it('returns 200 when updating a mapping', async () => {
      const mockMapping = createMockMapping({
        id: 'map-1',
        itemType: ItemType.MODIFIER,
        category: 'Extras',
        displayName: 'Updated Name',
        displayOrder: 5,
      });
      mockService.updateMapping.mockResolvedValue(mockMapping);

      const response = await request(app)
        .put('/api/mappings/map-1')
        .send({
          itemType: 'MODIFIER',
          category: 'Extras',
          displayName: 'Updated Name',
          displayOrder: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.displayName).toBe('Updated Name');
      expect(mockService.updateMapping).toHaveBeenCalledWith('map-1', {
        itemType: 'MODIFIER',
        category: 'Extras',
        displayName: 'Updated Name',
        displayOrder: 5,
      });
    });

    it('returns 200 when updating only itemType', async () => {
      const mockMapping = createMockMapping({
        id: 'map-1',
        itemType: ItemType.BASE,
      });
      mockService.updateMapping.mockResolvedValue(mockMapping);

      const response = await request(app)
        .put('/api/mappings/map-1')
        .send({ itemType: 'BASE' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('returns 400 when request body is empty', async () => {
      const response = await request(app)
        .put('/api/mappings/map-1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/at least one field/i);
    });

    it('returns 400 when itemType is invalid', async () => {
      const response = await request(app)
        .put('/api/mappings/map-1')
        .send({ itemType: 'INVALID_TYPE' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/itemType/i);
    });

    it('returns 404 when mapping does not exist', async () => {
      mockService.updateMapping.mockRejectedValue(
        new ItemMappingError('Mapping not found', 'MAPPING_NOT_FOUND')
      );

      const response = await request(app)
        .put('/api/mappings/non-existent')
        .send({ category: 'New Category' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/not found/i);
    });
  });

  // ===========================================
  // DELETE /api/mappings/:id
  // ===========================================
  describe('DELETE /api/mappings/:id', () => {
    it('returns 200 when deleting a mapping', async () => {
      mockService.deleteMapping.mockResolvedValue(undefined);

      const response = await request(app).delete('/api/mappings/map-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockService.deleteMapping).toHaveBeenCalledWith('map-1');
    });

    it('returns 404 when mapping does not exist', async () => {
      mockService.deleteMapping.mockRejectedValue(
        new ItemMappingError('Mapping not found', 'MAPPING_NOT_FOUND')
      );

      const response = await request(app).delete('/api/mappings/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/not found/i);
    });
  });

  // ===========================================
  // POST /api/mappings/unmapped
  // ===========================================
  describe('POST /api/mappings/unmapped', () => {
    it('returns 200 with unmapped items', async () => {
      const squareItems = [
        { id: 'sq-1', name: 'Latte' },
        { id: 'sq-2', name: 'Cappuccino' },
        { id: 'sq-3', name: 'Espresso' },
      ];
      const unmappedItems = [
        { id: 'sq-2', name: 'Cappuccino' },
        { id: 'sq-3', name: 'Espresso' },
      ];
      mockService.getUnmappedItems.mockResolvedValue(unmappedItems);

      const response = await request(app)
        .post('/api/mappings/unmapped')
        .send({
          businessId: 'biz-123',
          squareItems,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].id).toBe('sq-2');
      expect(mockService.getUnmappedItems).toHaveBeenCalledWith('biz-123', squareItems);
    });

    it('returns 200 with empty array when all items are mapped', async () => {
      mockService.getUnmappedItems.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/mappings/unmapped')
        .send({
          businessId: 'biz-123',
          squareItems: [{ id: 'sq-1', name: 'Mapped Item' }],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('returns 200 with empty array when squareItems is empty', async () => {
      mockService.getUnmappedItems.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/mappings/unmapped')
        .send({
          businessId: 'biz-123',
          squareItems: [],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('returns 400 when businessId is missing', async () => {
      const response = await request(app)
        .post('/api/mappings/unmapped')
        .send({
          squareItems: [{ id: 'sq-1', name: 'Item' }],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/businessId/i);
    });

    it('returns 400 when squareItems is missing', async () => {
      const response = await request(app)
        .post('/api/mappings/unmapped')
        .send({
          businessId: 'biz-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/squareItems/i);
    });

    it('returns 400 when squareItems is not an array', async () => {
      const response = await request(app)
        .post('/api/mappings/unmapped')
        .send({
          businessId: 'biz-123',
          squareItems: 'not-an-array',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/squareItems.*array/i);
    });

    it('returns 400 when squareItems contains invalid items', async () => {
      const response = await request(app)
        .post('/api/mappings/unmapped')
        .send({
          businessId: 'biz-123',
          squareItems: [
            { id: 'sq-1', name: 'Valid Item' },
            { name: 'Missing ID' }, // Missing id
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/id.*name/i);
    });
  });

  // ===========================================
  // Response format consistency
  // ===========================================
  describe('Response format', () => {
    it('always includes success field on success', async () => {
      mockService.getMappings.mockResolvedValue([]);

      const response = await request(app).get('/api/mappings/biz-123');

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('always includes success and error fields on failure', async () => {
      const response = await request(app)
        .post('/api/mappings')
        .send({}); // Missing required fields

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
