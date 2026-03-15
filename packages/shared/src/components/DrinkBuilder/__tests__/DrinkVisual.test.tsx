import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DrinkVisual from '../DrinkVisual';

// Helper to create a minimal valid state for DrinkVisual
const createBaseState = (overrides: Record<string, any> = {}): Record<string, any> => ({
  selectedModifiers: [],
  totalPriceCents: 0,
  ...overrides,
});

describe('DrinkVisual', () => {
  // Happy path tests
  describe('happy path', () => {
    it('should render the component', () => {
      render(<DrinkVisual state={createBaseState()} />);

      const container = document.querySelector('.drink-visual');
      expect(container).toBeInTheDocument();
    });

    it('should render empty cup hint when no drink type', () => {
      render(<DrinkVisual state={createBaseState()} />);

      const hint = screen.getByText(/select a drink to get started/i);
      expect(hint).toBeInTheDocument();
    });

    it('should render empty cup SVG when no drink type', () => {
      render(<DrinkVisual state={createBaseState()} />);

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // Should have cup outline
      const outline = document.querySelector('.cup-outline');
      expect(outline).toBeInTheDocument();
    });
  });

  // Success scenarios with drink selection
  describe('success scenarios', () => {
    it('should render LayeredCup when drink type is selected', () => {
      const state = createBaseState({
        category: 'coffee',
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        selectedVariation: { id: 'medium', baseId: '', name: 'Medium', priceCents: 0, displayOrder: 1, available: true },
      });

      render(<DrinkVisual state={state} />);

      // Should show drink layers
      const drinkLayers = document.querySelectorAll('.drink-layer');
      expect(drinkLayers.length).toBeGreaterThan(0);
    });

    it('should not show empty cup hint when drink type is selected', () => {
      const state = createBaseState({
        category: 'coffee',
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        selectedVariation: { id: 'medium', baseId: '', name: 'Medium', priceCents: 0, displayOrder: 1, available: true },
      });

      render(<DrinkVisual state={state} />);

      const hint = document.querySelector('.empty-cup-hint');
      expect(hint).not.toBeInTheDocument();
    });

    it('should show cup info when drink type is selected', () => {
      const state = createBaseState({
        category: 'coffee',
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        selectedVariation: { id: 'medium', baseId: '', name: 'Medium', priceCents: 0, displayOrder: 1, available: true },
      });

      render(<DrinkVisual state={state} />);

      const cupInfo = document.querySelector('.cup-info');
      expect(cupInfo).toBeInTheDocument();
    });

    it('should display variation name in cup info', () => {
      const state = createBaseState({
        category: 'coffee',
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        selectedVariation: { id: 'large', baseId: '', name: 'Large', priceCents: 100, displayOrder: 2, available: true },
      });

      render(<DrinkVisual state={state} />);

      // DrinkVisual renders `${sizeName} Cup` when selectedVariation is set
      expect(screen.getByText(/Large Cup/i)).toBeInTheDocument();
    });

    it('should display drink name', () => {
      const state = createBaseState({
        category: 'coffee',
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        selectedVariation: { id: 'medium', baseId: '', name: 'Medium', priceCents: 0, displayOrder: 1, available: true },
      });

      render(<DrinkVisual state={state} />);

      const drinkName = document.querySelector('.drink-name');
      expect(drinkName).toBeInTheDocument();
      expect(drinkName?.textContent).toContain('Latte');
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle undefined selectedVariation gracefully', () => {
      const state = createBaseState({
        category: 'coffee',
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        // selectedVariation is undefined
      });

      render(<DrinkVisual state={state} />);

      // Should render with default cup size
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle drink type with isHot=false', () => {
      const state = createBaseState({
        category: 'coffee',
        drinkType: {
          id: 'iced-latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        selectedVariation: { id: 'medium', baseId: '', name: 'Medium', priceCents: 0, displayOrder: 1, available: true },
        isHot: false,
      });

      render(<DrinkVisual state={state} />);

      // Should render without crashing
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display only Cup when selectedVariation is undefined', () => {
      const state = createBaseState({
        category: 'coffee',
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
      });

      render(<DrinkVisual state={state} />);

      const cupInfo = document.querySelector('.cup-info h3');
      expect(cupInfo?.textContent).toBe('Cup');
    });
  });
});
