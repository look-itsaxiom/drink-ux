import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategorySelector from '../CategorySelector';

describe('CategorySelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "What would you like?" heading', () => {
    render(<CategorySelector onSelect={mockOnSelect} />);
    expect(screen.getByText('What would you like?')).toBeInTheDocument();
  });

  it('renders 6 categories', () => {
    render(<CategorySelector onSelect={mockOnSelect} />);
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Tea')).toBeInTheDocument();
    expect(screen.getByText('Italian Soda')).toBeInTheDocument();
    expect(screen.getByText('Juice')).toBeInTheDocument();
    expect(screen.getByText('Blended')).toBeInTheDocument();
    expect(screen.getByText('Specialty')).toBeInTheDocument();
  });

  it('calls onSelect when Coffee is clicked', async () => {
    const user = userEvent.setup();
    render(<CategorySelector onSelect={mockOnSelect} />);

    const coffeeLabel = screen.getByText('Coffee');
    await user.click(coffeeLabel);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith('coffee', expect.any(String));
  });

  it('calls onSelect when Tea is clicked', async () => {
    const user = userEvent.setup();
    render(<CategorySelector onSelect={mockOnSelect} />);

    const teaLabel = screen.getByText('Tea');
    await user.click(teaLabel);

    expect(mockOnSelect).toHaveBeenCalledWith('tea', expect.any(String));
  });

  it('each category has a description', () => {
    render(<CategorySelector onSelect={mockOnSelect} />);

    expect(screen.getByText('Hot & iced coffee drinks')).toBeInTheDocument();
    expect(screen.getByText('Hot & iced teas')).toBeInTheDocument();
    expect(screen.getByText('Flavored sodas')).toBeInTheDocument();
    expect(screen.getByText('Fresh juices')).toBeInTheDocument();
    expect(screen.getByText('Smoothies & frappes')).toBeInTheDocument();
    expect(screen.getByText('Unique creations')).toBeInTheDocument();
  });
});
