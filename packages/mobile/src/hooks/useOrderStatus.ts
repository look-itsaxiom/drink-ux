/**
 * useOrderStatus Hook
 * Polls for order status updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OrderStatus } from '@drink-ux/shared';
import { getOrder, OrderResponse, isTerminalStatus } from '../services/orderService';
import { ApiClientError } from '../services/api';

/**
 * Options for the useOrderStatus hook
 */
export interface UseOrderStatusOptions {
  /** Order ID to poll */
  orderId: string;
  /** Polling interval in milliseconds (default: 5000) */
  pollingInterval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** Callback when status changes */
  onStatusChange?: (status: OrderStatus) => void;
}

/**
 * Result returned by useOrderStatus hook
 */
export interface UseOrderStatusResult {
  /** The current order data */
  order: OrderResponse | null;
  /** The current order status */
  status: OrderStatus | null;
  /** Whether the initial fetch is loading */
  isLoading: boolean;
  /** Error from the last fetch attempt */
  error: Error | null;
  /** Function to manually refetch the order */
  refetch: () => void;
}

/**
 * Hook for polling order status updates
 *
 * @param options - Hook options
 * @returns Order status data and controls
 *
 * @example
 * ```tsx
 * const { order, status, isLoading, error, refetch } = useOrderStatus({
 *   orderId: 'order-123',
 *   pollingInterval: 5000,
 *   onStatusChange: (status) => console.log('Status changed:', status),
 * });
 * ```
 */
export function useOrderStatus(options: UseOrderStatusOptions): UseOrderStatusResult {
  const {
    orderId,
    pollingInterval = 5000,
    enabled = true,
    onStatusChange,
  } = options;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track previous status to detect changes
  const previousStatusRef = useRef<OrderStatus | null>(null);
  // Track if component is mounted
  const isMountedRef = useRef<boolean>(true);
  // Track polling interval ID
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Fetch order data
   */
  const fetchOrder = useCallback(async () => {
    if (!orderId || !isMountedRef.current) {
      return;
    }

    // Only set loading on initial fetch
    if (!order) {
      setIsLoading(true);
    }

    try {
      const fetchedOrder = await getOrder(orderId);

      if (!isMountedRef.current) {
        return;
      }

      setOrder(fetchedOrder);
      setError(null);

      // Check for status change
      if (
        previousStatusRef.current !== fetchedOrder.status &&
        onStatusChange
      ) {
        onStatusChange(fetchedOrder.status);
      }
      previousStatusRef.current = fetchedOrder.status;
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }

      if (err instanceof ApiClientError) {
        setError(new Error(err.message));
      } else if (err instanceof Error) {
        setError(err);
      } else {
        setError(new Error('Failed to fetch order'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [orderId, onStatusChange, order]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(() => {
    fetchOrder();
  }, [fetchOrder]);

  /**
   * Clear polling interval
   */
  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    clearPolling();

    if (!enabled || !orderId) {
      return;
    }

    pollingIntervalRef.current = setInterval(() => {
      // Don't poll if status is terminal
      if (order && isTerminalStatus(order.status)) {
        clearPolling();
        return;
      }

      fetchOrder();
    }, pollingInterval);
  }, [enabled, orderId, pollingInterval, order, fetchOrder, clearPolling]);

  // Initial fetch and setup
  useEffect(() => {
    isMountedRef.current = true;

    // Don't fetch if disabled or no orderId
    if (!enabled || !orderId) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchOrder();

    return () => {
      isMountedRef.current = false;
      clearPolling();
    };
  }, [orderId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setup polling after initial fetch
  useEffect(() => {
    // Don't start polling if not enabled, no orderId, or terminal status
    if (!enabled || !orderId || (order && isTerminalStatus(order.status))) {
      clearPolling();
      return;
    }

    // Only start polling after we have initial data
    if (order) {
      startPolling();
    }

    return () => {
      clearPolling();
    };
  }, [enabled, orderId, order?.status, startPolling, clearPolling]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    order,
    status: order?.status ?? null,
    isLoading,
    error,
    refetch,
  };
}

export default useOrderStatus;
