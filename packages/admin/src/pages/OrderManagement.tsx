import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

type StatusFilter = 'ALL' | OrderStatus;

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  size: string;
  temperature: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  pickupCode: string;
  status: OrderStatus;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  subtotal: number;
  tax: number;
  total: number;
  items: OrderItem[];
  createdAt: string;
  estimatedReadyAt?: string;
}

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Accepted' },
  { value: 'READY', label: 'Ready' },
  { value: 'COMPLETED', label: 'Completed' },
];

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#fff7ed', text: '#c2410c' },
  CONFIRMED: { bg: '#eff6ff', text: '#1d4ed8' },
  PREPARING: { bg: '#eef2ff', text: '#4338ca' },
  READY: { bg: '#ecfdf5', text: '#047857' },
  COMPLETED: { bg: '#f3f4f6', text: '#374151' },
  CANCELLED: { bg: '#fef2f2', text: '#b91c1c' },
  FAILED: { bg: '#fef2f2', text: '#b91c1c' },
};

const formatCurrency = (value: number): string => `$${value.toFixed(2)}`;

const formatOrderStatus = (status: OrderStatus): string =>
  status.charAt(0) + status.slice(1).toLowerCase();

const getNextAction = (status: OrderStatus): { label: string; nextStatus: OrderStatus } | null => {
  switch (status) {
    case 'PENDING':
      return { label: 'Accept Order', nextStatus: 'CONFIRMED' };
    case 'CONFIRMED':
    case 'PREPARING':
      return { label: 'Mark Ready', nextStatus: 'READY' };
    case 'READY':
      return { label: 'Complete Order', nextStatus: 'COMPLETED' };
    default:
      return null;
  }
};

const OrderManagement: React.FC = () => {
  const { user } = useAuth();
  const businessId = user?.businessId;

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.set('limit', '100');
      if (statusFilter !== 'ALL') {
        query.set('status', statusFilter);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/business-orders/${businessId}/orders?${query.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to load orders');
      }

      const data = await response.json();
      const nextOrders = Array.isArray(data.data?.orders) ? data.data.orders : [];

      setOrders(nextOrders);
      setSelectedOrderId(current => {
        if (current && nextOrders.some((order: Order) => order.id === current)) {
          return current;
        }
        return nextOrders[0]?.id || null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
      setSelectedOrderId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [businessId, statusFilter]);

  const selectedOrder = useMemo(
    () => orders.find(order => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const applyStatusUpdate = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingStatus(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update order status');
      }

      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Order Management</h1>
        <p>Monitor your incoming queue and update order progress.</p>
      </div>

      {error && (
        <div className="orders-error-banner">
          {error}
        </div>
      )}

      <div className="card">
        <div className="orders-toolbar">
          <div className="orders-filter-group">
            {STATUS_FILTERS.map(filter => (
              <button
                key={filter.value}
                type="button"
                className={`orders-filter-btn ${statusFilter === filter.value ? 'active' : ''}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-secondary" onClick={fetchOrders}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="orders-loading">Loading orders...</div>
        ) : (
          <div className="orders-layout">
            <aside className="orders-queue">
              {orders.length === 0 ? (
                <p className="orders-empty">No orders match this filter.</p>
              ) : (
                orders.map(order => (
                  <button
                    key={order.id}
                    type="button"
                    className={`order-row ${selectedOrderId === order.id ? 'active' : ''}`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="order-row-top">
                      <span className="order-row-number">#{order.orderNumber}</span>
                      <span
                        className="order-row-status"
                        style={{
                          backgroundColor: STATUS_COLORS[order.status].bg,
                          color: STATUS_COLORS[order.status].text,
                        }}
                      >
                        {formatOrderStatus(order.status)}
                      </span>
                    </div>
                    <div className="order-row-customer">{order.customerName}</div>
                    <div className="order-row-meta">
                      <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                      <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <div className="order-row-total">{formatCurrency(order.total)}</div>
                  </button>
                ))
              )}
            </aside>

            <section className="orders-detail">
              {!selectedOrder ? (
                <div className="orders-empty-detail">Select an order to view details.</div>
              ) : (
                <>
                  <div className="orders-detail-header">
                    <div>
                      <h3>Order #{selectedOrder.orderNumber}</h3>
                      <p>Pickup code: <strong>{selectedOrder.pickupCode}</strong></p>
                    </div>
                    <span
                      className="order-row-status"
                      style={{
                        backgroundColor: STATUS_COLORS[selectedOrder.status].bg,
                        color: STATUS_COLORS[selectedOrder.status].text,
                      }}
                    >
                      {formatOrderStatus(selectedOrder.status)}
                    </span>
                  </div>

                  <div className="orders-detail-grid">
                    <div>
                      <label>Customer</label>
                      <p>{selectedOrder.customerName}</p>
                    </div>
                    <div>
                      <label>Created</label>
                      <p>{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <label>Phone</label>
                      <p>{selectedOrder.customerPhone || '-'}</p>
                    </div>
                    <div>
                      <label>Email</label>
                      <p>{selectedOrder.customerEmail || '-'}</p>
                    </div>
                  </div>

                  <div className="orders-items">
                    <h4>Items</h4>
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="orders-item-row">
                        <div>
                          <strong>{item.quantity}x {item.name}</strong>
                          <p>{item.size} • {item.temperature}</p>
                        </div>
                        <span>{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="orders-totals">
                    <div><span>Subtotal</span><strong>{formatCurrency(selectedOrder.subtotal)}</strong></div>
                    <div><span>Tax</span><strong>{formatCurrency(selectedOrder.tax)}</strong></div>
                    <div className="grand-total"><span>Total</span><strong>{formatCurrency(selectedOrder.total)}</strong></div>
                  </div>

                  {selectedOrder.notes && (
                    <div className="orders-note">
                      <h4>Order Note</h4>
                      <p>{selectedOrder.notes}</p>
                    </div>
                  )}

                  {getNextAction(selectedOrder.status) && (
                    <div className="orders-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={updatingStatus}
                        onClick={() => {
                          const action = getNextAction(selectedOrder.status);
                          if (action) {
                            applyStatusUpdate(selectedOrder.id, action.nextStatus);
                          }
                        }}
                      >
                        {updatingStatus ? 'Updating...' : getNextAction(selectedOrder.status)?.label}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;
