import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { TemperatureConstraint } from '@drink-ux/shared';
import { useCatalog } from '../useCatalog';
import { CatalogData, CategoryWithItems } from '../../services/catalogService';
import { createMockResponse, createMockErrorResponse } from '../../test/setup';

describe('useCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.assign(window.location, {
      hostname: 'localhost',
      search: '',
    });
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

  describe('initial state', () => {
    it('should start with loading true when business slug is provided', () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() =>
        useCatalog({ businessSlug: 'test-coffee-shop' })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.catalog).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when no business slug is provided', () => {
      const { result } = renderHook(() => useCatalog({}));

      expect(result.current.loading).toBe(false);
      expect(result.current.catalog).toBeNull();
      // No error since it's just waiting for a slug
    });
  });

  describe('successful fetch', () => {
    it('should fetch and return catalog data', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useCatalog({ businessSlug: 'test-coffee-shop' })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.catalog).toEqual(mockCatalogData);
      expect(result.current.error).toBeNull();
    });

    it('should provide categories array', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useCatalog({ businessSlug: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.categories).toHaveLength(2);
      expect(result.current.categories[0].name).toBe('Coffee');
      expect(result.current.categories[1].name).toBe('Tea');
    });
  });

  describe('error handling', () => {
    it('should handle business not found error', async () => {
      const mockError = createMockErrorResponse(
        'BUSINESS_NOT_FOUND',
        "Business 'invalid-slug' not found",
        404
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      const { result } = renderHook(() =>
        useCatalog({ businessSlug: 'invalid-slug' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.catalog).toBeNull();
      expect(result.current.error).toBe("Business 'invalid-slug' not found");
    });

    it('should handle network error', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const { result } = renderHook(() =>
        useCatalog({ businessSlug: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.catalog).toBeNull();
      expect(result.current.error).toBe('Unable to connect to server');
    });
  });

  describe('getItemsByCategory', () => {
    it('should return items for a specific category', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useCatalog({ businessSlug: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const coffeeItems = result.current.getItemsByCategory('cat-1');
      expect(coffeeItems).toHaveLength(2);
      expect(coffeeItems[0].name).toBe('Latte');

      const teaItems = result.current.getItemsByCategory('cat-2');
      expect(teaItems).toHaveLength(1);
      expect(teaItems[0].name).toBe('Green Tea');
    });

    it('should return empty array for unknown category', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useCatalog({ businessSlug: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = result.current.getItemsByCategory('unknown');
      expect(items).toEqual([]);
    });
  });

  describe('refetch', () => {
    it('should allow manual refetch', async () => {
      // First call fails
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const { result } = renderHook(() =>
        useCatalog({ businessSlug: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Unable to connect to server');

      // Second call succeeds
      const mockResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.catalog).toEqual(mockCatalogData);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('caching', () => {
    it('should not refetch when businessSlug does not change', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result, rerender } = renderHook(
        ({ businessSlug }) => useCatalog({ businessSlug }),
        { initialProps: { businessSlug: 'test-coffee-shop' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // First fetch
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Rerender with same slug
      rerender({ businessSlug: 'test-coffee-shop' });

      // Should not trigger another fetch
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should refetch when businessSlug changes', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockCatalogData,
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const { result, rerender } = renderHook(
        ({ businessSlug }) => useCatalog({ businessSlug }),
        { initialProps: { businessSlug: 'test-coffee-shop' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Rerender with different slug
      rerender({ businessSlug: 'another-shop' });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
