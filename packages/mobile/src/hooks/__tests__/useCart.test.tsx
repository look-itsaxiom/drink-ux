import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { OrderStatus } from '@drink-ux/shared';
import { useCart, CartProvider, CartItem } from '../useCart';
import { OrderResponse } from '../../services/orderService';
import { createMockResponse, createMockErrorResponse } from '../../test/setup';

// Wrapper component for providing CartContext
const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CartProvider businessId="biz-123">{children}</CartProvider>
);

describe('useCart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  const mockCartItem: CartItem = {
    id: 'item-1',
    baseId: 'base-1',
    baseName: 'Latte',
    size: 'MEDIUM',
    isHot: true,
    modifierIds: ['mod-1'],
    modifierNames: ['Vanilla Syrup'],
    quantity: 1,
    unitPrice: 5.5, // base + modifiers per unit
    totalPrice: 5.5, // unitPrice * quantity
    notes: '',
  };

  describe('initial state', () => {
    it('should start with empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toEqual([]);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('addItem', () => {
    it('should add item to cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        baseName: 'Latte',
        quantity: 1,
      });
      expect(result.current.itemCount).toBe(1);
      expect(result.current.total).toBe(5.5);
    });

    it('should generate unique IDs for items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({ ...mockCartItem, id: undefined as any });
        result.current.addItem({ ...mockCartItem, id: undefined as any });
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].id).not.toBe(result.current.items[1].id);
    });

    it('should allow multiple of the same item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
        result.current.addItem({ ...mockCartItem, id: 'item-2' });
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.itemCount).toBe(2);
      expect(result.current.total).toBe(11);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      expect(result.current.items).toHaveLength(1);

      act(() => {
        result.current.removeItem(mockCartItem.id);
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });

    it('should not error when removing non-existent item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.removeItem('non-existent');
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      act(() => {
        result.current.updateQuantity(mockCartItem.id, 3);
      });

      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.items[0].totalPrice).toBe(16.5); // 5.5 * 3
      expect(result.current.itemCount).toBe(3);
      expect(result.current.total).toBe(16.5);
    });

    it('should remove item when quantity is set to 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      act(() => {
        result.current.updateQuantity(mockCartItem.id, 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should not allow negative quantities', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      act(() => {
        result.current.updateQuantity(mockCartItem.id, -1);
      });

      // Should either remove or keep at 0
      expect(result.current.items[0]?.quantity ?? 0).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
        result.current.addItem({ ...mockCartItem, id: 'item-2' });
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('submitOrder', () => {
    const mockOrderResponse: OrderResponse = {
      id: 'order-456',
      businessId: 'biz-123',
      status: OrderStatus.PENDING,
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: [
        {
          id: 'order-item-1',
          name: 'Latte',
          description: 'Medium, Hot',
          quantity: 1,
          unitPrice: 5.5,
          totalPrice: 5.5,
        },
      ],
      totalAmount: 5.5,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
    };

    it('should submit order successfully', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockOrderResponse,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      let orderResult: OrderResponse | undefined;

      await act(async () => {
        orderResult = await result.current.submitOrder({
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
        });
      });

      expect(orderResult).toEqual(mockOrderResponse);
      // Cart should be cleared after successful order
      expect(result.current.items).toHaveLength(0);
    });

    it('should handle order submission error', async () => {
      const mockError = createMockErrorResponse(
        'VALIDATION_ERROR',
        'Customer name is required',
        400
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      await act(async () => {
        await expect(
          result.current.submitOrder({ customerName: '' })
        ).rejects.toThrow();
      });

      // Cart should not be cleared on error
      expect(result.current.items).toHaveLength(1);
    });

    it('should not submit empty cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        await expect(
          result.current.submitOrder({ customerName: 'John' })
        ).rejects.toThrow('Cart is empty');
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should set submitting state during order', async () => {
      // Mock a slow response
      let resolvePromise: (value: Response) => void;
      vi.mocked(global.fetch).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      let submitPromise: Promise<OrderResponse>;

      act(() => {
        submitPromise = result.current.submitOrder({ customerName: 'John' });
      });

      // Should be submitting
      expect(result.current.submitting).toBe(true);

      // Resolve the fetch
      const mockResponse = createMockResponse({
        success: true,
        data: mockOrderResponse,
      });

      await act(async () => {
        resolvePromise!(mockResponse);
        await submitPromise;
      });

      expect(result.current.submitting).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist cart to localStorage', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem(mockCartItem);
      });

      // Check localStorage
      const stored = localStorage.getItem('cart-biz-123');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].baseName).toBe('Latte');
    });

    it('should restore cart from localStorage', () => {
      // Pre-populate localStorage
      localStorage.setItem('cart-biz-123', JSON.stringify([mockCartItem]));

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].baseName).toBe('Latte');
    });
  });
});
