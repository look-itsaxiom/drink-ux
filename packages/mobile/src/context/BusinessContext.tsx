/**
 * BusinessContext
 * Provides business configuration to all components
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useBusiness, UseBusinessResult } from '../hooks/useBusiness';

/**
 * Business context value - extends the hook result
 */
export type BusinessContextValue = UseBusinessResult;

// Create context with null default
const BusinessContext = createContext<BusinessContextValue | null>(null);

/**
 * Business Provider Props
 */
export interface BusinessProviderProps {
  /** Optional subdomain override */
  subdomain?: string;
  /** Children components */
  children: ReactNode;
}

/**
 * Business Provider component
 * Wraps children with business configuration context
 *
 * @example
 * ```tsx
 * <BusinessProvider>
 *   <App />
 * </BusinessProvider>
 * ```
 */
export function BusinessProvider({
  subdomain,
  children,
}: BusinessProviderProps): JSX.Element {
  const businessState = useBusiness({ subdomain });

  return (
    <BusinessContext.Provider value={businessState}>
      {children}
    </BusinessContext.Provider>
  );
}

/**
 * Hook to access business context
 *
 * @returns Business context value
 * @throws Error if used outside BusinessProvider
 *
 * @example
 * ```tsx
 * const { business, loading, error } = useBusinessContext();
 *
 * if (loading) return <IonSpinner />;
 * if (error) return <IonText color="danger">{error}</IonText>;
 *
 * return <h1>{business?.name}</h1>;
 * ```
 */
export function useBusinessContext(): BusinessContextValue {
  const context = useContext(BusinessContext);

  if (!context) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }

  return context;
}

export default BusinessContext;
