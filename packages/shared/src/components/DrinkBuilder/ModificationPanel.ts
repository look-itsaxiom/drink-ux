import { useCallback } from 'react';
import { DrinkBuilderState, DrinkType, CupSize, ComponentType, ModifierComponent } from '../../types.js';

/**
 * Cup size option with pricing
 */
export interface CupSizeOption {
  value: CupSize;
  label: string;
  priceAdd: number;
}

/**
 * Props for modification panel implementations
 */
export interface ModificationPanelProps {
  drinkType: DrinkType;
  state: DrinkBuilderState;
  onUpdate: (state: Partial<DrinkBuilderState>) => void;
  onBack: () => void;
  onShowMilkSelector: () => void;
  onShowSyrupSelector: () => void;
  onShowToppingSelector: () => void;
}

/**
 * Return type for useModificationPanel hook
 */
export interface UseModificationPanelReturn {
  cupSizes: CupSizeOption[];
  canSelectTemperature: boolean;
  handleSizeChange: (size: CupSize) => void;
  handleTemperatureChange: (isHot: boolean) => void;
  handleRemoveMilk: () => void;
  handleRemoveSyrup: (syrupId: string) => void;
  handleRemoveTopping: (toppingId: string) => void;
  goBack: () => void;
}

/**
 * Available cup sizes with pricing
 */
export const CUP_SIZES: CupSizeOption[] = [
  { value: CupSize.SMALL, label: 'Small', priceAdd: 0 },
  { value: CupSize.MEDIUM, label: 'Medium', priceAdd: 0.5 },
  { value: CupSize.LARGE, label: 'Large', priceAdd: 1.0 },
];

/**
 * Available milk modifiers
 */
export const MILK_MODIFIERS: ModifierComponent[] = [
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
    id: 'mod-milk-almond',
    name: 'Almond Milk',
    type: ComponentType.MODIFIER,
    category: 'milk',
    price: 0.75,
    canTransformDrink: false,
    visual: { color: '#f0e68c', opacity: 0.6, layerOrder: 2 },
    available: true,
  },
  {
    id: 'mod-milk-soy',
    name: 'Soy Milk',
    type: ComponentType.MODIFIER,
    category: 'milk',
    price: 0.75,
    canTransformDrink: false,
    visual: { color: '#f5f5dc', opacity: 0.6, layerOrder: 2 },
    available: true,
  },
];

/**
 * Available syrup modifiers
 */
export const SYRUP_MODIFIERS: ModifierComponent[] = [
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
  {
    id: 'mod-caramel',
    name: 'Caramel Syrup',
    type: ComponentType.MODIFIER,
    category: 'syrup',
    price: 0.5,
    canTransformDrink: false,
    visual: { color: '#d2691e', opacity: 0.4, layerOrder: 3 },
    available: true,
  },
  {
    id: 'mod-hazelnut',
    name: 'Hazelnut Syrup',
    type: ComponentType.MODIFIER,
    category: 'syrup',
    price: 0.5,
    canTransformDrink: false,
    visual: { color: '#c19a6b', opacity: 0.4, layerOrder: 3 },
    available: true,
  },
  {
    id: 'mod-mocha',
    name: 'Mocha Syrup',
    type: ComponentType.MODIFIER,
    category: 'syrup',
    price: 0.5,
    canTransformDrink: false,
    visual: { color: '#8b4513', opacity: 0.4, layerOrder: 3 },
    available: true,
  },
];

/**
 * Available topping modifiers
 */
export const TOPPING_MODIFIERS: ModifierComponent[] = [
  {
    id: 'mod-whip',
    name: 'Whipped Cream',
    type: ComponentType.MODIFIER,
    category: 'topping',
    price: 0.5,
    canTransformDrink: false,
    visual: { color: '#fffaf0', opacity: 0.9, layerOrder: 4 },
    available: true,
  },
  {
    id: 'mod-cinnamon',
    name: 'Cinnamon Powder',
    type: ComponentType.MODIFIER,
    category: 'topping',
    price: 0,
    canTransformDrink: false,
    visual: { color: '#8b4513', opacity: 0.5, layerOrder: 4 },
    available: true,
  },
  {
    id: 'mod-chocolate-drizzle',
    name: 'Chocolate Drizzle',
    type: ComponentType.MODIFIER,
    category: 'topping',
    price: 0.5,
    canTransformDrink: false,
    visual: { color: '#3e2723', opacity: 0.8, layerOrder: 4 },
    available: true,
  },
];

/**
 * Get milk modifier by ID
 */
export function getMilkModifierById(id: string): ModifierComponent | undefined {
  return MILK_MODIFIERS.find((m) => m.id === id);
}

/**
 * Get syrup modifier by ID
 */
export function getSyrupModifierById(id: string): ModifierComponent | undefined {
  return SYRUP_MODIFIERS.find((m) => m.id === id);
}

/**
 * Get topping modifier by ID
 */
export function getToppingModifierById(id: string): ModifierComponent | undefined {
  return TOPPING_MODIFIERS.find((m) => m.id === id);
}

/**
 * Headless hook for modification panel logic
 *
 * @example
 * ```tsx
 * const {
 *   cupSizes,
 *   canSelectTemperature,
 *   handleSizeChange,
 *   handleTemperatureChange,
 *   handleRemoveMilk,
 *   handleRemoveSyrup,
 *   handleRemoveTopping,
 *   goBack,
 * } = useModificationPanel({
 *   drinkType,
 *   state,
 *   onUpdate,
 *   onBack,
 *   onShowMilkSelector,
 *   onShowSyrupSelector,
 *   onShowToppingSelector,
 * });
 *
 * return (
 *   <div>
 *     {cupSizes.map((size) => (
 *       <button
 *         key={size.value}
 *         onClick={() => handleSizeChange(size.value)}
 *       >
 *         {size.label} (+${size.priceAdd})
 *       </button>
 *     ))}
 *     {canSelectTemperature && (
 *       <>
 *         <button onClick={() => handleTemperatureChange(true)}>Hot</button>
 *         <button onClick={() => handleTemperatureChange(false)}>Iced</button>
 *       </>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useModificationPanel({
  drinkType,
  state,
  onUpdate,
  onBack,
}: ModificationPanelProps): UseModificationPanelReturn {
  const canSelectTemperature = drinkType.isHot === undefined;

  const handleSizeChange = useCallback((size: CupSize) => {
    onUpdate({ cupSize: size });
  }, [onUpdate]);

  const handleTemperatureChange = useCallback((isHot: boolean) => {
    onUpdate({ isHot });
  }, [onUpdate]);

  const handleRemoveMilk = useCallback(() => {
    onUpdate({ milk: undefined });
  }, [onUpdate]);

  const handleRemoveSyrup = useCallback((syrupId: string) => {
    onUpdate({ syrups: state.syrups.filter((s) => s.id !== syrupId) });
  }, [onUpdate, state.syrups]);

  const handleRemoveTopping = useCallback((toppingId: string) => {
    onUpdate({ toppings: state.toppings.filter((t) => t.id !== toppingId) });
  }, [onUpdate, state.toppings]);

  const goBack = useCallback(() => {
    onBack();
  }, [onBack]);

  return {
    cupSizes: CUP_SIZES,
    canSelectTemperature,
    handleSizeChange,
    handleTemperatureChange,
    handleRemoveMilk,
    handleRemoveSyrup,
    handleRemoveTopping,
    goBack,
  };
}
