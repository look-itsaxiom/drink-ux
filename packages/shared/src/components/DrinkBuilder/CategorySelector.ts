import { useCallback } from 'react';

export interface CategoryData {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
}

export interface CategorySelectorProps {
  onSelect: (category: string) => void;
}

export interface UseCategorySelectorReturn {
  categories: CategoryData[];
  selectCategory: (category: string) => void;
}

export const CATEGORIES: CategoryData[] = [
  { id: 'coffee', name: 'Coffee', description: 'Hot & iced coffee drinks', image: '', color: '#8B4513' },
  { id: 'tea', name: 'Tea', description: 'Hot & iced teas', image: '', color: '#2E7D32' },
  { id: 'specialty', name: 'Specialty', description: 'Unique creations', image: '', color: '#9C27B0' },
];

export function useCategorySelector({ onSelect }: CategorySelectorProps): UseCategorySelectorReturn {
  const selectCategory = useCallback((category: string) => {
    onSelect(category);
  }, [onSelect]);

  return { categories: CATEGORIES, selectCategory };
}

export function getCategoryById(id: string): CategoryData | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

export function getCategoryName(id: string): string {
  return getCategoryById(id)?.name ?? id;
}
