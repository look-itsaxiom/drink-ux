/**
 * CatalogContext
 * Provides catalog data to all components with caching
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useCatalog, UseCatalogResult } from '../hooks/useCatalog';
import { useBusinessContext } from './BusinessContext';

/**
 * Catalog context value - extends the hook result
 */
export type CatalogContextValue = UseCatalogResult;

// Create context with null default
const CatalogContext = createContext<CatalogContextValue | null>(null);

/**
 * Catalog Provider Props
 */
export interface CatalogProviderProps {
  /** Children components */
  children: ReactNode;
}

/**
 * Catalog Provider component
 * Wraps children with catalog data context
 * Automatically fetches catalog when business is loaded
 *
 * Note: Must be used within a BusinessProvider
 *
 * @example
 * ```tsx
 * <BusinessProvider>
 *   <CatalogProvider>
 *     <App />
 *   </CatalogProvider>
 * </BusinessProvider>
 * ```
 */
export function CatalogProvider({ children }: CatalogProviderProps): JSX.Element {
  const { business } = useBusinessContext();

  const catalogState = useCatalog({
    businessSlug: business?.slug,
    skip: !business,
  });

  return (
    <CatalogContext.Provider value={catalogState}>
      {children}
    </CatalogContext.Provider>
  );
}

/**
 * Hook to access catalog context
 *
 * @returns Catalog context value
 * @throws Error if used outside CatalogProvider
 *
 * @example
 * ```tsx
 * const { categories, loading, error, getItemsByCategory } = useCatalogContext();
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
export function useCatalogContext(): CatalogContextValue {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error('useCatalogContext must be used within a CatalogProvider');
  }

  return context;
}

export default CatalogContext;
