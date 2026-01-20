import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemperatureConstraint } from '@drink-ux/shared';
import {
  getCatalog,
  getFullCatalog,
  CatalogData,
  FullCatalogData,
  CategoryWithItems,
  CatalogItem,
  ModifierData,
  PresetData,
} from '../catalogService';
import { ApiClientError } from '../api';
import { createMockResponse, createMockErrorResponse } from '../../test/setup';

describe('catalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCategory: CategoryWithItems = {
    id: 'cat-1',
    name: 'Coffee',
    displayOrder: 1,
    color: '#8B4513',
    icon: 'cafe',
    items: [
      {
        id: 'base-1',
        name: 'Latte',
        basePrice: 4.5,
        temperatureConstraint: TemperatureConstraint.BOTH,
        visualColor: '#C4A484',
      },
      {
        id: 'base-2',
        name: 'Americano',
        basePrice: 3.5,
        temperatureConstraint: TemperatureConstraint.BOTH,
        visualColor: '#3C2A21',
      },
    ],
  };

  const mockCatalogData: CatalogData = {
    businessId: 'biz-123',
    categories: [
      mockCategory,
      {
        id: 'cat-2',
        name: 'Tea',
        displayOrder: 2,
        color: '#2E7D32',
        icon: 'leaf',
        items: [
          {
            id: 'base-3',
            name: 'Green Tea',
            basePrice: 3.0,
            temperatureConstraint: TemperatureConstraint.BOTH,
            visualColor: '#90EE90',
          },
        ],
      },
    ],
  };

  describe('getCatalog', () => {
    it('should fetch catalog data successfully', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await getCatalog('test-coffee-shop');

      expect(result).toEqual(mockCatalogData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/business/test-coffee-shop/catalog'),
        expect.any(Object)
      );
    });

    it('should throw ApiClientError when business not found', async () => {
      const mockError = createMockErrorResponse(
        'BUSINESS_NOT_FOUND',
        "Business 'invalid-slug' not found",
        404
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      await expect(getCatalog('invalid-slug')).rejects.toThrow(ApiClientError);

      try {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          createMockErrorResponse('BUSINESS_NOT_FOUND', 'Not found', 404)
        );
        await getCatalog('invalid-slug');
      } catch (error) {
        expect((error as ApiClientError).code).toBe('BUSINESS_NOT_FOUND');
        expect((error as ApiClientError).status).toBe(404);
      }
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(getCatalog('test-coffee-shop')).rejects.toThrow(
        ApiClientError
      );

      try {
        vi.mocked(global.fetch).mockRejectedValueOnce(
          new TypeError('Failed to fetch')
        );
        await getCatalog('test-coffee-shop');
      } catch (error) {
        expect((error as ApiClientError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should handle server errors', async () => {
      const mockError = createMockErrorResponse(
        'INTERNAL_ERROR',
        'Server error',
        500
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      await expect(getCatalog('test-coffee-shop')).rejects.toThrow(
        ApiClientError
      );
    });

    it('should return empty categories array for business with no catalog', async () => {
      const emptyData: CatalogData = {
        businessId: 'biz-123',
        categories: [],
      };
      const mockResponse = createMockResponse({
        success: true,
        data: emptyData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await getCatalog('new-business');

      expect(result.categories).toEqual([]);
      expect(result.businessId).toBe('biz-123');
    });
  });

  describe('getFullCatalog', () => {
    const mockModifiers: ModifierData[] = [
      {
        id: 'mod-1',
        name: 'Whole Milk',
        type: 'MILK',
        price: 0,
        available: true,
        visualColor: '#FFFFFF',
      },
      {
        id: 'mod-2',
        name: 'Vanilla Syrup',
        type: 'SYRUP',
        price: 0.5,
        available: true,
        visualColor: '#F5DEB3',
      },
    ];

    const mockPresets: PresetData[] = [
      {
        id: 'preset-1',
        name: 'Classic Latte',
        baseId: 'base-1',
        defaultSize: 'MEDIUM',
        defaultHot: true,
        price: 5.0,
        available: true,
        imageUrl: 'https://example.com/latte.jpg',
        modifierIds: ['mod-1'],
      },
    ];

    const mockFullCatalog: FullCatalogData = {
      ...mockCatalogData,
      modifiers: mockModifiers,
      presets: mockPresets,
    };

    it('should fetch full catalog with modifiers and presets', async () => {
      // First call for basic catalog
      const catalogResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });

      // Second call for modifiers
      const modifiersResponse = createMockResponse({
        success: true,
        data: mockModifiers,
      });

      // Third call for presets
      const presetsResponse = createMockResponse({
        success: true,
        data: mockPresets,
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(catalogResponse)
        .mockResolvedValueOnce(modifiersResponse)
        .mockResolvedValueOnce(presetsResponse);

      const result = await getFullCatalog('test-coffee-shop');

      expect(result.categories).toEqual(mockCatalogData.categories);
      expect(result.modifiers).toEqual(mockModifiers);
      expect(result.presets).toEqual(mockPresets);
    });

    it('should handle partial catalog fetch failure gracefully', async () => {
      // Catalog succeeds
      const catalogResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });

      // Modifiers fail
      const modifiersError = createMockErrorResponse(
        'INTERNAL_ERROR',
        'Failed to fetch modifiers',
        500
      );

      // Presets succeed
      const presetsResponse = createMockResponse({
        success: true,
        data: mockPresets,
      });

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(catalogResponse)
        .mockResolvedValueOnce(modifiersError)
        .mockResolvedValueOnce(presetsResponse);

      // Should still return what we could fetch, or throw depending on implementation
      // For now, we expect it to throw on any failure
      await expect(getFullCatalog('test-coffee-shop')).rejects.toThrow();
    });
  });
});
