import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LayeredCup from '../LayeredCup';
import { DrinkLayer, TOPPING_PROPERTIES } from '../DrinkVisualizer';
import { CupSize } from '../../../types';

// Helper to create test layers
const createTestLayer = (overrides: Partial<DrinkLayer> = {}): DrinkLayer => ({
  id: 'test-layer',
  name: 'Test Layer',
  color: '#8B4513',
  opacity: 0.9,
  height: 0.5,
  order: 0,
  animated: true,
  animationType: 'fill',
  ...overrides,
});

describe('LayeredCup', () => {
  // Happy path tests
  describe('happy path', () => {
    it('should render SVG element', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render with default className', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('visual-cup');
    });

    it('should render cup outline', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const outline = document.querySelector('.cup-outline');
      expect(outline).toBeInTheDocument();
    });

    it('should render cup lid', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const lid = document.querySelector('.cup-lid');
      expect(lid).toBeInTheDocument();
    });
  });

  // Success scenarios with various configurations
  describe('success scenarios', () => {
    it('should render a single layer', () => {
      const layer = createTestLayer({ id: 'base', name: 'Base Drink' });

      render(
        <LayeredCup
          layers={[layer]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const drinkLayers = document.querySelectorAll('.drink-layer');
      expect(drinkLayers).toHaveLength(1);
    });

    it('should render multiple layers in order', () => {
      const layers = [
        createTestLayer({ id: 'syrup', order: 0, name: 'Syrup' }),
        createTestLayer({ id: 'base', order: 1, name: 'Base' }),
        createTestLayer({ id: 'milk', order: 2, name: 'Milk' }),
      ];

      render(
        <LayeredCup
          layers={layers}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const drinkLayers = document.querySelectorAll('.drink-layer');
      expect(drinkLayers).toHaveLength(3);
    });

    it('should apply custom className', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
          className="custom-cup"
        />
      );

      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('custom-cup');
    });

    it('should render large cup lid addition for large size', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.LARGE}
          cupHeight={240}
          hasTopping={false}
        />
      );

      const largeLidTop = document.querySelector('.large-cup-lid-top');
      expect(largeLidTop).toBeInTheDocument();
    });

    it('should not render large cup lid for small/medium sizes', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const largeLidTop = document.querySelector('.large-cup-lid-top');
      expect(largeLidTop).not.toBeInTheDocument();
    });

    it('should apply layer color correctly', () => {
      const layer = createTestLayer({
        id: 'base',
        color: '#FF0000',
        opacity: 0.8,
      });

      render(
        <LayeredCup
          layers={[layer]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const drinkLayer = document.querySelector('.drink-layer');
      expect(drinkLayer).toHaveAttribute('fill', '#FF0000');
      expect(drinkLayer).toHaveAttribute('opacity', '0.8');
    });

    it('should apply animation type class to layers', () => {
      const layer = createTestLayer({
        id: 'base',
        animationType: 'fill',
      });

      render(
        <LayeredCup
          layers={[layer]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const drinkLayer = document.querySelector('.drink-layer');
      expect(drinkLayer).toHaveClass('fill-layer');
    });

    it('should add whipped-layer class for whipped cream', () => {
      const layer = createTestLayer({
        id: 'whipped',
        name: 'Whipped Cream',
        animationType: 'fill',
      });

      render(
        <LayeredCup
          layers={[layer]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const drinkLayer = document.querySelector('.drink-layer');
      expect(drinkLayer).toHaveClass('whipped-layer');
    });
  });

  // Topping scenarios
  describe('topping scenarios', () => {
    it('should render foam bubbles for foam topping', () => {
      render(
        <LayeredCup
          layers={[createTestLayer()]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={true}
          toppingType="Foam"
        />
      );

      const bubbles = document.querySelectorAll('.foam-bubble');
      expect(bubbles.length).toBeGreaterThan(0);
    });

    it('should render sprinkles for sprinkle topping', () => {
      render(
        <LayeredCup
          layers={[createTestLayer()]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={true}
          toppingType="Cinnamon"
        />
      );

      const sprinkles = document.querySelectorAll('.sprinkle');
      expect(sprinkles.length).toBeGreaterThan(0);
    });

    it('should render dust particles for dust topping', () => {
      render(
        <LayeredCup
          layers={[createTestLayer()]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={true}
          toppingType="Cocoa Powder"
        />
      );

      const dustParticles = document.querySelectorAll('.dust-particle');
      expect(dustParticles.length).toBeGreaterThan(0);
    });

    it('should not render toppings when hasTopping is false', () => {
      render(
        <LayeredCup
          layers={[createTestLayer()]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
          toppingType="Cinnamon"
        />
      );

      const sprinkles = document.querySelectorAll('.sprinkle');
      const bubbles = document.querySelectorAll('.foam-bubble');
      const dustParticles = document.querySelectorAll('.dust-particle');

      expect(sprinkles).toHaveLength(0);
      expect(bubbles).toHaveLength(0);
      expect(dustParticles).toHaveLength(0);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle empty layers array', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const drinkLayers = document.querySelectorAll('.drink-layer');
      expect(drinkLayers).toHaveLength(0);
    });

    it('should handle undefined toppingType when hasTopping is true', () => {
      render(
        <LayeredCup
          layers={[createTestLayer()]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={true}
          toppingType={undefined}
        />
      );

      // Should not crash and should not render toppings
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle unknown topping type with default properties', () => {
      render(
        <LayeredCup
          layers={[createTestLayer()]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={true}
          toppingType="Unknown Topping"
        />
      );

      // Should use default sprinkle type
      const sprinkles = document.querySelectorAll('.sprinkle');
      expect(sprinkles.length).toBeGreaterThan(0);
    });

    it('should handle layers with same order (no crash)', () => {
      const layers = [
        createTestLayer({ id: 'layer1', order: 0 }),
        createTestLayer({ id: 'layer2', order: 0 }),
      ];

      render(
        <LayeredCup
          layers={layers}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const drinkLayers = document.querySelectorAll('.drink-layer');
      expect(drinkLayers).toHaveLength(2);
    });

    it('should handle very small cup height', () => {
      render(
        <LayeredCup
          layers={[createTestLayer()]}
          cupSize={CupSize.SMALL}
          cupHeight={50}
          hasTopping={false}
        />
      );

      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 200 90');
    });

    it('should handle layers with height 0', () => {
      const layer = createTestLayer({ height: 0 });

      render(
        <LayeredCup
          layers={[layer]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      // Should render without error
      const drinkLayer = document.querySelector('.drink-layer');
      expect(drinkLayer).toBeInTheDocument();
    });
  });

  // ViewBox calculations
  describe('viewBox calculations', () => {
    it('should set viewBox based on cupHeight', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 200 240'); // cupHeight + 40
    });

    it('should adjust viewBox for small cup', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.SMALL}
          cupHeight={160}
          hasTopping={false}
        />
      );

      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 200 200'); // 160 + 40
    });

    it('should adjust viewBox for large cup', () => {
      render(
        <LayeredCup
          layers={[]}
          cupSize={CupSize.LARGE}
          cupHeight={240}
          hasTopping={false}
        />
      );

      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 200 280'); // 240 + 40
    });
  });

  // CSS custom properties
  describe('CSS custom properties', () => {
    it('should set layer order as CSS custom property', () => {
      const layer = createTestLayer({ order: 2 });

      render(
        <LayeredCup
          layers={[layer]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const drinkLayer = document.querySelector('.drink-layer');
      expect(drinkLayer).toHaveStyle({ '--layer-order': '2' });
    });

    it('should set animation delay based on layer order', () => {
      const layer = createTestLayer({ order: 3 });

      render(
        <LayeredCup
          layers={[layer]}
          cupSize={CupSize.MEDIUM}
          cupHeight={200}
          hasTopping={false}
        />
      );

      const drinkLayer = document.querySelector('.drink-layer');
      expect(drinkLayer).toHaveStyle({ '--layer-delay': '360ms' }); // 3 * 120ms
    });
  });
});
