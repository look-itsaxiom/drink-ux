/**
 * useCatalog Hook
 * Fetches and manages catalog data (categories, bases)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getCatalog,
  getModifiers,
  CatalogData,
  CategoryWithItems,
  CatalogItem,
  ModifierData,
  getItemsByCategory as getItemsByCategoryUtil,
  groupModifiersByType,
} from '../services/catalogService';
import { ApiClientError } from '../services/api';

/**
 * Hook options
 */
export interface UseCatalogOptions {
  /** The business slug to fetch catalog for */
  businessSlug?: string | null;
  /** Skip automatic fetch on mount */
  skip?: boolean;
}

/**
 * Hook return value
 */
export interface UseCatalogResult {
  /** The full catalog data */
  catalog: CatalogData | null;
  /** Categories array for easy access */
  categories: CategoryWithItems[];
  /** All modifiers */
  modifiers: ModifierData[];
  /** Modifiers grouped by type (MILK, SYRUP, TOPPING) */
  modifiersByType: Record<string, ModifierData[]>;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Get items for a specific category */
  getItemsByCategory: (categoryId: string) => CatalogItem[];
  /** Function to manually refetch the data */
  refetch: () => void;
}

/**
 * Hook to fetch and manage catalog data
 *
 * @param options - Hook options
 * @returns Catalog data, loading state, and error
 *
 * @example
 * ```tsx
 * const { categories, loading, error, getItemsByCategory } = useCatalog({
 *   businessSlug: business?.slug
 * });
 *
 * if (loading) return <IonSpinner />;
 * if (error) return <IonText color="danger">{error}</IonText>;
 *
 * return (
 *   <IonList>
 *     {categories.map(category => (
 *       <IonItem key={category.id}>{category.name}</IonItem>
 *     ))}
 *   </IonList>
 * );
 * ```
 */
export function useCatalog(options: UseCatalogOptions = {}): UseCatalogResult {
  const { businessSlug, skip = false } = options;

  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [modifiers, setModifiers] = useState<ModifierData[]>([]);
  const [loading, setLoading] = useState<boolean>(!!businessSlug && !skip);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    if (!businessSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch catalog and modifiers in parallel
      const [catalogData, modifiersData] = await Promise.all([
        getCatalog(businessSlug),
        getModifiers(businessSlug).catch(() => [] as ModifierData[]),
      ]);

      setCatalog(catalogData);
      setModifiers(modifiersData);
      setError(null);
    } catch (err) {
      setCatalog(null);
      setModifiers([]);

      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [businessSlug]);

  // Fetch on mount or when businessSlug changes
  useEffect(() => {
    if (!skip && businessSlug) {
      fetchCatalog();
    }
  }, [skip, businessSlug, fetchCatalog]);

  // Memoize categories array
  const categories = useMemo(() => {
    return catalog?.categories || [];
  }, [catalog]);

  // Memoize modifiers grouped by type
  const modifiersByType = useMemo(() => {
    return groupModifiersByType(modifiers);
  }, [modifiers]);

  // Helper function to get items by category
  const getItemsByCategory = useCallback(
    (categoryId: string): CatalogItem[] => {
      if (!catalog) return [];
      return getItemsByCategoryUtil(catalog, categoryId);
    },
    [catalog]
  );

  return {
    catalog,
    categories,
    modifiers,
    modifiersByType,
    loading,
    error,
    getItemsByCategory,
    refetch: fetchCatalog,
  };
}

export default useCatalog;
