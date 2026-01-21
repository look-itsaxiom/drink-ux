import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { OrderStatus } from '@drink-ux/shared';
import { CartItem } from '../../hooks/useCart';
import { OrderResponse } from '../../services/orderService';

// Mock react-router
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useHistory: () => ({
    push: mockNavigate,
    replace: mockNavigate,
    goBack: vi.fn(),
  }),
}));

// Mock Ionic components
vi.mock('@ionic/react', () => ({
  IonPage: ({ children }: any) => <div data-testid="ion-page">{children}</div>,
  IonContent: ({ children }: any) => <div data-testid="ion-content">{children}</div>,
  IonHeader: ({ children }: any) => <header>{children}</header>,
  IonToolbar: ({ children }: any) => <div className="toolbar">{children}</div>,
  IonTitle: ({ children }: any) => <h1>{children}</h1>,
  IonBackButton: ({ defaultHref }: any) => <a href={defaultHref}>Back</a>,
  IonButtons: ({ children }: any) => <div>{children}</div>,
  IonButton: ({ children, onClick, disabled, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type || 'button'} {...props}>
      {children}
    </button>
  ),
  IonList: ({ children }: any) => <ul>{children}</ul>,
  IonItem: ({ children }: any) => <li>{children}</li>,
  IonLabel: ({ children }: any) => <span>{children}</span>,
  IonText: ({ children, color }: any) => <span className={`ion-text-${color}`}>{children}</span>,
  IonSpinner: () => <span data-testid="loading-spinner">Loading...</span>,
  IonIcon: ({ icon }: any) => <span data-testid="ion-icon" />,
  IonInput: ({ label, value, onIonInput, onIonChange, disabled, 'data-testid': testId, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input
        value={value || ''}
        disabled={disabled}
        onChange={(e) => {
          if (onIonInput) onIonInput({ detail: { value: e.target.value } });
          if (onIonChange) onIonChange({ detail: { value: e.target.value } });
        }}
        aria-label={label}
        data-testid={testId || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
        {...props}
      />
    </div>
  ),
  IonFooter: ({ children }: any) => <footer>{children}</footer>,
  IonCard: ({ children }: any) => <div className="ion-card">{children}</div>,
  IonCardContent: ({ children }: any) => <div className="ion-card-content">{children}</div>,
  IonCardHeader: ({ children }: any) => <div className="ion-card-header">{children}</div>,
  IonCardTitle: ({ children }: any) => <h2>{children}</h2>,
  IonBadge: ({ children }: any) => <span className="badge">{children}</span>,
  IonNote: ({ children, color }: any) => <span className={`ion-note ${color ? `ion-note-${color}` : ''}`}>{children}</span>,
  useIonRouter: () => ({
    push: vi.fn(),
    goBack: vi.fn(),
  }),
  useIonViewWillEnter: vi.fn(),
}));

// Mock AppHeader
vi.mock('../../components/AppHeader', () => ({
  default: ({ title, showBackButton }: any) => (
    <header data-testid="app-header">
      {showBackButton && <button>Back</button>}
      <span>{title}</span>
    </header>
  ),
}));

// Mock useCart
const mockSubmitOrder = vi.fn();
const mockCartItems: CartItem[] = [];

vi.mock('../../hooks/useCart', () => ({
  useCart: () => ({
    items: mockCartItems,
    total: mockCartItems.reduce((sum, item) => sum + item.totalPrice, 0),
    itemCount: mockCartItems.reduce((sum, item) => sum + item.quantity, 0),
    submitOrder: mockSubmitOrder,
    orderError: null,
    submitting: false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  }),
  CartProvider: ({ children }: any) => children,
  CartItem: {} as any,
}));

// Import component after mocks
import Checkout from '../Checkout';

describe('Checkout Page', () => {
  const mockCartItem: CartItem = {
    id: 'item-1',
    baseId: 'base-1',
    baseName: 'Latte',
    size: 'MEDIUM',
    isHot: true,
    modifierIds: ['mod-1'],
    modifierNames: ['Vanilla Syrup'],
    quantity: 1,
    unitPrice: 5.5,
    totalPrice: 5.5,
    notes: '',
  };

  const mockOrderResponse: OrderResponse = {
    id: 'order-456',
    businessId: 'biz-123',
    orderNumber: 'ORD-001234',
    pickupCode: 'A7X',
    status: OrderStatus.PENDING,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    items: [
      {
        id: 'item-1',
        name: 'Latte',
        description: 'Medium, Hot, Vanilla Syrup',
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

  // Helper to submit form
  const submitForm = () => {
    const form = document.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset mock cart items
    mockCartItems.length = 0;
    mockCartItems.push(mockCartItem);
    mockSubmitOrder.mockResolvedValue(mockOrderResponse);
  });

  describe('cart summary', () => {
    it('should render cart summary correctly', async () => {
      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByText('Latte')).toBeInTheDocument();
      });

      // May have multiple $5.50 elements (item price and total)
      const priceElements = screen.getAllByText(/\$5\.50/);
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('should show item quantity', async () => {
      mockCartItems.length = 0;
      mockCartItems.push({ ...mockCartItem, quantity: 2, totalPrice: 11 });

      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByText(/x2/i)).toBeInTheDocument();
      });
    });

    it('should show total for multiple items', async () => {
      mockCartItems.length = 0;
      mockCartItems.push(mockCartItem);
      mockCartItems.push({ ...mockCartItem, id: 'item-2', baseName: 'Americano', totalPrice: 4.5 });

      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByText('Latte')).toBeInTheDocument();
        expect(screen.getByText('Americano')).toBeInTheDocument();
      });

      // Total should be $10.00
      expect(screen.getByText(/\$10\.00/)).toBeInTheDocument();
    });
  });

  describe('customer info form', () => {
    it('should show customer info form', async () => {
      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('input-name')).toBeInTheDocument();
      });
    });

    it('should require customer name', async () => {
      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('input-name')).toBeInTheDocument();
      });

      // Try to submit without name
      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('order submission', () => {
    it('should submit order with correct data', async () => {
      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('input-name')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John Doe' } });
      submitForm();

      await waitFor(() => {
        expect(mockSubmitOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            customerName: 'John Doe',
          })
        );
      });
    });

    it('should navigate to confirmation on success', async () => {
      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('input-name')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John Doe' } });
      submitForm();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/order/order-456');
      });
    });
  });

  describe('validation', () => {
    it('should validate phone format if provided', async () => {
      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('input-name')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('input-phone-(optional)'), { target: { value: 'abc' } });
      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/invalid phone/i)).toBeInTheDocument();
      });
    });

    it('should validate email format if provided', async () => {
      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('input-name')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('input-email-(optional)'), { target: { value: 'notanemail' } });
      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error message on API failure', async () => {
      mockSubmitOrder.mockRejectedValueOnce(new Error('Something went wrong'));

      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('input-name')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John Doe' } });
      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      mockSubmitOrder
        .mockRejectedValueOnce(new Error('Something went wrong'))
        .mockResolvedValueOnce(mockOrderResponse);

      render(<Checkout />);

      await waitFor(() => {
        expect(screen.getByTestId('input-name')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John Doe' } });
      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Retry
      submitForm();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    it('should redirect to home if cart is empty', async () => {
      mockCartItems.length = 0;
      render(<Checkout />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/home');
      });
    });
  });
});
