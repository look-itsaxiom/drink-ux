import { render, screen } from '@testing-library/react';

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: vi.fn(() => ({ logoUrl: null, isLoading: false })),
}));

vi.mock('ionicons/icons', () => ({
  addCircleOutline: 'mock-icon',
  closeCircle: 'mock-icon',
  cafeOutline: 'mock-icon',
  leafOutline: 'mock-icon',
  wineOutline: 'mock-icon',
  colorFillOutline: 'mock-icon',
  snowOutline: 'mock-icon',
  sparklesOutline: 'mock-icon',
  alertCircleOutline: 'mock-icon',
  arrowBack: 'mock-icon',
}));

vi.mock('../../hooks/useCart', () => ({
  useCart: vi.fn(() => ({
    items: [],
    total: 0,
    itemCount: 0,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    submitOrder: vi.fn(),
    submitting: false,
    orderError: null,
    pendingOrderInfo: null,
    clearPendingOrder: vi.fn(),
  })),
  CartItem: {},
}));

vi.mock('../../context/CatalogContext', () => ({
  useCatalogContext: vi.fn(() => ({
    categories: [],
    bases: [],
    modifiers: [],
    loading: false,
    error: null,
  })),
}));

const mockPush = vi.fn();

vi.mock('react-router', () => ({
  useHistory: vi.fn(() => ({ push: mockPush })),
}));

import DrinkBuilder from '../DrinkBuilder';

describe('DrinkBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AppHeader with "Build Your Drink" title', () => {
    render(<DrinkBuilder />);
    expect(screen.getByText('Build Your Drink')).toBeInTheDocument();
  });

  it('shows CategorySelector on initial render (category step)', () => {
    render(<DrinkBuilder />);
    expect(screen.getByText('What would you like?')).toBeInTheDocument();
  });

  it('shows progress step labels', () => {
    render(<DrinkBuilder />);
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Customize')).toBeInTheDocument();
  });

  it('does not show "Add to Cart" button on category step', () => {
    render(<DrinkBuilder />);
    expect(screen.queryByText(/Add to Cart/)).not.toBeInTheDocument();
  });

  it('renders the 6 categories on initial render', () => {
    render(<DrinkBuilder />);
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Tea')).toBeInTheDocument();
    expect(screen.getByText('Italian Soda')).toBeInTheDocument();
    expect(screen.getByText('Juice')).toBeInTheDocument();
    expect(screen.getByText('Blended')).toBeInTheDocument();
    expect(screen.getByText('Specialty')).toBeInTheDocument();
  });
});
