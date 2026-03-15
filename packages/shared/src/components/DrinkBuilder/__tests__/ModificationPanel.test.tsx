import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  CUP_SIZES,
  MILK_MODIFIERS,
  SYRUP_MODIFIERS,
  TOPPING_MODIFIERS,
  useModificationPanel,
  ModificationPanelProps,
} from '../ModificationPanel';
import { DrinkBuilderState, DrinkType, ComponentType, ModifierComponent } from '../../../types';
import React from 'react';

// Helper to create test state
const createTestState = (overrides: Partial<DrinkBuilderState> = {}): DrinkBuilderState => ({
  selectedModifiers: [],
  totalPriceCents: 0,
  ...overrides,
});

// Helper to create test drink type
const createTestDrinkType = (overrides: Partial<DrinkType> = {}): DrinkType => ({
  id: 'latte',
  name: 'Latte',
  category: 'coffee',
  priceCents: 450,
  isHot: undefined, // Can be both hot and iced
  ...overrides,
});

// Test component that uses the hook
const TestModificationPanel: React.FC<ModificationPanelProps> = ({
  drinkType,
  state,
  onUpdate,
  onBack,
  onShowMilkSelector,
  onShowSyrupSelector,
  onShowToppingSelector,
}) => {
  const {
    cupSizes,
    canSelectTemperature,
    handleSizeChange,
    handleTemperatureChange,
    handleRemoveModifier,
    goBack,
  } = useModificationPanel({
    drinkType,
    state,
    onUpdate,
    onBack,
    onShowMilkSelector,
    onShowSyrupSelector,
    onShowToppingSelector,
  });

  // Derive milk/syrups/toppings from selectedModifiers for display
  const milkModifier = state.selectedModifiers?.find((m) => m.category === 'milk');
  const syrupModifiers = state.selectedModifiers?.filter((m) => m.category === 'syrup') || [];
  const toppingModifiers = state.selectedModifiers?.filter((m) => m.category === 'topping') || [];

  return (
    <div>
      <button data-testid="back-button" onClick={goBack}>
        Back
      </button>

      <div data-testid="cup-sizes">
        {cupSizes.map((size) => (
          <button
            key={size.value}
            onClick={() => handleSizeChange(size.value)}
            data-testid={`size-${size.value}`}
            data-selected={state.selectedVariation?.name === size.value}
          >
            {size.label} (+${size.priceAdd})
          </button>
        ))}
      </div>

      {canSelectTemperature && (
        <div data-testid="temperature-selector">
          <button
            onClick={() => handleTemperatureChange(true)}
            data-testid="temp-hot"
            data-selected={state.isHot === true}
          >
            Hot
          </button>
          <button
            onClick={() => handleTemperatureChange(false)}
            data-testid="temp-iced"
            data-selected={state.isHot === false}
          >
            Iced
          </button>
        </div>
      )}

      <div data-testid="milk-section">
        {milkModifier && (
          <div data-testid="selected-milk">
            <span>{milkModifier.name}</span>
            <button onClick={() => handleRemoveModifier(milkModifier.id)} data-testid="remove-milk">
              Remove
            </button>
          </div>
        )}
        <button onClick={onShowMilkSelector} data-testid="add-milk">
          {milkModifier ? 'Change' : 'Add'} Milk
        </button>
      </div>

      <div data-testid="syrups-section">
        {syrupModifiers.map((syrup) => (
          <div key={syrup.id} data-testid={`selected-syrup-${syrup.id}`}>
            <span>{syrup.name}</span>
            <button
              onClick={() => handleRemoveModifier(syrup.id)}
              data-testid={`remove-syrup-${syrup.id}`}
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={onShowSyrupSelector} data-testid="add-syrup">
          Add Syrup
        </button>
      </div>

      <div data-testid="toppings-section">
        {toppingModifiers.map((topping) => (
          <div key={topping.id} data-testid={`selected-topping-${topping.id}`}>
            <span>{topping.name}</span>
            <button
              onClick={() => handleRemoveModifier(topping.id)}
              data-testid={`remove-topping-${topping.id}`}
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={onShowToppingSelector} data-testid="add-topping">
          Add Topping
        </button>
      </div>
    </div>
  );
};

describe('ModificationPanel', () => {
  // Test constants
  describe('CUP_SIZES constant', () => {
    it('should have small, medium, and large sizes', () => {
      const values = CUP_SIZES.map((s) => s.value);
      expect(values).toContain('small');
      expect(values).toContain('medium');
      expect(values).toContain('large');
    });

    it('should have correct labels', () => {
      expect(CUP_SIZES.find((s) => s.value === 'small')?.label).toBe('Small');
      expect(CUP_SIZES.find((s) => s.value === 'medium')?.label).toBe('Medium');
      expect(CUP_SIZES.find((s) => s.value === 'large')?.label).toBe('Large');
    });

    it('should have correct price additions', () => {
      expect(CUP_SIZES.find((s) => s.value === 'small')?.priceAdd).toBe(0);
      expect(CUP_SIZES.find((s) => s.value === 'medium')?.priceAdd).toBe(0.5);
      expect(CUP_SIZES.find((s) => s.value === 'large')?.priceAdd).toBe(1.0);
    });
  });

  describe('MILK_MODIFIERS constant', () => {
    it('should have common milk options', () => {
      const names = MILK_MODIFIERS.map((m) => m.name);
      expect(names).toContain('Whole Milk');
      expect(names).toContain('Oat Milk');
      expect(names).toContain('Almond Milk');
      expect(names).toContain('Soy Milk');
    });

    it('should have correct modifier type', () => {
      MILK_MODIFIERS.forEach((milk) => {
        expect(milk.type).toBe(ComponentType.MODIFIER);
        expect(milk.category).toBe('milk');
      });
    });
  });

  describe('SYRUP_MODIFIERS constant', () => {
    it('should have common syrup options', () => {
      const names = SYRUP_MODIFIERS.map((m) => m.name);
      expect(names).toContain('Vanilla Syrup');
      expect(names).toContain('Caramel Syrup');
      expect(names).toContain('Hazelnut Syrup');
    });

    it('should have correct modifier type', () => {
      SYRUP_MODIFIERS.forEach((syrup) => {
        expect(syrup.type).toBe(ComponentType.MODIFIER);
        expect(syrup.category).toBe('syrup');
      });
    });
  });

  describe('TOPPING_MODIFIERS constant', () => {
    it('should have common topping options', () => {
      const names = TOPPING_MODIFIERS.map((m) => m.name);
      expect(names).toContain('Whipped Cream');
      expect(names).toContain('Cinnamon Powder');
    });

    it('should have correct modifier type', () => {
      TOPPING_MODIFIERS.forEach((topping) => {
        expect(topping.type).toBe(ComponentType.MODIFIER);
        expect(topping.category).toBe('topping');
      });
    });
  });

  // Test hook behavior
  describe('useModificationPanel hook', () => {
    it('should render cup size buttons', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      expect(screen.getByTestId('size-small')).toBeInTheDocument();
      expect(screen.getByTestId('size-medium')).toBeInTheDocument();
      expect(screen.getByTestId('size-large')).toBeInTheDocument();
    });

    it('should call onUpdate when size is changed', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId('size-large'));

      expect(onUpdate).toHaveBeenCalledWith({
        selectedVariation: expect.objectContaining({ id: 'large', name: 'large' }),
      });
    });

    it('should show temperature selector when drink allows both', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType({ isHot: undefined })}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      expect(screen.getByTestId('temperature-selector')).toBeInTheDocument();
    });

    it('should hide temperature selector for hot-only drinks', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType({ isHot: true })}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      expect(screen.queryByTestId('temperature-selector')).not.toBeInTheDocument();
    });

    it('should hide temperature selector for iced-only drinks', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType({ isHot: false })}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      expect(screen.queryByTestId('temperature-selector')).not.toBeInTheDocument();
    });

    it('should call onUpdate when temperature is changed', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType({ isHot: undefined })}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId('temp-iced'));

      expect(onUpdate).toHaveBeenCalledWith({ isHot: false });
    });
  });

  // Milk modification
  describe('milk modification', () => {
    it('should show add milk button when no milk selected', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      expect(screen.getByTestId('add-milk')).toHaveTextContent('Add Milk');
    });

    it('should show change milk button when milk is selected', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState({
            selectedModifiers: [MILK_MODIFIERS[0]],
          })}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      expect(screen.getByTestId('add-milk')).toHaveTextContent('Change Milk');
    });

    it('should call onShowMilkSelector when add milk is clicked', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId('add-milk'));

      expect(onShowMilkSelector).toHaveBeenCalled();
    });

    it('should remove milk when remove button is clicked', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState({
            selectedModifiers: [MILK_MODIFIERS[0]],
          })}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId('remove-milk'));

      expect(onUpdate).toHaveBeenCalledWith({ selectedModifiers: [] });
    });
  });

  // Syrup modification
  describe('syrup modification', () => {
    it('should display selected syrups', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      const syrup = SYRUP_MODIFIERS[0];

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState({
            selectedModifiers: [syrup],
          })}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      expect(screen.getByTestId(`selected-syrup-${syrup.id}`)).toBeInTheDocument();
    });

    it('should remove syrup when remove button is clicked', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      const syrup = SYRUP_MODIFIERS[0];

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState({
            selectedModifiers: [syrup],
          })}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId(`remove-syrup-${syrup.id}`));

      expect(onUpdate).toHaveBeenCalledWith({ selectedModifiers: [] });
    });

    it('should call onShowSyrupSelector when add syrup is clicked', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId('add-syrup'));

      expect(onShowSyrupSelector).toHaveBeenCalled();
    });
  });

  // Topping modification
  describe('topping modification', () => {
    it('should display selected toppings', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      const topping = TOPPING_MODIFIERS[0];

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState({
            selectedModifiers: [topping],
          })}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      expect(screen.getByTestId(`selected-topping-${topping.id}`)).toBeInTheDocument();
    });

    it('should remove topping when remove button is clicked', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      const topping = TOPPING_MODIFIERS[0];

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState({
            selectedModifiers: [topping],
          })}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId(`remove-topping-${topping.id}`));

      expect(onUpdate).toHaveBeenCalledWith({ selectedModifiers: [] });
    });

    it('should call onShowToppingSelector when add topping is clicked', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId('add-topping'));

      expect(onShowToppingSelector).toHaveBeenCalled();
    });
  });

  // Back button
  describe('back button', () => {
    it('should call onBack when back button is clicked', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState()}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId('back-button'));

      expect(onBack).toHaveBeenCalled();
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle multiple syrups in selectedModifiers', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      const syrups = [SYRUP_MODIFIERS[0], SYRUP_MODIFIERS[1]];

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState({
            selectedModifiers: syrups,
          })}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      syrups.forEach((syrup) => {
        expect(screen.getByTestId(`selected-syrup-${syrup.id}`)).toBeInTheDocument();
      });
    });

    it('should keep other modifiers when removing one', () => {
      const onUpdate = vi.fn();
      const onBack = vi.fn();
      const onShowMilkSelector = vi.fn();
      const onShowSyrupSelector = vi.fn();
      const onShowToppingSelector = vi.fn();

      const syrups = [SYRUP_MODIFIERS[0], SYRUP_MODIFIERS[1]];

      render(
        <TestModificationPanel
          drinkType={createTestDrinkType()}
          state={createTestState({
            selectedModifiers: syrups,
          })}
          onUpdate={onUpdate}
          onBack={onBack}
          onShowMilkSelector={onShowMilkSelector}
          onShowSyrupSelector={onShowSyrupSelector}
          onShowToppingSelector={onShowToppingSelector}
        />
      );

      fireEvent.click(screen.getByTestId(`remove-syrup-${syrups[0].id}`));

      expect(onUpdate).toHaveBeenCalledWith({
        selectedModifiers: [syrups[1]],
      });
    });
  });
});
