// @ts-nocheck — Legacy shared code, mobile app uses its own TypeSelector
import { useCallback } from 'react';
import { DrinkType } from '../../types.js';

/**
 * Props for type selector implementations
 */
export interface TypeSelectorProps {
  category: DrinkCategory;
  onSelect: (drinkType: DrinkType) => void;
  onBack: () => void;
}

/**
 * Return type for useTypeSelector hook
 */
export interface UseTypeSelectorReturn {
  drinkTypes: DrinkType[];
  selectType: (type: DrinkType) => void;
  goBack: () => void;
  categoryName: string;
}

/**
 * Predefined drink types by category
 * In production, this would come from an API
 */
export const DRINK_TYPES_BY_CATEGORY: Record<DrinkCategory, DrinkType[]> = {
  [DrinkCategory.COFFEE]: [
    { id: 'latte', name: 'Latte', category: DrinkCategory.COFFEE, basePrice: 4.5, isHot: undefined },
    { id: 'americano', name: 'Americano', category: DrinkCategory.COFFEE, basePrice: 3.5, isHot: undefined },
    { id: 'cappuccino', name: 'Cappuccino', category: DrinkCategory.COFFEE, basePrice: 4.0, isHot: true },
    { id: 'cold-brew', name: 'Cold Brew', category: DrinkCategory.COFFEE, basePrice: 4.0, isHot: false },
    { id: 'iced-coffee', name: 'Iced Coffee', category: DrinkCategory.COFFEE, basePrice: 3.5, isHot: false },
    { id: 'drip-coffee', name: 'Drip Coffee', category: DrinkCategory.COFFEE, basePrice: 2.5, isHot: true },
  ],
  [DrinkCategory.TEA]: [
    { id: 'green-tea', name: 'Green Tea', category: DrinkCategory.TEA, basePrice: 3.0, isHot: undefined },
    { id: 'black-tea', name: 'Black Tea', category: DrinkCategory.TEA, basePrice: 3.0, isHot: undefined },
    { id: 'herbal-tea', name: 'Herbal Tea', category: DrinkCategory.TEA, basePrice: 3.0, isHot: true },
    { id: 'chai-latte', name: 'Chai Latte', category: DrinkCategory.TEA, basePrice: 4.5, isHot: undefined },
  ],
  [DrinkCategory.ITALIAN_SODA]: [
    { id: 'italian-soda', name: 'Italian Soda', category: DrinkCategory.ITALIAN_SODA, basePrice: 3.5, isHot: false },
    { id: 'cream-soda', name: 'Italian Cream Soda', category: DrinkCategory.ITALIAN_SODA, basePrice: 4.0, isHot: false },
  ],
  [DrinkCategory.JUICE]: [
    { id: 'orange-juice', name: 'Orange Juice', category: DrinkCategory.JUICE, basePrice: 3.5, isHot: false },
    { id: 'apple-juice', name: 'Apple Juice', category: DrinkCategory.JUICE, basePrice: 3.5, isHot: false },
  ],
  [DrinkCategory.BLENDED]: [
    { id: 'smoothie', name: 'Smoothie', category: DrinkCategory.BLENDED, basePrice: 5.5, isHot: false },
    { id: 'frappe', name: 'Frappe', category: DrinkCategory.BLENDED, basePrice: 5.0, isHot: false },
  ],
  [DrinkCategory.SPECIALTY]: [
    { id: 'hot-chocolate', name: 'Hot Chocolate', category: DrinkCategory.SPECIALTY, basePrice: 3.5, isHot: true },
    { id: 'matcha-latte', name: 'Matcha Latte', category: DrinkCategory.SPECIALTY, basePrice: 4.5, isHot: undefined },
  ],
};

/**
 * Get drink types for a specific category
 */
export function getDrinkTypesByCategory(category: DrinkCategory): DrinkType[] {
  return DRINK_TYPES_BY_CATEGORY[category] || [];
}

/**
 * Get a specific drink type by ID
 */
export function getDrinkTypeById(id: string, category?: DrinkCategory): DrinkType | undefined {
  if (category) {
    return DRINK_TYPES_BY_CATEGORY[category]?.find((t) => t.id === id);
  }

  // Search all categories
  for (const types of Object.values(DRINK_TYPES_BY_CATEGORY)) {
    const found = types.find((t) => t.id === id);
    if (found) return found;
  }

  return undefined;
}

/**
 * Headless hook for drink type selection logic
 *
 * @example
 * ```tsx
 * const { drinkTypes, selectType, goBack, categoryName } = useTypeSelector({
 *   category: DrinkCategory.COFFEE,
 *   onSelect,
 *   onBack,
 * });
 *
 * return (
 *   <div>
 *     <button onClick={goBack}>Back</button>
 *     <h2>Choose your {categoryName}</h2>
 *     {drinkTypes.map((type) => (
 *       <button key={type.id} onClick={() => selectType(type)}>
 *         {type.name} - ${type.basePrice.toFixed(2)}
 *       </button>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useTypeSelector({
  category,
  onSelect,
  onBack,
}: TypeSelectorProps): UseTypeSelectorReturn {
  const drinkTypes = getDrinkTypesByCategory(category);

  const selectType = useCallback((type: DrinkType) => {
    onSelect(type);
  }, [onSelect]);

  const goBack = useCallback(() => {
    onBack();
  }, [onBack]);

  return {
    drinkTypes,
    selectType,
    goBack,
    categoryName: category,
  };
}
