/**
 * useRetry Hook
 *
 * Provides automatic retry logic with configurable backoff strategies.
 * Useful for handling transient failures in API calls.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Configuration options for useRetry
 */
export interface UseRetryOptions<T> {
  /** The async function to execute */
  fn: () => Promise<T>;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  delay?: number;
  /** Backoff strategy: 'linear' uses fixed delay, 'exponential' doubles each time */
  backoff?: 'linear' | 'exponential';
  /** Callback invoked on each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
  /** Execute the function immediately on mount (default: false) */
  immediate?: boolean;
}

/**
 * Result returned by useRetry
 */
export interface UseRetryResult<T> {
  /** The resolved data, or null if not yet available */
  data: T | null;
  /** The error from the last failed attempt, or null */
  error: Error | null;
  /** True during the initial request */
  isLoading: boolean;
  /** True during retry attempts (after initial failure) */
  isRetrying: boolean;
  /** Current attempt number (1-based) */
  attempt: number;
  /** Manually trigger a retry/execution */
  retry: () => void;
}

/**
 * Hook for executing async functions with automatic retry logic
 *
 * @param options - Configuration options
 * @returns Result object with data, error, loading states, and retry function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, error, isLoading, isRetrying, retry } = useRetry({
 *     fn: () => fetchOrders(),
 *     maxRetries: 3,
 *     delay: 1000,
 *     backoff: 'exponential',
 *     onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error.message),
 *     immediate: true,
 *   });
 *
 *   if (isLoading) return <IonSpinner />;
 *   if (error) {
 *     return (
 *       <div>
 *         <p>Failed to load: {error.message}</p>
 *         <IonButton onClick={retry}>Try Again</IonButton>
 *       </div>
 *     );
 *   }
 *   return <OrderList orders={data} />;
 * }
 * ```
 */
export function useRetry<T>(options: UseRetryOptions<T>): UseRetryResult<T> {
  const {
    fn,
    maxRetries = 3,
    delay = 1000,
    backoff = 'linear',
    onRetry,
    immediate = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Track if component is mounted to avoid setting state after unmount
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate delay for a given retry attempt
  const getDelay = useCallback((attemptNumber: number): number => {
    if (backoff === 'exponential') {
      // Exponential: delay * 2^(attempt-1)
      // Attempt 1: delay * 1, Attempt 2: delay * 2, Attempt 3: delay * 4
      return delay * Math.pow(2, attemptNumber - 1);
    }
    // Linear: constant delay
    return delay;
  }, [delay, backoff]);

  // Execute the function with retry logic
  const execute = useCallback(async (currentAttempt: number = 1): Promise<void> => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setAttempt(currentAttempt);

    if (currentAttempt > 1) {
      setIsRetrying(true);
    }

    try {
      const result = await fn();

      if (!isMountedRef.current) return;

      setData(result);
      setError(null);
      setIsLoading(false);
      setIsRetrying(false);
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error(String(err));

      // Check if we have retries remaining
      // Note: currentAttempt includes the initial attempt
      // maxRetries is the number of retries AFTER the first attempt
      const totalAttempts = 1 + maxRetries;
      const hasRetriesLeft = currentAttempt < totalAttempts;

      if (hasRetriesLeft) {
        // Schedule retry
        const retryDelay = getDelay(currentAttempt);
        onRetry?.(currentAttempt, error);

        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            execute(currentAttempt + 1);
          }
        }, retryDelay);
      } else {
        // No more retries, set final error state
        setError(error);
        setIsLoading(false);
        setIsRetrying(false);
      }
    }
  }, [fn, maxRetries, getDelay, onRetry]);

  // Manual retry function - resets and starts fresh
  const retry = useCallback(() => {
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setError(null);
    setAttempt(0);
    setIsRetrying(false);
    execute(1);
  }, [execute]);

  // Execute immediately if configured
  useEffect(() => {
    if (immediate) {
      execute(1);
    }

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return {
    data,
    error,
    isLoading,
    isRetrying,
    attempt,
    retry,
  };
}

export default useRetry;
