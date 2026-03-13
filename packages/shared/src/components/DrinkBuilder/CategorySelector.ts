import { useCallback } from 'react';
import { DrinkCategory } from '../../types.js';

/**
 * Category data structure for display
 */
export interface CategoryData {
  id: DrinkCategory;
  name: string;
  description: string;
  image: string;
  color: string;
}

/**
 * Props for category selector implementations
 */
export interface CategorySelectorProps {
  onSelect: (category: DrinkCategory) => void;
}

/**
 * Return type for useCategorySelector hook
 */
export interface UseCategorySelectorReturn {
  categories: CategoryData[];
  selectCategory: (category: DrinkCategory) => void;
}

/**
 * Predefined category data with display information
 */
export const CATEGORIES: CategoryData[] = [
  {
    id: DrinkCategory.COFFEE,
    name: 'Coffee',
    description: 'Hot & iced coffee drinks',
    image: 'https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg',
    color: '#8B4513',
  },
  {
    id: DrinkCategory.TEA,
    name: 'Tea',
    description: 'Hot & iced teas',
    image: 'https://media.istockphoto.com/id/466073662/photo/tea-cup-on-saucer-with-tea-being-poured.jpg?b=1&s=612x612&w=0&k=20&c=QaJW4POCXoI44ZMxKVdDnTQbbALRmocq8w37Nl9d-fY=',
    color: '#2E7D32',
  },
  {
    id: DrinkCategory.ITALIAN_SODA,
    name: 'Italian Soda',
    description: 'Flavored sodas',
    image: 'https://media.istockphoto.com/id/482100878/photo/row-of-italian-soda-drinks.jpg?b=1&s=612x612&w=0&k=20&c=Swy5YxCLKasC1nwd0tjlcdHf47hLlE_OT_xKXE25cuM=',
    color: '#FF6B35',
  },
  {
    id: DrinkCategory.JUICE,
    name: 'Juice',
    description: 'Fresh juices',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&h=300&fit=crop&crop=center',
    color: '#FF9800',
  },
  {
    id: DrinkCategory.BLENDED,
    name: 'Blended',
    description: 'Smoothies & frappes',
    image: 'https://images.pexels.com/photos/214333/pexels-photo-214333.jpeg',
    color: '#E91E63',
  },
  {
    id: DrinkCategory.SPECIALTY,
    name: 'Specialty',
    description: 'Unique creations',
    image: 'https://images.pexels.com/photos/19899299/pexels-photo-19899299.png',
    color: '#9C27B0',
  },
];

/**
 * Headless hook for category selection logic
 *
 * @example
 * ```tsx
 * const { categories, selectCategory } = useCategorySelector({ onSelect });
 *
 * return (
 *   <div>
 *     {categories.map((cat) => (
 *       <button key={cat.id} onClick={() => selectCategory(cat.id)}>
 *         {cat.name}
 *       </button>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useCategorySelector({ onSelect }: CategorySelectorProps): UseCategorySelectorReturn {
  const selectCategory = useCallback((category: DrinkCategory) => {
    onSelect(category);
  }, [onSelect]);

  return {
    categories: CATEGORIES,
    selectCategory,
  };
}

/**
 * Get a category by its ID
 */
export function getCategoryById(id: DrinkCategory): CategoryData | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

/**
 * Get category display name
 */
export function getCategoryName(id: DrinkCategory): string {
  return getCategoryById(id)?.name ?? id;
}
