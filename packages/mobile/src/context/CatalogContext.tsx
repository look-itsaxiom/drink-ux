/**
 * CatalogContext
 * Provides mapped catalog data to all components
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
 * Automatically fetches mapped catalog when business is loaded
 *
 * Note: Must be used within a BusinessProvider
 */
export function CatalogProvider({ children }: CatalogProviderProps): JSX.Element {
  const { business } = useBusinessContext();

  // Use business ID for the mapped catalog endpoint
  const catalogState = useCatalog({
    businessId: business?.id,
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
 */
export function useCatalogContext(): CatalogContextValue {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error('useCatalogContext must be used within a CatalogProvider');
  }

  return context;
}

export default CatalogContext;
