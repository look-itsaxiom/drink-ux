import { render, screen } from '@testing-library/react';

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: vi.fn(() => ({ logoUrl: null, isLoading: false })),
}));

vi.mock('../../hooks/useCart', () => ({
  useCart: vi.fn(() => ({
    items: [
      {
        id: '1',
        baseId: 'demo-base',
        baseName: 'Classic Latte',
        size: 'MEDIUM',
        isHot: true,
        modifierIds: [],
        modifierNames: [],
        notes: '',
        quantity: 1,
        unitPrice: 5.0,
        totalPrice: 5.0,
      },
    ],
    total: 5.0,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
  })),
  CartItem: {},
}));

import Cart from '../Cart';

describe('Cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AppHeader with "Your Cart" title', () => {
    render(<Cart />);
    expect(screen.getByText('Your Cart')).toBeInTheDocument();
  });

  it('shows cart item "Classic Latte"', () => {
    render(<Cart />);
    expect(screen.getByText('Classic Latte')).toBeInTheDocument();
  });

  it('shows "Medium" size in description', () => {
    render(<Cart />);
    expect(screen.getByText(/Medium/)).toBeInTheDocument();
  });

  it('shows item price of $5.00', () => {
    render(<Cart />);
    const priceElements = screen.getAllByText('$5.00', { exact: false });
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows total section', () => {
    render(<Cart />);
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders "Proceed to Checkout" button', () => {
    render(<Cart />);
    expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
  });
});
