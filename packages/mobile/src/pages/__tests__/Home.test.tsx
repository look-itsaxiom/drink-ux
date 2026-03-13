import { render, screen } from '@testing-library/react';

vi.mock('../../theme/ThemeProvider', () => ({
  useTheme: vi.fn(() => ({ logoUrl: null, isLoading: false, theme: {} })),
}));

vi.mock('../../context/BusinessContext', () => ({
  useBusinessContext: vi.fn(() => ({
    business: { name: 'Test Coffee' },
    loading: false,
    error: null,
  })),
}));

vi.mock('../../components/design-system', () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher">ThemeSwitcher</div>,
  CategoryPills: ({ categories, onSelect }: any) => (
    <div data-testid="category-pills">
      {categories?.map((c: string) => <button key={c} onClick={() => onSelect?.(c)}>{c}</button>)}
    </div>
  ),
}));

const mockPush = vi.fn();

vi.mock('react-router', () => ({
  useHistory: vi.fn(() => ({ push: mockPush })),
}));

import Home from '../Home';

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the shop name from business context', () => {
    render(<Home />);
    expect(screen.getByText('Test Coffee')).toBeInTheDocument();
  });

  it('renders signature drinks section', () => {
    render(<Home />);
    expect(screen.getByText('Vanilla Oat Latte')).toBeInTheDocument();
    expect(screen.getByText('Caramel Macchiato')).toBeInTheDocument();
    expect(screen.getByText('Matcha Latte')).toBeInTheDocument();
    expect(screen.getByText('Nitro Cold Brew')).toBeInTheDocument();
  });

  it('renders espresso drinks section', () => {
    render(<Home />);
    expect(screen.getByText('Americano')).toBeInTheDocument();
    expect(screen.getByText('Flat White')).toBeInTheDocument();
    expect(screen.getByText('Cappuccino')).toBeInTheDocument();
  });

  it('renders category pills', () => {
    render(<Home />);
    expect(screen.getByTestId('category-pills')).toBeInTheDocument();
  });

  it('renders View Cart button', () => {
    render(<Home />);
    expect(screen.getByText('View Cart')).toBeInTheDocument();
  });
});
