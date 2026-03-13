import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('ionicons/icons', () => ({
  addCircleOutline: 'mock-icon',
  closeCircle: 'mock-icon',
}));

import { CupSize, ComponentType } from '@drink-ux/shared';
import type { DrinkType, DrinkBuilderState, ModifierComponent } from '@drink-ux/shared';
import ModificationPanel from '../ModificationPanel';

const baseDrinkType: DrinkType = {
  id: 'drink-1',
  name: 'Latte',
  category: 'coffee',
  basePrice: 4.0,
  available: true,
  isHot: undefined,
  description: 'A classic latte',
};

const hotOnlyDrinkType: DrinkType = {
  ...baseDrinkType,
  id: 'drink-2',
  name: 'Americano',
  isHot: true,
};

const makeMilk = (): ModifierComponent => ({
  id: 'mod-milk-oat',
  name: 'Oat Milk',
  type: ComponentType.MODIFIER,
  category: 'milk',
  price: 0.75,
  canTransformDrink: false,
  visual: { color: '#f5deb3', opacity: 0.6, layerOrder: 2 },
  available: true,
});

const makeSyrup = (): ModifierComponent => ({
  id: 'mod-vanilla',
  name: 'Vanilla Syrup',
  type: ComponentType.MODIFIER,
  category: 'syrup',
  price: 0.5,
  canTransformDrink: false,
  visual: { color: '#fff8dc', opacity: 0.4, layerOrder: 3 },
  available: true,
});

const makeTopping = (): ModifierComponent => ({
  id: 'mod-whip',
  name: 'Whipped Cream',
  type: ComponentType.MODIFIER,
  category: 'topping',
  price: 0.5,
  canTransformDrink: false,
  visual: { color: '#fffaf0', opacity: 0.9, layerOrder: 4 },
  available: true,
});

const baseState: DrinkBuilderState = {
  cupSize: CupSize.MEDIUM,
  syrups: [],
  toppings: [],
  totalPrice: 0,
};

const defaultProps = {
  drinkType: baseDrinkType,
  state: baseState,
  onUpdate: vi.fn(),
  onBack: vi.fn(),
  onShowMilkSelector: vi.fn(),
  onShowSyrupSelector: vi.fn(),
  onShowToppingSelector: vi.fn(),
};

describe('ModificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Cup Size" card with Small, Medium, and Large buttons', () => {
    render(<ModificationPanel {...defaultProps} />);
    expect(screen.getByText('Cup Size')).toBeInTheDocument();
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText(/Medium/)).toBeInTheDocument();
    expect(screen.getByText(/Large/)).toBeInTheDocument();
  });

  it('shows Temperature card when drinkType.isHot is undefined', () => {
    render(<ModificationPanel {...defaultProps} />);
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Hot')).toBeInTheDocument();
    expect(screen.getByText('Iced')).toBeInTheDocument();
  });

  it('hides Temperature card when drinkType.isHot is defined', () => {
    render(<ModificationPanel {...defaultProps} drinkType={hotOnlyDrinkType} />);
    expect(screen.queryByText('Temperature')).not.toBeInTheDocument();
  });

  it('shows "Add Milk" button when no milk is selected', () => {
    render(<ModificationPanel {...defaultProps} />);
    expect(screen.getByText(/Add.*Milk/)).toBeInTheDocument();
  });

  it('calls onShowMilkSelector when "Add Milk" button is clicked', async () => {
    const user = userEvent.setup();
    const onShowMilkSelector = vi.fn();
    render(
      <ModificationPanel {...defaultProps} onShowMilkSelector={onShowMilkSelector} />
    );

    await user.click(screen.getByText(/Add.*Milk/));
    expect(onShowMilkSelector).toHaveBeenCalled();
  });

  it('shows "Change Milk" when milk is already selected', () => {
    const stateWithMilk: DrinkBuilderState = {
      ...baseState,
      milk: makeMilk(),
    };
    render(<ModificationPanel {...defaultProps} state={stateWithMilk} />);
    expect(screen.getByText(/Change.*Milk/)).toBeInTheDocument();
    expect(screen.getByText('Oat Milk')).toBeInTheDocument();
  });

  it('shows Syrups section with "Add Syrup" button', () => {
    render(<ModificationPanel {...defaultProps} />);
    expect(screen.getByText('Syrups')).toBeInTheDocument();
    expect(screen.getByText(/Add Syrup/)).toBeInTheDocument();
  });

  it('shows selected syrup with its name', () => {
    const stateWithSyrup: DrinkBuilderState = {
      ...baseState,
      syrups: [makeSyrup()],
      toppings: [],
    };
    render(<ModificationPanel {...defaultProps} state={stateWithSyrup} />);
    expect(screen.getByText('Vanilla Syrup')).toBeInTheDocument();
  });

  it('calls onUpdate with cupSize when size button is clicked', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<ModificationPanel {...defaultProps} onUpdate={onUpdate} />);

    await user.click(screen.getByText('Small'));
    expect(onUpdate).toHaveBeenCalledWith({ cupSize: CupSize.SMALL });
  });

  it('calls onUpdate with isHot when temperature button is clicked', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<ModificationPanel {...defaultProps} onUpdate={onUpdate} />);

    await user.click(screen.getByText('Hot'));
    expect(onUpdate).toHaveBeenCalledWith({ isHot: true });
  });
});
