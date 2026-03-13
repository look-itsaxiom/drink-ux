/**
 * useCatalog Hook
 * Fetches and manages mapped catalog data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMappedCatalog,
  groupBasesByCategory,
  MappedCatalog,
  MappedBase,
  MappedModifiers,
  DerivedCategory,
} from '../services/catalogService';
import { ApiClientError } from '../services/api';

/**
 * Hook options
 */
export interface UseCatalogOptions {
  /** The business ID to fetch catalog for */
  businessId?: string | null;
  /** Skip automatic fetch on mount */
  skip?: boolean;
}

/**
 * Hook return value
 */
export interface UseCatalogResult {
  /** The full mapped catalog data */
  catalog: MappedCatalog | null;
  /** Categories derived from bases */
  categories: DerivedCategory[];
  /** All bases (flat list) */
  bases: MappedBase[];
  /** Modifiers grouped by type */
  modifiers: MappedModifiers;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Get bases for a specific category */
  getBasesByCategory: (categoryId: string) => MappedBase[];
  /** Function to manually refetch the data */
  refetch: () => void;
}

/**
 * Hook to fetch and manage mapped catalog data
 *
 * @param options - Hook options
 * @returns Catalog data, loading state, and error
 */
export function useCatalog(options: UseCatalogOptions = {}): UseCatalogResult {
  const { businessId, skip = false } = options;

  const [catalog, setCatalog] = useState<MappedCatalog | null>(null);
  const [loading, setLoading] = useState<boolean>(!!businessId && !skip);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const catalogData = await getMappedCatalog(businessId);
      setCatalog(catalogData);
      setError(null);
    } catch (err) {
      setCatalog(null);

      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // Fetch on mount or when businessId changes
  useEffect(() => {
    if (!skip && businessId) {
      fetchCatalog();
    }
  }, [skip, businessId, fetchCatalog]);

  // Derive categories from bases
  const categories = useMemo(() => {
    return catalog ? groupBasesByCategory(catalog.bases) : [];
  }, [catalog]);

  // Get flat bases array
  const bases = useMemo(() => {
    return catalog?.bases || [];
  }, [catalog]);

  // Get modifiers (with defaults)
  const modifiers = useMemo((): MappedModifiers => {
    return catalog?.modifiers || { milks: [], syrups: [], toppings: [] };
  }, [catalog]);

  // Helper function to get bases by category
  const getBasesByCategory = useCallback(
    (categoryId: string): MappedBase[] => {
      const category = categories.find(
        (c) => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase()
      );
      return category?.items || [];
    },
    [categories]
  );

  return {
    catalog,
    categories,
    bases,
    modifiers,
    loading,
    error,
    getBasesByCategory,
    refetch: fetchCatalog,
  };
}

export default useCatalog;
