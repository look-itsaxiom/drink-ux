import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { OrderStatus } from '@drink-ux/shared';
import { OrderResponse } from '../../services/orderService';

// Mock react-router useParams - must be before component import
vi.mock('react-router', () => ({
  useParams: () => ({ orderId: 'order-456' }),
  useHistory: () => ({
    push: vi.fn(),
    replace: vi.fn(),
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
  IonButton: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  IonList: ({ children }: any) => <ul>{children}</ul>,
  IonItem: ({ children }: any) => <li>{children}</li>,
  IonLabel: ({ children }: any) => <span>{children}</span>,
  IonText: ({ children, color }: any) => <span className={`ion-text-${color}`}>{children}</span>,
  IonSpinner: () => <span data-testid="loading-spinner">Loading...</span>,
  IonIcon: ({ icon }: any) => <span data-testid="ion-icon" />,
  IonCard: ({ children }: any) => <div className="ion-card">{children}</div>,
  IonCardContent: ({ children }: any) => <div className="ion-card-content">{children}</div>,
  IonCardHeader: ({ children }: any) => <div className="ion-card-header">{children}</div>,
  IonCardTitle: ({ children }: any) => <h2>{children}</h2>,
  IonBadge: ({ children, color }: any) => <span className={`badge badge-${color}`}>{children}</span>,
  IonProgressBar: ({ value }: any) => <div data-testid="progress-bar" data-value={value} />,
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

// Create mock for useOrderStatus hook
const mockUseOrderStatus = vi.fn();

vi.mock('../../hooks/useOrderStatus', () => ({
  useOrderStatus: (...args: unknown[]) => mockUseOrderStatus(...args),
}));

// Mock formatOrderStatus and getStatusStep
vi.mock('../../services/orderService', () => ({
  formatOrderStatus: (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'Order Received';
      case OrderStatus.CONFIRMED: return 'Order Confirmed';
      case OrderStatus.PREPARING: return 'Preparing';
      case OrderStatus.READY: return 'Ready for Pickup';
      case OrderStatus.COMPLETED: return 'Order Completed';
      case OrderStatus.CANCELLED: return 'Order Cancelled';
      case OrderStatus.FAILED: return 'Order Failed';
      default: return status;
    }
  },
  getStatusStep: (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 0;
      case OrderStatus.CONFIRMED: return 1;
      case OrderStatus.PREPARING: return 2;
      case OrderStatus.READY: return 3;
      default: return -1;
    }
  },
}));

// Import component after mocks
import OrderConfirmation from '../OrderConfirmation';

describe('OrderConfirmation Page', () => {
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

  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful state
    mockUseOrderStatus.mockReturnValue({
      order: mockOrderResponse,
      status: mockOrderResponse.status,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  describe('order display', () => {
    it('should display order number prominently', async () => {
      render(<OrderConfirmation />);

      await waitFor(() => {
        expect(screen.getByText(/ORD-001234/)).toBeInTheDocument();
      });
    });

    it('should show pickup code in large text', async () => {
      render(<OrderConfirmation />);

      await waitFor(() => {
        const pickupCode = screen.getByText('A7X');
        expect(pickupCode).toBeInTheDocument();
      });
    });

    it('should list all order items', async () => {
      const multiItemOrder: OrderResponse = {
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

      mockUseOrderStatus.mockReturnValue({
        order: multiItemOrder,
        status: multiItemOrder.status,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OrderConfirmation />);

      await waitFor(() => {
        expect(screen.getByText('Latte')).toBeInTheDocument();
        expect(screen.getByText('Americano')).toBeInTheDocument();
      });
    });

    it('should show estimated ready time', async () => {
      render(<OrderConfirmation />);

      await waitFor(() => {
        // Check for estimated text specifically (avoiding multiple matches)
        const estimatedText = screen.queryAllByText(/estimated/i);
        expect(estimatedText.length).toBeGreaterThan(0);
      });
    });

    it('should display current status', async () => {
      render(<OrderConfirmation />);

      await waitFor(() => {
        // Check for the formatted status text
        expect(screen.getByText('Order Received')).toBeInTheDocument();
      });
    });
  });

  describe('status updates', () => {
    it('should show status icon', async () => {
      render(<OrderConfirmation />);

      await waitFor(() => {
        // Should have at least one icon
        const icons = screen.getAllByTestId('ion-icon');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it('should show progress steps', async () => {
      render(<OrderConfirmation />);

      await waitFor(() => {
        // Should show progress step labels
        expect(screen.getByText('Received')).toBeInTheDocument();
        expect(screen.getByText('Confirmed')).toBeInTheDocument();
      });
    });

    it('should show PREPARING status correctly', async () => {
      const preparingOrder = { ...mockOrderResponse, status: OrderStatus.PREPARING };
      mockUseOrderStatus.mockReturnValue({
        order: preparingOrder,
        status: preparingOrder.status,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OrderConfirmation />);

      await waitFor(() => {
        // May have multiple elements showing "Preparing" (status display and progress step)
        const preparingElements = screen.getAllByText(/Preparing/i);
        expect(preparingElements.length).toBeGreaterThan(0);
      });
    });

    it('should show READY status correctly', async () => {
      const readyOrder = { ...mockOrderResponse, status: OrderStatus.READY };
      mockUseOrderStatus.mockReturnValue({
        order: readyOrder,
        status: readyOrder.status,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OrderConfirmation />);

      await waitFor(() => {
        expect(screen.getByText('Ready for Pickup')).toBeInTheDocument();
      });
    });

    it('should show COMPLETED status correctly', async () => {
      const completedOrder = { ...mockOrderResponse, status: OrderStatus.COMPLETED };
      mockUseOrderStatus.mockReturnValue({
        order: completedOrder,
        status: completedOrder.status,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OrderConfirmation />);

      await waitFor(() => {
        expect(screen.getByText('Order Completed')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error if order not found', async () => {
      mockUseOrderStatus.mockReturnValue({
        order: null,
        status: null,
        isLoading: false,
        error: new Error('Order not found'),
        refetch: mockRefetch,
      });

      render(<OrderConfirmation />);

      await waitFor(() => {
        // May have multiple elements showing "not found" (title and message)
        const notFoundElements = screen.getAllByText(/not found/i);
        expect(notFoundElements.length).toBeGreaterThan(0);
      });
    });

    it('should provide retry mechanism for failed fetches', async () => {
      const user = userEvent.setup();
      mockUseOrderStatus.mockReturnValue({
        order: null,
        status: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(<OrderConfirmation />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('should show loading state initially', async () => {
      mockUseOrderStatus.mockReturnValue({
        order: null,
        status: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<OrderConfirmation />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('copy pickup code', () => {
    it('should have copy button for pickup code', async () => {
      const user = userEvent.setup();

      // Mock clipboard API using Object.defineProperty
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
      });

      render(<OrderConfirmation />);

      await waitFor(() => {
        expect(screen.getByText('A7X')).toBeInTheDocument();
      });

      // Look for copy button
      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('A7X');
    });
  });

  describe('order details', () => {
    it('should show order total', async () => {
      render(<OrderConfirmation />);

      await waitFor(() => {
        // Look for the total amount - there might be multiple $5.50 elements
        const prices = screen.getAllByText(/\$5\.50/);
        expect(prices.length).toBeGreaterThan(0);
      });
    });

    it('should show item quantities', async () => {
      const multiQuantityOrder: OrderResponse = {
        ...mockOrderResponse,
        items: [
          {
            ...mockOrderResponse.items[0],
            quantity: 2,
            totalPrice: 11.0,
          },
        ],
        totalAmount: 11.0,
      };

      mockUseOrderStatus.mockReturnValue({
        order: multiQuantityOrder,
        status: multiQuantityOrder.status,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<OrderConfirmation />);

      await waitFor(() => {
        expect(screen.getByText(/x2/)).toBeInTheDocument();
      });
    });

    it('should show item descriptions', async () => {
      render(<OrderConfirmation />);

      await waitFor(() => {
        expect(screen.getByText(/Medium, Hot, Vanilla Syrup/)).toBeInTheDocument();
      });
    });
  });

  describe('refresh functionality', () => {
    it('should allow manual refresh', async () => {
      const user = userEvent.setup();
      render(<OrderConfirmation />);

      await waitFor(() => {
        expect(screen.getByText('A7X')).toBeInTheDocument();
      });

      // Find refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
