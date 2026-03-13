/**
 * Catalog Service Tests
 * Tests for the mapped catalog service
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getMappedCatalog,
  groupBasesByCategory,
  supportsHot,
  supportsIced,
  getDefaultIsHot,
  MappedCatalog,
  MappedBase,
} from '../catalogService';
import { apiClient } from '../api';

// Mock the API client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

describe('Catalog Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMappedCatalog', () => {
    it('should fetch mapped catalog from correct endpoint', async () => {
      const mockCatalog: MappedCatalog = {
        bases: [],
        modifiers: { milks: [], syrups: [], toppings: [] },
      };
      mockGet.mockResolvedValue(mockCatalog);

      const result = await getMappedCatalog('business-123');

      expect(mockGet).toHaveBeenCalledWith('/api/catalog/business-123/mapped');
      expect(result).toEqual(mockCatalog);
    });
  });

  describe('groupBasesByCategory', () => {
    it('should group bases by category', () => {
      const bases: MappedBase[] = [
        { squareItemId: '1', name: 'Latte', price: 4.5, category: 'Coffee', sizes: [], temperatures: [] },
        { squareItemId: '2', name: 'Americano', price: 3.5, category: 'Coffee', sizes: [], temperatures: [] },
        { squareItemId: '3', name: 'Green Tea', price: 3.0, category: 'Tea', sizes: [], temperatures: [] },
      ];

      const categories = groupBasesByCategory(bases);

      expect(categories).toHaveLength(2);

      const coffee = categories.find(c => c.name === 'Coffee');
      expect(coffee?.items).toHaveLength(2);

      const tea = categories.find(c => c.name === 'Tea');
      expect(tea?.items).toHaveLength(1);
    });

    it('should use "Other" for bases without category', () => {
      const bases: MappedBase[] = [
        { squareItemId: '1', name: 'Mystery Drink', price: 5.0, category: '', sizes: [], temperatures: [] },
      ];

      const categories = groupBasesByCategory(bases);
      expect(categories[0].name).toBe('Other');
    });
  });

  describe('temperature helpers', () => {
    it('supportsHot should return true for hot temperatures', () => {
      expect(supportsHot(['hot', 'iced'])).toBe(true);
      expect(supportsHot(['HOT'])).toBe(true);
      expect(supportsHot(['iced'])).toBe(false);
    });

    it('supportsIced should return true for iced temperatures', () => {
      expect(supportsIced(['hot', 'iced'])).toBe(true);
      expect(supportsIced(['ICED'])).toBe(true);
      expect(supportsIced(['hot'])).toBe(false);
    });

    it('getDefaultIsHot should return correct defaults', () => {
      expect(getDefaultIsHot(['hot'])).toBe(true);
      expect(getDefaultIsHot(['iced'])).toBe(false);
      expect(getDefaultIsHot(['hot', 'iced'])).toBeUndefined();
    });
  });
});
