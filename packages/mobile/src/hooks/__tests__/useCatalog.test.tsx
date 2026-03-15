/**
 * useCatalog Hook Tests
 * Tests for the mapped catalog hook
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCatalog } from '../useCatalog';
import { getMappedCatalog, MappedCatalog } from '../../services/catalogService';

// Mock the catalog service
vi.mock('../../services/catalogService', () => ({
  getMappedCatalog: vi.fn(),
  groupBasesByCategory: vi.fn((bases: Array<{ category?: string; [key: string]: unknown }>) => {
    const categoryMap = new Map<string, unknown[]>();
    for (const base of bases) {
      const category = base.category || 'Other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(base);
    }
    return Array.from(categoryMap.entries()).map(([name, items]) => ({
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      items,
    }));
  }),
}));

const mockGetMappedCatalog = getMappedCatalog as ReturnType<typeof vi.fn>;

// Sample mapped catalog data
const mockMappedCatalog: MappedCatalog = {
  bases: [
    {
      squareItemId: 'item-1',
      name: 'Latte',
      price: 4.50,
      category: 'Coffee',
      variations: [
        { variationId: 'var-1', name: 'small', price: 4.00 },
        { variationId: 'var-2', name: 'medium', price: 4.50 },
        { variationId: 'var-3', name: 'large', price: 5.00 },
      ],
      temperatures: ['hot', 'iced'],
      modifierGroupIds: ['mg-milks', 'mg-syrups'],
    },
    {
      squareItemId: 'item-2',
      name: 'Green Tea',
      price: 3.00,
      category: 'Tea',
      variations: [
        { variationId: 'var-4', name: 'medium', price: 3.00 },
        { variationId: 'var-5', name: 'large', price: 3.50 },
      ],
      temperatures: ['hot', 'iced'],
      modifierGroupIds: ['mg-milks'],
    },
  ],
  modifierGroups: [
    {
      id: 'mg-milks',
      name: 'Milks',
      selectionMode: 'single',
      minSelections: 0,
      maxSelections: 1,
      modifiers: [
        { squareModifierId: 'mod-1', name: 'Oat Milk', price: 0.75 },
      ],
    },
    {
      id: 'mg-syrups',
      name: 'Syrups',
      selectionMode: 'multi',
      minSelections: 0,
      maxSelections: 5,
      modifiers: [
        { squareModifierId: 'mod-2', name: 'Vanilla', price: 0.50 },
      ],
    },
  ],
  presets: [],
};

describe('useCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMappedCatalog.mockResolvedValue(mockMappedCatalog);
  });

  it('should initialize with loading state when businessId is provided', () => {
    const { result } = renderHook(() =>
      useCatalog({ businessId: 'test-business-id' })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.catalog).toBeNull();
    expect(result.current.categories).toEqual([]);
  });

  it('should fetch catalog on mount', async () => {
    const { result } = renderHook(() =>
      useCatalog({ businessId: 'test-business-id' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetMappedCatalog).toHaveBeenCalledWith('test-business-id');
    expect(result.current.catalog).toEqual(mockMappedCatalog);
    expect(result.current.bases).toHaveLength(2);
  });

  it('should derive categories from bases', async () => {
    const { result } = renderHook(() =>
      useCatalog({ businessId: 'test-business-id' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toHaveLength(2);
    expect(result.current.categories.map(c => c.name)).toContain('Coffee');
    expect(result.current.categories.map(c => c.name)).toContain('Tea');
  });

  it('should provide modifier groups', async () => {
    const { result } = renderHook(() =>
      useCatalog({ businessId: 'test-business-id' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.modifierGroups).toHaveLength(2);
    expect(result.current.modifierGroups[0].name).toBe('Milks');
    expect(result.current.modifierGroups[1].name).toBe('Syrups');
  });

  it('should skip fetch when skip option is true', () => {
    renderHook(() =>
      useCatalog({ businessId: 'test-business-id', skip: true })
    );

    expect(mockGetMappedCatalog).not.toHaveBeenCalled();
  });

  it('should not fetch when businessId is null', () => {
    const { result } = renderHook(() =>
      useCatalog({ businessId: null })
    );

    expect(mockGetMappedCatalog).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('should handle getBasesByCategory', async () => {
    const { result } = renderHook(() =>
      useCatalog({ businessId: 'test-business-id' })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const coffeeBases = result.current.getBasesByCategory('coffee');
    expect(coffeeBases).toHaveLength(1);
    expect(coffeeBases[0].name).toBe('Latte');
  });
});
