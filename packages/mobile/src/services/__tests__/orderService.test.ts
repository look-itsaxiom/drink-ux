import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '@drink-ux/shared';
import {
  submitOrder,
  getOrder,
  getOrderByPickupCode,
  OrderInput,
  OrderItemInput,
  OrderResponse,
  calculateOrderTotal,
  formatOrderItemDescription,
  formatOrderStatus,
} from '../orderService';
import { ApiClientError } from '../api';
import { createMockResponse, createMockErrorResponse } from '../../test/setup';

describe('orderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrderItem: OrderItemInput = {
    baseId: 'base-1',
    baseName: 'Latte',
    size: 'MEDIUM',
    isHot: true,
    modifierIds: ['mod-1', 'mod-2'],
    quantity: 1,
    unitPrice: 5.5,
    totalPrice: 5.5,
    notes: 'Extra hot',
  };

  const mockOrderInput: OrderInput = {
    businessId: 'biz-123',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '555-1234',
    items: [mockOrderItem],
  };

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
        description: 'Medium, Hot, Extra hot',
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

  describe('submitOrder', () => {
    it('should submit order successfully', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockOrderResponse,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await submitOrder(mockOrderInput);

      expect(result).toEqual(mockOrderResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockOrderInput),
        })
      );
    });

    it('should return order with pickup code', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockOrderResponse,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await submitOrder(mockOrderInput);

      expect(result.pickupCode).toBe('A7X');
      expect(result.orderNumber).toBe('ORD-001234');
    });

    it('should throw ApiClientError on validation error', async () => {
      const mockError = createMockErrorResponse(
        'VALIDATION_ERROR',
        'Customer name is required',
        400
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      const invalidOrder = { ...mockOrderInput, customerName: '' };

      await expect(submitOrder(invalidOrder)).rejects.toThrow(ApiClientError);

      try {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          createMockErrorResponse('VALIDATION_ERROR', 'Customer name is required', 400)
        );
        await submitOrder(invalidOrder);
      } catch (error) {
        expect((error as ApiClientError).code).toBe('VALIDATION_ERROR');
        expect((error as ApiClientError).status).toBe(400);
      }
    });

    it('should throw ApiClientError when business not found', async () => {
      const mockError = createMockErrorResponse(
        'BUSINESS_NOT_FOUND',
        'Business not found',
        404
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      const invalidOrder = { ...mockOrderInput, businessId: 'invalid-biz' };

      await expect(submitOrder(invalidOrder)).rejects.toThrow(ApiClientError);

      try {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          createMockErrorResponse('BUSINESS_NOT_FOUND', 'Not found', 404)
        );
        await submitOrder(invalidOrder);
      } catch (error) {
        expect((error as ApiClientError).code).toBe('BUSINESS_NOT_FOUND');
      }
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(submitOrder(mockOrderInput)).rejects.toThrow(ApiClientError);

      try {
        vi.mocked(global.fetch).mockRejectedValueOnce(
          new TypeError('Failed to fetch')
        );
        await submitOrder(mockOrderInput);
      } catch (error) {
        expect((error as ApiClientError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should handle server errors', async () => {
      const mockError = createMockErrorResponse(
        'INTERNAL_ERROR',
        'Failed to create order',
        500
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      await expect(submitOrder(mockOrderInput)).rejects.toThrow(ApiClientError);

      try {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          createMockErrorResponse('INTERNAL_ERROR', 'Server error', 500)
        );
        await submitOrder(mockOrderInput);
      } catch (error) {
        expect((error as ApiClientError).status).toBe(500);
      }
    });

    it('should submit order with multiple items', async () => {
      const multiItemOrder: OrderInput = {
        ...mockOrderInput,
        items: [
          mockOrderItem,
          {
            baseId: 'base-2',
            baseName: 'Americano',
            size: 'LARGE',
            isHot: false,
            modifierIds: [],
            quantity: 2,
            unitPrice: 4.0,
            totalPrice: 8.0,
          },
        ],
      };

      const multiItemResponse: OrderResponse = {
        ...mockOrderResponse,
        items: [
          mockOrderResponse.items[0],
          {
            id: 'item-2',
            name: 'Americano',
            description: 'Large, Iced',
            quantity: 2,
            unitPrice: 4.0,
            totalPrice: 8.0,
          },
        ],
        totalAmount: 13.5,
      };

      const mockResponse = createMockResponse({
        success: true,
        data: multiItemResponse,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await submitOrder(multiItemOrder);

      expect(result.items).toHaveLength(2);
      expect(result.totalAmount).toBe(13.5);
    });

    it('should handle POS integration errors gracefully', async () => {
      // POS might be down but order should still be created
      const orderWithPosWarning: OrderResponse = {
        ...mockOrderResponse,
        status: OrderStatus.PENDING,
        posOrderId: undefined, // No POS order created
      };

      const mockResponse = createMockResponse({
        success: true,
        data: orderWithPosWarning,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await submitOrder(mockOrderInput);

      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.posOrderId).toBeUndefined();
    });
  });

  describe('getOrder', () => {
    it('should fetch order by ID successfully', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockOrderResponse,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await getOrder('order-456');

      expect(result).toEqual(mockOrderResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/order-456'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw ApiClientError when order not found', async () => {
      const mockError = createMockErrorResponse(
        'ORDER_NOT_FOUND',
        'Order not found',
        404
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      await expect(getOrder('non-existent')).rejects.toThrow(ApiClientError);

      try {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          createMockErrorResponse('ORDER_NOT_FOUND', 'Order not found', 404)
        );
        await getOrder('non-existent');
      } catch (error) {
        expect((error as ApiClientError).code).toBe('ORDER_NOT_FOUND');
        expect((error as ApiClientError).status).toBe(404);
      }
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(getOrder('order-456')).rejects.toThrow(ApiClientError);

      try {
        vi.mocked(global.fetch).mockRejectedValueOnce(
          new TypeError('Failed to fetch')
        );
        await getOrder('order-456');
      } catch (error) {
        expect((error as ApiClientError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should return order with all status fields', async () => {
      const preparingOrder: OrderResponse = {
        ...mockOrderResponse,
        status: OrderStatus.PREPARING,
        estimatedReadyAt: '2024-01-15T10:50:00Z',
      };

      const mockResponse = createMockResponse({
        success: true,
        data: preparingOrder,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await getOrder('order-456');

      expect(result.status).toBe(OrderStatus.PREPARING);
      expect(result.estimatedReadyAt).toBe('2024-01-15T10:50:00Z');
      expect(result.pickupCode).toBe('A7X');
    });
  });

  describe('getOrderByPickupCode', () => {
    it('should fetch order by pickup code successfully', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockOrderResponse,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await getOrderByPickupCode('biz-123', 'A7X');

      expect(result).toEqual(mockOrderResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/pickup/A7X'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should include businessId in the request', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockOrderResponse,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      await getOrderByPickupCode('biz-123', 'A7X');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/businessId=biz-123/),
        expect.any(Object)
      );
    });

    it('should throw ApiClientError when pickup code not found', async () => {
      const mockError = createMockErrorResponse(
        'ORDER_NOT_FOUND',
        'Order with pickup code not found',
        404
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      await expect(getOrderByPickupCode('biz-123', 'XXX')).rejects.toThrow(ApiClientError);

      try {
        vi.mocked(global.fetch).mockResolvedValueOnce(
          createMockErrorResponse('ORDER_NOT_FOUND', 'Not found', 404)
        );
        await getOrderByPickupCode('biz-123', 'XXX');
      } catch (error) {
        expect((error as ApiClientError).code).toBe('ORDER_NOT_FOUND');
      }
    });

    it('should handle case-insensitive pickup codes', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockOrderResponse,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const result = await getOrderByPickupCode('biz-123', 'a7x');

      expect(result.pickupCode).toBe('A7X');
    });
  });

  describe('calculateOrderTotal', () => {
    it('should calculate total for single item', () => {
      const items = [mockOrderItem];
      expect(calculateOrderTotal(items)).toBe(5.5);
    });

    it('should calculate total for multiple items', () => {
      const items = [
        mockOrderItem,
        { ...mockOrderItem, totalPrice: 8.0 },
      ];
      expect(calculateOrderTotal(items)).toBe(13.5);
    });

    it('should return 0 for empty array', () => {
      expect(calculateOrderTotal([])).toBe(0);
    });
  });

  describe('formatOrderItemDescription', () => {
    it('should format hot drink correctly', () => {
      const description = formatOrderItemDescription(mockOrderItem);
      expect(description).toContain('Medium');
      expect(description).toContain('Hot');
    });

    it('should format iced drink correctly', () => {
      const icedItem = { ...mockOrderItem, isHot: false };
      const description = formatOrderItemDescription(icedItem);
      expect(description).toContain('Iced');
    });

    it('should include notes when present', () => {
      const description = formatOrderItemDescription(mockOrderItem);
      expect(description).toContain('Extra hot');
    });
  });

  describe('formatOrderStatus', () => {
    it('should format PENDING status', () => {
      expect(formatOrderStatus(OrderStatus.PENDING)).toBe('Pending');
    });

    it('should format CONFIRMED status', () => {
      expect(formatOrderStatus(OrderStatus.CONFIRMED)).toBe('Confirmed');
    });

    it('should format PREPARING status', () => {
      expect(formatOrderStatus(OrderStatus.PREPARING)).toBe('Preparing');
    });

    it('should format READY status', () => {
      expect(formatOrderStatus(OrderStatus.READY)).toBe('Ready for Pickup');
    });

    it('should format COMPLETED status', () => {
      expect(formatOrderStatus(OrderStatus.COMPLETED)).toBe('Completed');
    });

    it('should format CANCELLED status', () => {
      expect(formatOrderStatus(OrderStatus.CANCELLED)).toBe('Cancelled');
    });

    it('should format FAILED status', () => {
      expect(formatOrderStatus(OrderStatus.FAILED)).toBe('Failed');
    });
  });
});
