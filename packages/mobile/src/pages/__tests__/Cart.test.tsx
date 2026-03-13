import { render, screen } from '@testing-library/react';

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: vi.fn(() => ({ logoUrl: null, isLoading: false })),
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

  it('renders back button', () => {
    render(<Cart />);
    expect(screen.getByTestId('back-button')).toBeInTheDocument();
  });

  it('shows cart item "Classic Latte"', () => {
    render(<Cart />);
    expect(screen.getByText('Classic Latte')).toBeInTheDocument();
  });

  it('shows "Medium" size', () => {
    render(<Cart />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('shows item price of $5.00', () => {
    render(<Cart />);
    const priceElements = screen.getAllByText('$5.00', { exact: false });
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows total of $5.00', () => {
    render(<Cart />);
    expect(screen.getByText(/Total:.*\$5\.00/)).toBeInTheDocument();
  });

  it('renders "Send to POS" button', () => {
    render(<Cart />);
    expect(screen.getByText('Send to POS')).toBeInTheDocument();
  });
});
