/**
 * Order Service
 * Handles submitting orders to the API
 */

import { OrderStatus, CupSize } from '@drink-ux/shared';
import { apiClient } from './api';

/**
 * Order item input for creating an order
 */
export interface OrderItemInput {
  /** Base drink ID (Square item ID in mapped flow) */
  baseId: string;
  /** Base drink name (for display) */
  baseName: string;
  /** Cup size */
  size: CupSize | string;
  /** Is this a hot drink? */
  isHot: boolean;
  /** Array of modifier IDs */
  modifierIds: string[];
  /** Quantity of this item */
  quantity: number;
  /** Price per unit */
  unitPrice: number;
  /** Total price (quantity * unitPrice + modifiers) */
  totalPrice: number;
  /** Optional notes/special instructions */
  notes?: string;
  /** Modifier details for mapped flow (id, name, price per modifier) */
  modifierDetails?: Array<{ id: string; name: string; price: number }>;
}

/**
 * Order input for submitting an order
 */
export interface OrderInput {
  /** Business ID to submit order to */
  businessId: string;
  /** Customer name (required) */
  customerName: string;
  /** Customer email (optional) */
  customerEmail?: string;
  /** Customer phone (optional) */
  customerPhone?: string;
  /** Order items */
  items: OrderItemInput[];
}

/**
 * Order item in response
 */
export interface OrderItemResponse {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Order response from API
 */
export interface OrderResponse {
  id: string;
  businessId: string;
  /** Order number for display (e.g., ORD-001234) */
  orderNumber?: string;
  /** Pickup code for customer (e.g., A7X) */
  pickupCode?: string;
  posOrderId?: string;
  status: OrderStatus;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItemResponse[];
  totalAmount: number;
  /** Estimated time when order will be ready */
  estimatedReadyAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Submit an order to the API
 *
 * @param order - The order input
 * @returns The created order response
 * @throws ApiClientError on validation or other errors
 */
export async function submitOrder(order: OrderInput): Promise<OrderResponse> {
  // Transform mobile field names to API-expected format
  const apiPayload = {
    businessId: order.businessId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    items: order.items.map((item) => ({
      baseId: item.baseId,
      quantity: item.quantity,
      size: item.size,
      temperature: item.isHot ? 'HOT' : 'ICED',
      modifiers: item.modifierIds,
      notes: item.notes,
      // Mapped flow fields
      unitPrice: item.unitPrice,
      itemName: item.baseName,
      modifierDetails: item.modifierDetails,
    })),
  };
  return apiClient.post<OrderResponse>('/api/orders', apiPayload);
}

/**
 * Get an order by ID
 *
 * @param orderId - The order ID
 * @returns The order response
 * @throws ApiClientError if order not found
 */
export async function getOrder(orderId: string): Promise<OrderResponse> {
  return apiClient.get<OrderResponse>(`/api/orders/${orderId}`);
}

/**
 * Get an order by pickup code
 *
 * @param businessId - The business ID
 * @param pickupCode - The pickup code (case-insensitive)
 * @returns The order response
 * @throws ApiClientError if order not found
 */
export async function getOrderByPickupCode(
  businessId: string,
  pickupCode: string
): Promise<OrderResponse> {
  const normalizedCode = pickupCode.toUpperCase();
  return apiClient.get<OrderResponse>(
    `/api/orders/pickup/${normalizedCode}?businessId=${businessId}`
  );
}

/**
 * Calculate the total price for order items
 *
 * @param items - Array of order items
 * @returns The total price
 */
export function calculateOrderTotal(items: OrderItemInput[]): number {
  return items.reduce((total, item) => total + item.totalPrice, 0);
}

/**
 * Format an order item description
 *
 * @param item - The order item
 * @returns Formatted description string
 */
export function formatOrderItemDescription(item: OrderItemInput): string {
  const parts: string[] = [];

  // Size
  parts.push(formatSize(item.size));

  // Temperature
  parts.push(item.isHot ? 'Hot' : 'Iced');

  // Notes
  if (item.notes) {
    parts.push(item.notes);
  }

  return parts.join(', ');
}

/**
 * Format a cup size for display
 *
 * @param size - The cup size
 * @returns Formatted size string
 */
function formatSize(size: CupSize | string): string {
  switch (size) {
    case CupSize.SMALL:
    case 'SMALL':
      return 'Small';
    case CupSize.MEDIUM:
    case 'MEDIUM':
      return 'Medium';
    case CupSize.LARGE:
    case 'LARGE':
      return 'Large';
    default:
      return String(size);
  }
}

/**
 * Format order status for display
 *
 * @param status - The order status
 * @returns Formatted status string
 */
export function formatOrderStatus(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.PENDING:
      return 'Pending';
    case OrderStatus.CONFIRMED:
      return 'Confirmed';
    case OrderStatus.PREPARING:
      return 'Preparing';
    case OrderStatus.READY:
      return 'Ready for Pickup';
    case OrderStatus.COMPLETED:
      return 'Completed';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    case OrderStatus.FAILED:
      return 'Failed';
    default:
      return String(status);
  }
}

/**
 * Check if an order status is a terminal status (no more updates expected)
 *
 * @param status - The order status
 * @returns True if the status is terminal
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return [
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.FAILED,
  ].includes(status);
}

/**
 * Get the status step number (for progress display)
 *
 * @param status - The order status
 * @returns Step number (0-4)
 */
export function getStatusStep(status: OrderStatus): number {
  switch (status) {
    case OrderStatus.PENDING:
      return 0;
    case OrderStatus.CONFIRMED:
      return 1;
    case OrderStatus.PREPARING:
      return 2;
    case OrderStatus.READY:
      return 3;
    case OrderStatus.COMPLETED:
      return 4;
    case OrderStatus.CANCELLED:
    case OrderStatus.FAILED:
      return -1;
    default:
      return 0;
  }
}

/**
 * Payment result from API
 */
export interface PaymentResponse {
  payment: {
    success: boolean;
    paymentId?: string;
    status?: string;
    error?: {
      code: string;
      message: string;
      detail?: string;
    };
  };
}

/**
 * Submit payment for an existing order
 *
 * @param orderId - The order ID to pay for
 * @param sourceId - Payment token from Square Web Payments SDK
 * @param amount - Amount to charge in dollars
 * @returns Payment result
 */
export async function payOrder(
  orderId: string,
  sourceId: string,
  amount: number
): Promise<PaymentResponse> {
  return apiClient.post<PaymentResponse>(`/api/orders/${orderId}/pay`, {
    sourceId,
    amount,
  });
}

export default {
  submitOrder,
  getOrder,
  getOrderByPickupCode,
  payOrder,
  calculateOrderTotal,
  formatOrderItemDescription,
  formatOrderStatus,
  isTerminalStatus,
  getStatusStep,
};
