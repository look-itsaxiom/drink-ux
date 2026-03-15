import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DRINK_TYPES_BY_CATEGORY,
  useTypeSelector,
  TypeSelectorProps,
  getDrinkTypesByCategory,
} from '../TypeSelector';
import { DrinkType } from '../../../types';
import React from 'react';

// Test component that uses the hook
const TestTypeSelector: React.FC<TypeSelectorProps> = ({ category, onSelect, onBack }) => {
  const { drinkTypes, selectType, goBack, categoryName } = useTypeSelector({
    category,
    onSelect,
    onBack,
  });

  return (
    <div>
      <button data-testid="back-button" onClick={goBack}>
        Back
      </button>
      <h2 data-testid="category-title">{categoryName}</h2>
      {drinkTypes.map((type) => (
        <button
          key={type.id}
          onClick={() => selectType(type)}
          data-testid={`type-${type.id}`}
        >
          <span data-testid={`name-${type.id}`}>{type.name}</span>
          <span data-testid={`price-${type.id}`}>${(type.priceCents / 100).toFixed(2)}</span>
          {type.isHot !== undefined && (
            <span data-testid={`temp-${type.id}`}>
              {type.isHot ? 'Hot only' : 'Iced only'}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

describe('TypeSelector', () => {
  // Test DRINK_TYPES_BY_CATEGORY constant
  describe('DRINK_TYPES_BY_CATEGORY constant', () => {
    it('should have drink types for all categories', () => {
      expect(DRINK_TYPES_BY_CATEGORY['coffee']).toBeDefined();
      expect(DRINK_TYPES_BY_CATEGORY['tea']).toBeDefined();
      expect(DRINK_TYPES_BY_CATEGORY['specialty']).toBeDefined();
    });

    it('should have multiple coffee drink types', () => {
      const coffeeTypes = DRINK_TYPES_BY_CATEGORY['coffee'];
      expect(coffeeTypes.length).toBeGreaterThan(0);

      const typeNames = coffeeTypes.map((t) => t.name);
      expect(typeNames).toContain('Latte');
      expect(typeNames).toContain('Americano');
      expect(typeNames).toContain('Cappuccino');
    });

    it('should have tea drink types', () => {
      const teaTypes = DRINK_TYPES_BY_CATEGORY['tea'];
      expect(teaTypes.length).toBeGreaterThan(0);

      const typeNames = teaTypes.map((t) => t.name);
      expect(typeNames).toContain('Green Tea');
    });

    it('each drink type should have required properties', () => {
      Object.values(DRINK_TYPES_BY_CATEGORY).forEach((types) => {
        types.forEach((type) => {
          expect(type).toHaveProperty('id');
          expect(type).toHaveProperty('name');
          expect(type).toHaveProperty('category');
          expect(type).toHaveProperty('priceCents');
          expect(typeof type.priceCents).toBe('number');
          expect(type.priceCents).toBeGreaterThan(0);
        });
      });
    });

    it('drink types should have correct category references', () => {
      Object.entries(DRINK_TYPES_BY_CATEGORY).forEach(([category, types]) => {
        types.forEach((type) => {
          expect(type.category).toBe(category);
        });
      });
    });
  });

  // Test getDrinkTypesByCategory function
  describe('getDrinkTypesByCategory', () => {
    it('should return coffee types for coffee category', () => {
      const types = getDrinkTypesByCategory('coffee');
      expect(types).toEqual(DRINK_TYPES_BY_CATEGORY['coffee']);
    });

    it('should return empty array for unknown category', () => {
      const types = getDrinkTypesByCategory('unknown');
      expect(types).toEqual([]);
    });
  });

  // Test useTypeSelector hook
  describe('useTypeSelector hook', () => {
    it('should return drink types for the selected category', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="coffee"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      DRINK_TYPES_BY_CATEGORY['coffee'].forEach((type) => {
        expect(screen.getByTestId(`type-${type.id}`)).toBeInTheDocument();
      });
    });

    it('should call onSelect when a type is selected', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="coffee"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      fireEvent.click(screen.getByTestId('type-latte'));

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
        })
      );
    });

    it('should call onBack when back is clicked', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="coffee"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      fireEvent.click(screen.getByTestId('back-button'));

      expect(onBack).toHaveBeenCalled();
    });

    it('should display category name in title', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="tea"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      expect(screen.getByTestId('category-title')).toHaveTextContent('tea');
    });

    it('should display correct drink prices', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="coffee"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      const latteType = DRINK_TYPES_BY_CATEGORY['coffee'].find(
        (t) => t.id === 'latte'
      );
      expect(screen.getByTestId('price-latte')).toHaveTextContent(
        `$${(latteType!.priceCents / 100).toFixed(2)}`
      );
    });
  });

  // Test temperature constraints
  describe('temperature constraints', () => {
    it('should show hot only badge for hot-only drinks', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="coffee"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      // Cappuccino is hot only
      const cappuccinoType = DRINK_TYPES_BY_CATEGORY['coffee'].find(
        (t) => t.id === 'cappuccino'
      );
      if (cappuccinoType?.isHot === true) {
        expect(screen.getByTestId('temp-cappuccino')).toHaveTextContent('Hot only');
      }
    });

    it('should show iced only badge for iced-only drinks', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="coffee"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      // Cold Brew is iced only
      const coldBrewType = DRINK_TYPES_BY_CATEGORY['coffee'].find(
        (t) => t.id === 'cold-brew'
      );
      if (coldBrewType?.isHot === false) {
        expect(screen.getByTestId('temp-cold-brew')).toHaveTextContent('Iced only');
      }
    });

    it('should not show temperature badge for drinks with undefined isHot', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="coffee"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      // Latte should have isHot undefined
      const latteType = DRINK_TYPES_BY_CATEGORY['coffee'].find(
        (t) => t.id === 'latte'
      );
      if (latteType?.isHot === undefined) {
        expect(screen.queryByTestId('temp-latte')).not.toBeInTheDocument();
      }
    });
  });

  // Different categories
  describe('different categories', () => {
    it('should show tea types for tea category', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="tea"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      DRINK_TYPES_BY_CATEGORY['tea'].forEach((type) => {
        expect(screen.getByTestId(`type-${type.id}`)).toBeInTheDocument();
      });
    });

    it('should show specialty types for specialty category', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="specialty"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      DRINK_TYPES_BY_CATEGORY['specialty'].forEach((type) => {
        expect(screen.getByTestId(`type-${type.id}`)).toBeInTheDocument();
      });
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle rapid type selections', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="coffee"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      fireEvent.click(screen.getByTestId('type-latte'));
      fireEvent.click(screen.getByTestId('type-americano'));
      fireEvent.click(screen.getByTestId('type-cappuccino'));

      expect(onSelect).toHaveBeenCalledTimes(3);
    });

    it('should handle selecting the same type multiple times', () => {
      const onSelect = vi.fn();
      const onBack = vi.fn();

      render(
        <TestTypeSelector
          category="coffee"
          onSelect={onSelect}
          onBack={onBack}
        />
      );

      fireEvent.click(screen.getByTestId('type-latte'));
      fireEvent.click(screen.getByTestId('type-latte'));

      expect(onSelect).toHaveBeenCalledTimes(2);
    });
  });
});
