/**
 * useSubscriptionStatus Hook
 * Fetches and manages subscription status for a business
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, ApiClientError } from '../services/api';

/**
 * Subscription status types
 */
export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'grace_period'
  | 'suspended'
  | 'inactive';

/**
 * API response for subscription status
 */
export interface SubscriptionStatusResponse {
  status: SubscriptionStatus;
  expiresAt: string | null;
  gracePeriodDays: number | null;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: SubscriptionStatusResponse;
  timestamp: number;
}

/**
 * Hook options
 */
export interface UseSubscriptionStatusOptions {
  /** Business subdomain/slug to check */
  subdomain: string;
  /** Skip automatic fetch on mount */
  skip?: boolean;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
}

/**
 * Hook return value
 */
export interface UseSubscriptionStatusResult {
  /** The raw subscription status */
  status: SubscriptionStatus | null;
  /** Whether subscription is currently active */
  isActive: boolean;
  /** Whether subscription is in trial period */
  isTrial: boolean;
  /** Whether subscription is in grace period */
  isGracePeriod: boolean;
  /** Number of days remaining in grace period */
  gracePeriodDays: number | null;
  /** Whether the storefront can be accessed */
  canAccessStorefront: boolean;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to manually refetch the data */
  refetch: () => void;
}

// In-memory cache for subscription status
const subscriptionCache: Map<string, CacheEntry> = new Map();

// Default cache TTL: 5 minutes
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry | undefined, ttl: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

/**
 * Clear the subscription status cache (useful for testing)
 */
export function clearSubscriptionCache(): void {
  subscriptionCache.clear();
}

/**
 * Hook to fetch and manage subscription status
 *
 * @param options - Hook options
 * @returns Subscription status, derived states, and error handling
 *
 * @example
 * ```tsx
 * const { status, isActive, canAccessStorefront, loading, error } =
 *   useSubscriptionStatus({ subdomain: 'my-coffee-shop' });
 *
 * if (loading) return <IonSpinner />;
 * if (!canAccessStorefront) return <ComingSoon />;
 *
 * return <StorefrontContent />;
 * ```
 */
export function useSubscriptionStatus(
  options: UseSubscriptionStatusOptions
): UseSubscriptionStatusResult {
  const { subdomain, skip = false, cacheTTL = DEFAULT_CACHE_TTL } = options;

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [gracePeriodDays, setGracePeriodDays] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(!skip && !!subdomain);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchSubscriptionStatus = useCallback(
    async (bypassCache = false) => {
      if (!subdomain) {
        setLoading(false);
        setError('No business specified');
        return;
      }

      // Check cache first (unless bypassing)
      const cacheKey = `subscription:${subdomain}`;
      const cached = subscriptionCache.get(cacheKey);

      if (!bypassCache && isCacheValid(cached, cacheTTL)) {
        setStatus(cached!.data.status);
        setGracePeriodDays(cached!.data.gracePeriodDays);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await apiClient.get<SubscriptionStatusResponse>(
          `/api/business/${subdomain}/subscription`
        );

        if (!isMountedRef.current) return;

        // Update cache
        subscriptionCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });

        setStatus(data.status);
        setGracePeriodDays(data.gracePeriodDays);
        setError(null);
      } catch (err) {
        if (!isMountedRef.current) return;

        setStatus(null);
        setGracePeriodDays(null);

        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [subdomain, cacheTTL]
  );

  // Fetch on mount (unless skipped)
  useEffect(() => {
    isMountedRef.current = true;

    if (!skip && subdomain) {
      fetchSubscriptionStatus();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [skip, subdomain, fetchSubscriptionStatus]);

  // Derive boolean states from status
  const isActive = status === 'active' || status === 'trial';
  const isTrial = status === 'trial';
  const isGracePeriod = status === 'grace_period';

  // Determine if storefront can be accessed
  // Active, trial, and grace period statuses allow access
  const canAccessStorefront =
    status === 'active' || status === 'trial' || status === 'grace_period';

  return {
    status,
    isActive,
    isTrial,
    isGracePeriod,
    gracePeriodDays,
    canAccessStorefront,
    loading,
    error,
    refetch: () => fetchSubscriptionStatus(true),
  };
}

export default useSubscriptionStatus;
