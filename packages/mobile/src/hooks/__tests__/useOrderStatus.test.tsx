import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { OrderStatus } from '@drink-ux/shared';
import { OrderResponse } from '../../services/orderService';

// Create mock function that will be used in the mocked module
const mockGetOrder = vi.fn();

// Mock the orderService module
vi.mock('../../services/orderService', () => ({
  getOrder: (...args: unknown[]) => mockGetOrder(...args),
  isTerminalStatus: (status: OrderStatus) =>
    [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.FAILED].includes(status),
  formatOrderStatus: (status: OrderStatus) => status,
  getStatusStep: () => 0,
}));

// Import after mock setup
import { useOrderStatus } from '../useOrderStatus';

describe('useOrderStatus', () => {
  const mockOrderResponse: OrderResponse = {
    id: 'order-456',
    businessId: 'biz-123',
    orderNumber: 'ORD-001234',
    pickupCode: 'A7X',
    status: OrderStatus.PENDING,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '555-1234',
    items: [
      {
        id: 'item-1',
        name: 'Latte',
        description: 'Medium, Hot',
        quantity: 1,
        unitPrice: 5.5,
        totalPrice: 5.5,
      },
    ],
    totalAmount: 5.5,
    estimatedReadyAt: '2024-01-15T10:45:00Z',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrder.mockResolvedValue(mockOrderResponse);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('initial state', () => {
    it('should return initial loading state', async () => {
      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456' })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.order).toBeNull();
      expect(result.current.status).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should fetch order data on mount', async () => {
      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456' })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.order).toEqual(mockOrderResponse);
      expect(result.current.status).toBe(OrderStatus.PENDING);
      expect(mockGetOrder).toHaveBeenCalledWith('order-456');
    });

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456', enabled: false })
      );

      // Wait a bit to ensure no fetch happens
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.order).toBeNull();
      expect(mockGetOrder).not.toHaveBeenCalled();
    });

    it('should not fetch when orderId is empty', async () => {
      const { result } = renderHook(() =>
        useOrderStatus({ orderId: '' })
      );

      // Wait a bit to ensure no fetch happens
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.order).toBeNull();
      expect(mockGetOrder).not.toHaveBeenCalled();
    });
  });

  describe('status updates', () => {
    it('should call onStatusChange callback on initial fetch', async () => {
      const onStatusChange = vi.fn();

      const { result } = renderHook(() =>
        useOrderStatus({
          orderId: 'order-456',
          onStatusChange,
        })
      );

      await waitFor(() => {
        expect(result.current.status).toBe(OrderStatus.PENDING);
      });

      expect(onStatusChange).toHaveBeenCalledWith(OrderStatus.PENDING);
    });

    it('should return correct status from order', async () => {
      const preparingOrder = { ...mockOrderResponse, status: OrderStatus.PREPARING };
      mockGetOrder.mockResolvedValue(preparingOrder);

      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456' })
      );

      await waitFor(() => {
        expect(result.current.status).toBe(OrderStatus.PREPARING);
      });
    });
  });

  describe('terminal states', () => {
    it('should recognize COMPLETED as terminal state', async () => {
      const completedOrder = { ...mockOrderResponse, status: OrderStatus.COMPLETED };
      mockGetOrder.mockResolvedValue(completedOrder);

      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456' })
      );

      await waitFor(() => {
        expect(result.current.status).toBe(OrderStatus.COMPLETED);
      });

      // Should have fetched only once (no polling after terminal)
      expect(mockGetOrder).toHaveBeenCalledTimes(1);
    });

    it('should recognize CANCELLED as terminal state', async () => {
      const cancelledOrder = { ...mockOrderResponse, status: OrderStatus.CANCELLED };
      mockGetOrder.mockResolvedValue(cancelledOrder);

      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456' })
      );

      await waitFor(() => {
        expect(result.current.status).toBe(OrderStatus.CANCELLED);
      });

      expect(mockGetOrder).toHaveBeenCalledTimes(1);
    });

    it('should recognize FAILED as terminal state', async () => {
      const failedOrder = { ...mockOrderResponse, status: OrderStatus.FAILED };
      mockGetOrder.mockResolvedValue(failedOrder);

      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456' })
      );

      await waitFor(() => {
        expect(result.current.status).toBe(OrderStatus.FAILED);
      });

      expect(mockGetOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should return error state on failure', async () => {
      const testError = new Error('Order not found');
      mockGetOrder.mockRejectedValue(testError);

      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'non-existent' })
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.order).toBeNull();
      expect(result.current.error?.message).toContain('Order not found');
    });

    it('should handle network errors', async () => {
      mockGetOrder.mockRejectedValue(new TypeError('Failed to fetch'));

      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456' })
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456' })
      );

      await waitFor(() => {
        expect(result.current.order).not.toBeNull();
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch data when refetch is called', async () => {
      const updatedOrder = {
        ...mockOrderResponse,
        status: OrderStatus.READY,
      };

      mockGetOrder
        .mockResolvedValueOnce(mockOrderResponse)
        .mockResolvedValueOnce(updatedOrder);

      const { result } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456', pollingInterval: 60000 }) // Long interval
      );

      await waitFor(() => {
        expect(result.current.status).toBe(OrderStatus.PENDING);
      });

      expect(mockGetOrder).toHaveBeenCalledTimes(1);

      // Manually refetch
      result.current.refetch();

      await waitFor(() => {
        expect(result.current.status).toBe(OrderStatus.READY);
      });

      expect(mockGetOrder).toHaveBeenCalledTimes(2);
    });
  });

  describe('disabled state', () => {
    it('should stop fetching when disabled', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useOrderStatus({ orderId: 'order-456', enabled }),
        { initialProps: { enabled: true } }
      );

      await waitFor(() => {
        expect(result.current.order).not.toBeNull();
      });

      expect(mockGetOrder).toHaveBeenCalledTimes(1);

      // Disable
      rerender({ enabled: false });

      // Wait a bit and verify no more fetches
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGetOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should handle unmount gracefully', async () => {
      const { result, unmount } = renderHook(() =>
        useOrderStatus({ orderId: 'order-456' })
      );

      await waitFor(() => {
        expect(result.current.order).not.toBeNull();
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('order ID change', () => {
    it('should fetch new order when orderId changes', async () => {
      const order1 = { ...mockOrderResponse, id: 'order-1', pickupCode: 'A1A' };
      const order2 = { ...mockOrderResponse, id: 'order-2', pickupCode: 'B2B' };

      mockGetOrder
        .mockResolvedValueOnce(order1)
        .mockResolvedValueOnce(order2);

      const { result, rerender } = renderHook(
        ({ orderId }) => useOrderStatus({ orderId }),
        { initialProps: { orderId: 'order-1' } }
      );

      await waitFor(() => {
        expect(result.current.order?.pickupCode).toBe('A1A');
      });

      // Change order ID
      rerender({ orderId: 'order-2' });

      await waitFor(() => {
        expect(result.current.order?.pickupCode).toBe('B2B');
      });
    });
  });
});
