// Visual components
export { default as LayeredCup } from './LayeredCup.js';
export type { LayeredCupProps } from './LayeredCup.js';

export { default as DrinkVisual } from './DrinkVisual.js';
export type { DrinkVisualProps } from './DrinkVisual.js';

// DrinkVisualizer utility
export {
  DrinkVisualizer,
  DRINK_COLORS,
  SYRUP_COLORS,
  MILK_COLORS,
  TOPPING_PROPERTIES,
} from './DrinkVisualizer.js';
export type {
  DrinkLayer,
  DrinkVisualProperties,
} from './DrinkVisualizer.js';

// CategorySelector (headless)
export {
  CATEGORIES,
  useCategorySelector,
  getCategoryById,
  getCategoryName,
} from './CategorySelector.js';
export type {
  CategoryData,
  CategorySelectorProps,
  UseCategorySelectorReturn,
} from './CategorySelector.js';

// TypeSelector (headless)
export {
  DRINK_TYPES_BY_CATEGORY,
  useTypeSelector,
  getDrinkTypesByCategory,
  getDrinkTypeById,
} from './TypeSelector.js';
export type {
  TypeSelectorProps,
  UseTypeSelectorReturn,
} from './TypeSelector.js';

// ModificationPanel (headless)
export {
  CUP_SIZES,
  MILK_MODIFIERS,
  SYRUP_MODIFIERS,
  TOPPING_MODIFIERS,
  useModificationPanel,
  getMilkModifierById,
  getSyrupModifierById,
  getToppingModifierById,
} from './ModificationPanel.js';
export type {
  CupSizeOption,
  ModificationPanelProps,
  UseModificationPanelReturn,
} from './ModificationPanel.js';
