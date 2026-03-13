/**
 * AppProvider
 * Combines all context providers into a single wrapper
 */

import React, { ReactNode } from 'react';
import { BusinessProvider, useBusinessContext } from './BusinessContext';
import { CatalogProvider } from './CatalogContext';
import { CartProvider } from './CartContext';

/**
 * Inner provider that depends on BusinessContext
 */
function InnerProviders({ children }: { children: ReactNode }): JSX.Element {
  const { business } = useBusinessContext();

  // Always provide CartProvider — use business ID when available, "demo" for demo mode
  const cartBusinessId = business?.id || 'demo';

  return (
    <CatalogProvider>
      <CartProvider businessId={cartBusinessId}>{children}</CartProvider>
    </CatalogProvider>
  );
}

/**
 * App Provider Props
 */
export interface AppProviderProps {
  /** Optional subdomain override for testing */
  subdomain?: string;
  /** Children components */
  children: ReactNode;
}

/**
 * App Provider component
 * Wraps the application with all necessary context providers
 *
 * Provider hierarchy:
 * - BusinessProvider (fetches business config)
 *   - CatalogProvider (fetches catalog when business is loaded)
 *     - CartProvider (manages cart for the business)
 *
 * @example
 * ```tsx
 * <AppProvider>
 *   <IonApp>
 *     <IonRouterOutlet>
 *       <Route path="/home" component={Home} />
 *     </IonRouterOutlet>
 *   </IonApp>
 * </AppProvider>
 * ```
 */
export function AppProvider({
  subdomain,
  children,
}: AppProviderProps): JSX.Element {
  return (
    <BusinessProvider subdomain={subdomain}>
      <InnerProviders>{children}</InnerProviders>
    </BusinessProvider>
  );
}

export default AppProvider;
