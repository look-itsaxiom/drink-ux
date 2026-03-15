/**
 * useCart Hook and CartProvider
 * Manages shopping cart state with persistence
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { submitOrder, OrderInput, OrderResponse } from '../services/orderService';
import { ApiClientError } from '../services/api';

/**
 * Cart item structure
 */
export interface CartItem {
  /** Unique ID for this cart item */
  id: string;
  /** Base drink ID (Square item ID in mapped flow) */
  baseId: string;
  /** Base drink name */
  baseName: string;
  /** Variation name (e.g., "Small", "Regular", "12 oz") */
  size: string;
  /** Is this a hot item? undefined if temperature is not relevant */
  isHot?: boolean;
  /** Array of modifier IDs */
  modifierIds: string[];
  /** Array of modifier names for display */
  modifierNames: string[];
  /** Quantity */
  quantity: number;
  /** Price per unit (base + modifiers) */
  unitPrice: number;
  /** Total price (unitPrice * quantity) */
  totalPrice: number;
  /** Special instructions */
  notes?: string;
  /** Modifier details for mapped flow (id, name, price per modifier) */
  modifierDetails?: Array<{ id: string; name: string; price: number }>;
}

/**
 * Customer info for order submission
 */
export interface CustomerInfo {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Pending order information for checkout recovery
 */
export interface PendingOrderInfo {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Cart context value
 */
export interface CartContextValue {
  /** Cart items */
  items: CartItem[];
  /** Total item count (considering quantities) */
  itemCount: number;
  /** Total price */
  total: number;
  /** Add item to cart */
  addItem: (item: CartItem) => void;
  /** Remove item from cart */
  removeItem: (itemId: string) => void;
  /** Update item quantity */
  updateQuantity: (itemId: string, quantity: number) => void;
  /** Clear all items */
  clearCart: () => void;
  /** Submit order */
  submitOrder: (customerInfo: CustomerInfo) => Promise<OrderResponse>;
  /** Is order being submitted? */
  submitting: boolean;
  /** Last order error */
  orderError: string | null;
  /** Pending order info from interrupted checkout */
  pendingOrderInfo: PendingOrderInfo | null;
  /** Clear pending order info */
  clearPendingOrder: () => void;
}

// Create context
const CartContext = createContext<CartContextValue | null>(null);

/**
 * Get the localStorage key for a business cart
 */
function getStorageKey(businessId: string): string {
  return `cart-${businessId}`;
}

/**
 * Get the localStorage key for pending order
 */
function getPendingOrderKey(businessId: string): string {
  return `pending-order-${businessId}`;
}

/**
 * Pending order expiry time (30 minutes)
 */
const PENDING_ORDER_EXPIRY_MS = 30 * 60 * 1000;

/**
 * Generate a unique ID for cart items
 */
function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Cart Provider Props
 */
export interface CartProviderProps {
  /** Business ID for cart persistence */
  businessId: string;
  /** Children components */
  children: ReactNode;
}

/**
 * Stored pending order structure
 */
interface StoredPendingOrder {
  customerInfo: CustomerInfo;
  items: CartItem[];
  timestamp: number;
}

/**
 * Cart Provider component
 */
export function CartProvider({ businessId, children }: CartProviderProps): JSX.Element {
  const [items, setItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [pendingOrderInfo, setPendingOrderInfo] = useState<PendingOrderInfo | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const storageKey = getStorageKey(businessId);
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem(storageKey);
      }
    }
  }, [businessId]);

  // Load pending order info on mount
  useEffect(() => {
    const pendingKey = getPendingOrderKey(businessId);
    const stored = localStorage.getItem(pendingKey);

    if (stored) {
      try {
        const parsed: StoredPendingOrder = JSON.parse(stored);
        const now = Date.now();

        // Check if pending order has expired
        if (now - parsed.timestamp > PENDING_ORDER_EXPIRY_MS) {
          // Clear expired pending order
          localStorage.removeItem(pendingKey);
          setPendingOrderInfo(null);
        } else {
          // Restore pending order info
          setPendingOrderInfo({
            customerName: parsed.customerInfo.customerName,
            customerEmail: parsed.customerInfo.customerEmail,
            customerPhone: parsed.customerInfo.customerPhone,
          });
        }
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem(pendingKey);
      }
    }
  }, [businessId]);

  // Save cart to localStorage when items change
  useEffect(() => {
    const storageKey = getStorageKey(businessId);

    if (items.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [items, businessId]);

  // Calculate derived values
  const itemCount = useMemo(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  // Add item to cart
  const addItem = useCallback((item: CartItem) => {
    const newItem: CartItem = {
      ...item,
      id: item.id || generateItemId(),
    };

    setItems((prev) => [...prev, newItem]);
  }, []);

  // Remove item from cart
  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Update item quantity
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity,
            totalPrice: item.unitPrice * quantity,
          };
        }
        return item;
      })
    );
  }, []);

  // Clear all items
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Clear pending order info
  const clearPendingOrder = useCallback(() => {
    const pendingKey = getPendingOrderKey(businessId);
    localStorage.removeItem(pendingKey);
    setPendingOrderInfo(null);
  }, [businessId]);

  // Save pending order before submission
  const savePendingOrder = useCallback((customerInfo: CustomerInfo) => {
    const pendingKey = getPendingOrderKey(businessId);
    const pendingOrder: StoredPendingOrder = {
      customerInfo,
      items,
      timestamp: Date.now(),
    };
    localStorage.setItem(pendingKey, JSON.stringify(pendingOrder));
    setPendingOrderInfo({
      customerName: customerInfo.customerName,
      customerEmail: customerInfo.customerEmail,
      customerPhone: customerInfo.customerPhone,
    });
  }, [businessId, items]);

  // Submit order
  const handleSubmitOrder = useCallback(
    async (customerInfo: CustomerInfo): Promise<OrderResponse> => {
      if (items.length === 0) {
        throw new Error('Cart is empty');
      }

      setSubmitting(true);
      setOrderError(null);

      // Save pending order for recovery
      savePendingOrder(customerInfo);

      try {
        const orderInput: OrderInput = {
          businessId,
          customerName: customerInfo.customerName,
          customerEmail: customerInfo.customerEmail,
          customerPhone: customerInfo.customerPhone,
          items: items.map((item) => ({
            baseId: item.baseId,
            baseName: item.baseName,
            size: item.size,
            isHot: item.isHot,
            modifierIds: item.modifierIds,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
            modifierDetails: item.modifierDetails,
          })),
        };

        const response = await submitOrder(orderInput);

        // Clear cart and pending order on successful order
        clearCart();
        clearPendingOrder();

        return response;
      } catch (err) {
        // Preserve cart on failure - don't clear items
        if (err instanceof ApiClientError) {
          setOrderError(err.message);
        } else if (err instanceof Error) {
          setOrderError(err.message);
        } else {
          setOrderError('An unexpected error occurred');
        }
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [businessId, items, clearCart, clearPendingOrder, savePendingOrder]
  );

  const value: CartContextValue = {
    items,
    itemCount,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    submitOrder: handleSubmitOrder,
    submitting,
    orderError,
    pendingOrderInfo,
    clearPendingOrder,
  };

  return React.createElement(CartContext.Provider, { value }, children);
}

/**
 * Hook to access cart state and actions
 *
 * @returns Cart context value
 * @throws Error if used outside CartProvider
 *
 * @example
 * ```tsx
 * const { items, total, addItem, submitOrder } = useCart();
 *
 * const handleAddToCart = () => {
 *   addItem({
 *     baseId: 'base-1',
 *     baseName: 'Latte',
 *     size: 'MEDIUM',
 *     isHot: true,
 *     modifierIds: ['mod-1'],
 *     modifierNames: ['Vanilla'],
 *     quantity: 1,
 *     unitPrice: 5.50,
 *     totalPrice: 5.50,
 *   });
 * };
 *
 * const handleCheckout = async () => {
 *   const order = await submitOrder({
 *     customerName: 'John Doe',
 *     customerEmail: 'john@example.com',
 *   });
 *   console.log('Order created:', order.id);
 * };
 * ```
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}

export default useCart;
