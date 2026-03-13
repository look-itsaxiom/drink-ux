import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType } from '@drink-ux/shared';
import type { ModifierComponent } from '@drink-ux/shared';
import ModifierSelector from '../ModifierSelector';

const mockModifiers: ModifierComponent[] = [
  {
    id: 'mod-milk-whole',
    name: 'Whole Milk',
    type: ComponentType.MODIFIER,
    category: 'milk',
    price: 0,
    canTransformDrink: false,
    visual: { color: '#fff9e6', opacity: 0.7, layerOrder: 2 },
    available: true,
  },
  {
    id: 'mod-milk-oat',
    name: 'Oat Milk',
    type: ComponentType.MODIFIER,
    category: 'milk',
    price: 0.75,
    canTransformDrink: false,
    visual: { color: '#f5deb3', opacity: 0.6, layerOrder: 2 },
    available: true,
  },
  {
    id: 'mod-vanilla',
    name: 'Vanilla Syrup',
    type: ComponentType.MODIFIER,
    category: 'syrup',
    price: 0.5,
    canTransformDrink: false,
    visual: { color: '#fff8dc', opacity: 0.4, layerOrder: 3 },
    available: true,
  },
];

const defaultProps = {
  isOpen: true,
  title: 'Select Milk',
  modifiers: mockModifiers,
  onSelect: vi.fn(),
  onDismiss: vi.fn(),
  selectedIds: [] as string[],
};

describe('ModifierSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal content when isOpen is true', () => {
    render(<ModifierSelector {...defaultProps} />);
    expect(screen.getByTestId('ion-modal')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    render(<ModifierSelector {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('ion-modal')).not.toBeInTheDocument();
  });

  it('shows the correct title', () => {
    render(<ModifierSelector {...defaultProps} />);
    expect(screen.getByText('Select Milk')).toBeInTheDocument();
  });

  it('lists modifiers with their names', () => {
    render(<ModifierSelector {...defaultProps} />);
    expect(screen.getByText('Whole Milk')).toBeInTheDocument();
    expect(screen.getByText('Oat Milk')).toBeInTheDocument();
    expect(screen.getByText('Vanilla Syrup')).toBeInTheDocument();
  });

  it('shows "Free" for $0 price modifiers', () => {
    render(<ModifierSelector {...defaultProps} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows formatted price for non-free modifiers', () => {
    render(<ModifierSelector {...defaultProps} />);
    expect(screen.getByText('+$0.75')).toBeInTheDocument();
    expect(screen.getByText('+$0.50')).toBeInTheDocument();
  });

  it('calls onSelect and onDismiss when a modifier is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ModifierSelector
        {...defaultProps}
        onSelect={onSelect}
        onDismiss={onDismiss}
      />
    );

    const oatMilkItem = screen.getByText('Oat Milk').closest('[role="button"]');
    await user.click(oatMilkItem!);

    expect(onSelect).toHaveBeenCalledWith(mockModifiers[1]);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does not call onSelect when clicking a disabled (already selected) modifier', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ModifierSelector
        {...defaultProps}
        onSelect={onSelect}
        selectedIds={['mod-milk-whole']}
      />
    );

    const wholeMilkItem = screen.getByText('Whole Milk').closest('[role="button"]');
    await user.click(wholeMilkItem!);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows "Close" button that calls onDismiss', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(<ModifierSelector {...defaultProps} onDismiss={onDismiss} />);

    await user.click(screen.getByText('Close'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows checkmark for selected modifiers', () => {
    render(
      <ModifierSelector {...defaultProps} selectedIds={['mod-milk-oat']} />
    );
    expect(screen.getByText(/Added/)).toBeInTheDocument();
  });
});
