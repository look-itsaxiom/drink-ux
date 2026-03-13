import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrinkCategory } from '@drink-ux/shared';
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

  it('calls onSelect with DrinkCategory.COFFEE when Coffee is clicked', async () => {
    const user = userEvent.setup();
    render(<CategorySelector onSelect={mockOnSelect} />);

    const coffeeItem = screen.getByText('Coffee').closest('[role="button"]');
    expect(coffeeItem).not.toBeNull();
    await user.click(coffeeItem!);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(DrinkCategory.COFFEE);
  });

  it('calls onSelect with DrinkCategory.TEA when Tea is clicked', async () => {
    const user = userEvent.setup();
    render(<CategorySelector onSelect={mockOnSelect} />);

    const teaItem = screen.getByText('Tea').closest('[role="button"]');
    await user.click(teaItem!);

    expect(mockOnSelect).toHaveBeenCalledWith(DrinkCategory.TEA);
  });

  it('each category item has an aria-label', () => {
    render(<CategorySelector onSelect={mockOnSelect} />);

    expect(screen.getByLabelText(/Select Coffee/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Tea/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Italian Soda/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Juice/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Blended/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Specialty/)).toBeInTheDocument();
  });
});
