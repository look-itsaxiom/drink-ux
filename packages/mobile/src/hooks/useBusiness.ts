/**
 * useBusiness Hook
 * Fetches and manages business configuration data
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getBusinessBySubdomain,
  getSubdomain,
  BusinessConfigData,
} from '../services/businessService';
import { ApiClientError } from '../services/api';

/**
 * Hook options
 */
export interface UseBusinessOptions {
  /** Override the subdomain detection with a specific value */
  subdomain?: string;
  /** Skip automatic fetch on mount */
  skip?: boolean;
}

/**
 * Hook return value
 */
export interface UseBusinessResult {
  /** The business configuration data */
  business: BusinessConfigData | null;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** The detected/used subdomain */
  subdomain: string | null;
  /** Function to manually refetch the data */
  refetch: () => void;
}

/**
 * Hook to fetch and manage business configuration
 *
 * Automatically detects the subdomain from the URL and fetches
 * the business configuration on mount.
 *
 * @param options - Hook options
 * @returns Business data, loading state, and error
 *
 * @example
 * ```tsx
 * const { business, loading, error } = useBusiness();
 *
 * if (loading) return <IonSpinner />;
 * if (error) return <IonText color="danger">{error}</IonText>;
 *
 * return <h1>{business?.name}</h1>;
 * ```
 */
export function useBusiness(options: UseBusinessOptions = {}): UseBusinessResult {
  const { subdomain: subdomainOverride, skip = false } = options;

  // Detect subdomain from URL or use override
  const detectedSubdomain = subdomainOverride ?? getSubdomain();

  const [business, setBusiness] = useState<BusinessConfigData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!detectedSubdomain && !skip);
  const [error, setError] = useState<string | null>(
    !detectedSubdomain && !skip ? 'No business specified' : null
  );

  const fetchBusiness = useCallback(async () => {
    if (!detectedSubdomain) {
      setLoading(false);
      setError('No business specified');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getBusinessBySubdomain(detectedSubdomain);
      setBusiness(data);
      setError(null);
    } catch (err) {
      setBusiness(null);

      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [detectedSubdomain]);

  // Fetch on mount (unless skipped)
  useEffect(() => {
    if (!skip && detectedSubdomain) {
      fetchBusiness();
    }
  }, [skip, detectedSubdomain, fetchBusiness]);

  return {
    business,
    loading,
    error,
    subdomain: detectedSubdomain,
    refetch: fetchBusiness,
  };
}

export default useBusiness;
