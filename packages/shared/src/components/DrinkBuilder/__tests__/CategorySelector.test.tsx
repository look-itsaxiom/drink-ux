import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  CATEGORIES,
  useCategorySelector,
  CategorySelectorProps,
  CategoryData,
} from '../CategorySelector';
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

      expect(categoryIds).toContain('coffee');
      expect(categoryIds).toContain('tea');
      expect(categoryIds).toContain('specialty');
    });

    it('should have 3 categories total', () => {
      expect(CATEGORIES).toHaveLength(3);
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

      fireEvent.click(screen.getByTestId('category-coffee'));

      expect(onSelect).toHaveBeenCalledWith('coffee');
    });

    it('should call onSelect with correct category for each option', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      // Test each category
      fireEvent.click(screen.getByTestId('category-tea'));
      expect(onSelect).toHaveBeenLastCalledWith('tea');

      fireEvent.click(screen.getByTestId('category-specialty'));
      expect(onSelect).toHaveBeenLastCalledWith('specialty');
    });

    it('should display category names correctly', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      expect(screen.getByTestId('name-coffee')).toHaveTextContent('Coffee');
      expect(screen.getByTestId('name-tea')).toHaveTextContent('Tea');
      expect(screen.getByTestId('name-specialty')).toHaveTextContent('Specialty');
    });

    it('should display category descriptions', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      expect(screen.getByTestId('description-coffee')).toHaveTextContent('Hot & iced coffee drinks');
      expect(screen.getByTestId('description-tea')).toHaveTextContent('Hot & iced teas');
    });
  });

  // Test CategoryData type structure
  describe('CategoryData structure', () => {
    it('should match expected shape', () => {
      const coffeeCategory = CATEGORIES.find((c) => c.id === 'coffee');

      expect(coffeeCategory).toBeDefined();
      expect(coffeeCategory).toEqual({
        id: 'coffee',
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

      fireEvent.click(screen.getByTestId('category-coffee'));
      fireEvent.click(screen.getByTestId('category-tea'));
      fireEvent.click(screen.getByTestId('category-specialty'));

      expect(onSelect).toHaveBeenCalledTimes(3);
    });

    it('should handle selecting the same category multiple times', () => {
      const onSelect = vi.fn();
      render(<TestCategorySelector onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('category-coffee'));
      fireEvent.click(screen.getByTestId('category-coffee'));

      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelect).toHaveBeenNthCalledWith(1, 'coffee');
      expect(onSelect).toHaveBeenNthCalledWith(2, 'coffee');
    });
  });
});
