import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '@drink-ux/shared';
import {
  submitOrder,
  OrderInput,
  OrderItemInput,
  OrderResponse,
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
});
