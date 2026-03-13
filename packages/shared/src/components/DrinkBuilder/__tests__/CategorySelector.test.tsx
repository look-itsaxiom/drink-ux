import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  CATEGORIES,
  useCategorySelector,
  CategorySelectorProps,
  CategoryData,
} from '../CategorySelector';
import { DrinkCategory } from '../../../types';
import React from 'react';

// Test component that uses the hook
const TestCategorySelector: React.FC<CategorySelectorProps> = ({ onSelect }) => {
  const { categories, selectCategory } = useCategorySelector({ onSelect });

  return (
    <div>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => selectCategory(category.id)}
          data-testid={`category-${category.id}`}
        >
          <span data-testid={`name-${category.id}`}>{category.name}</span>
          <span data-testid={`description-${category.id}`}>{category.description}</span>
        </button>
      ))}
    </div>
  );
};

describe('CategorySelector', () => {
  // Test CATEGORIES constant
  describe('CATEGORIES constant', () => {
    it('should have all drink categories', () => {
      const categoryIds = CATEGORIES.map((c) => c.id);

      expect(categoryIds).toContain(DrinkCategory.COFFEE);
      expect(categoryIds).toContain(DrinkCategory.TEA);
      expect(categoryIds).toContain(DrinkCategory.ITALIAN_SODA);
      expect(categoryIds).toContain(DrinkCategory.JUICE);
      expect(categoryIds).toContain(DrinkCategory.BLENDED);
      expect(categoryIds).toContain(DrinkCategory.SPECIALTY);
    });

    it('should have 6 categories total', () => {
      expect(CATEGORIES).toHaveLength(6);
    });

    it('each category should have required properties', () => {
      CATEGORIES.forEach((category) => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('image');
        expect(category).toHaveProperty('color');
      });
    });

    it('should have valid color values (hex format)', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      CATEGORIES.forEach((category) => {
        expect(category.color).toMatch(hexColorRegex);
      });
    });

    it('should have valid image URLs', () => {
      CATEGORIES.forEach((category) => {
        expect(category.image).toMatch(/^https?:\/\//);
      });
    });
  });

  // Test useCategorySelector hook
  describe('useCategorySelector hook', () => {
    it('should return all categories', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      CATEGORIES.forEach((category) => {
        expect(screen.getByTestId(`category-${category.id}`)).toBeInTheDocument();
      });
    });

    it('should call onSelect when category is selected', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.COFFEE}`));

      expect(onSelect).toHaveBeenCalledWith(DrinkCategory.COFFEE);
    });

    it('should call onSelect with correct category for each option', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      // Test each category
      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.TEA}`));
      expect(onSelect).toHaveBeenLastCalledWith(DrinkCategory.TEA);

      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.ITALIAN_SODA}`));
      expect(onSelect).toHaveBeenLastCalledWith(DrinkCategory.ITALIAN_SODA);

      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.JUICE}`));
      expect(onSelect).toHaveBeenLastCalledWith(DrinkCategory.JUICE);

      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.BLENDED}`));
      expect(onSelect).toHaveBeenLastCalledWith(DrinkCategory.BLENDED);

      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.SPECIALTY}`));
      expect(onSelect).toHaveBeenLastCalledWith(DrinkCategory.SPECIALTY);
    });

    it('should display category names correctly', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      expect(screen.getByTestId(`name-${DrinkCategory.COFFEE}`)).toHaveTextContent('Coffee');
      expect(screen.getByTestId(`name-${DrinkCategory.TEA}`)).toHaveTextContent('Tea');
      expect(screen.getByTestId(`name-${DrinkCategory.ITALIAN_SODA}`)).toHaveTextContent('Italian Soda');
      expect(screen.getByTestId(`name-${DrinkCategory.JUICE}`)).toHaveTextContent('Juice');
      expect(screen.getByTestId(`name-${DrinkCategory.BLENDED}`)).toHaveTextContent('Blended');
      expect(screen.getByTestId(`name-${DrinkCategory.SPECIALTY}`)).toHaveTextContent('Specialty');
    });

    it('should display category descriptions', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      expect(screen.getByTestId(`description-${DrinkCategory.COFFEE}`)).toHaveTextContent('Hot & iced coffee drinks');
      expect(screen.getByTestId(`description-${DrinkCategory.TEA}`)).toHaveTextContent('Hot & iced teas');
    });
  });

  // Test CategoryData type structure
  describe('CategoryData structure', () => {
    it('should match expected shape', () => {
      const coffeeCategory = CATEGORIES.find((c) => c.id === DrinkCategory.COFFEE);

      expect(coffeeCategory).toBeDefined();
      expect(coffeeCategory).toEqual({
        id: DrinkCategory.COFFEE,
        name: 'Coffee',
        description: 'Hot & iced coffee drinks',
        image: expect.any(String),
        color: '#8B4513',
      });
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle rapid consecutive selections', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.COFFEE}`));
      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.TEA}`));
      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.JUICE}`));

      expect(onSelect).toHaveBeenCalledTimes(3);
    });

    it('should handle selecting the same category multiple times', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.COFFEE}`));
      fireEvent.click(screen.getByTestId(`category-${DrinkCategory.COFFEE}`));

      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelect).toHaveBeenNthCalledWith(1, DrinkCategory.COFFEE);
      expect(onSelect).toHaveBeenNthCalledWith(2, DrinkCategory.COFFEE);
    });
  });
});
