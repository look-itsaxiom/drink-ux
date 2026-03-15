import { useCallback } from 'react';
import { DrinkType } from '../../types.js';

export interface TypeSelectorProps {
  category: string;
  onSelect: (drinkType: DrinkType) => void;
  onBack: () => void;
}

export interface UseTypeSelectorReturn {
  drinkTypes: DrinkType[];
  selectType: (type: DrinkType) => void;
  goBack: () => void;
  categoryName: string;
}

/**
 * Legacy fallback drink types by category.
 * In production, these come from the catalog API.
 */
export const DRINK_TYPES_BY_CATEGORY: Record<string, DrinkType[]> = {
  coffee: [
    { id: 'latte', name: 'Latte', category: 'coffee', priceCents: 450, isHot: undefined },
    { id: 'americano', name: 'Americano', category: 'coffee', priceCents: 350, isHot: undefined },
    { id: 'cappuccino', name: 'Cappuccino', category: 'coffee', priceCents: 400, isHot: true },
    { id: 'cold-brew', name: 'Cold Brew', category: 'coffee', priceCents: 400, isHot: false },
  ],
  tea: [
    { id: 'green-tea', name: 'Green Tea', category: 'tea', priceCents: 300, isHot: undefined },
    { id: 'chai-latte', name: 'Chai Latte', category: 'tea', priceCents: 450, isHot: undefined },
  ],
  specialty: [
    { id: 'hot-chocolate', name: 'Hot Chocolate', category: 'specialty', priceCents: 350, isHot: true },
    { id: 'matcha-latte', name: 'Matcha Latte', category: 'specialty', priceCents: 450, isHot: undefined },
  ],
};

export function getDrinkTypesByCategory(category: string): DrinkType[] {
  return DRINK_TYPES_BY_CATEGORY[category.toLowerCase()] || [];
}

export function getDrinkTypeById(id: string, category?: string): DrinkType | undefined {
  if (category) {
    return DRINK_TYPES_BY_CATEGORY[category.toLowerCase()]?.find((t) => t.id === id);
  }
  for (const types of Object.values(DRINK_TYPES_BY_CATEGORY)) {
    const found = types.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}

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
