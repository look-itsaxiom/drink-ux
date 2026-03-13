import { render, screen } from '@testing-library/react';

vi.mock('ionicons/icons', () => ({
  addCircleOutline: 'mock-icon',
  closeCircle: 'mock-icon',
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

  it('shows progress bar via AppHeader showProgress', () => {
    render(<DrinkBuilder />);
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
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

  it('shows back button', () => {
    render(<DrinkBuilder />);
    expect(screen.getByTestId('back-button')).toBeInTheDocument();
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
