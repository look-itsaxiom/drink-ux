import { describe, it, expect } from 'vitest';
import { DrinkVisualizer, DRINK_COLORS, SYRUP_COLORS, MILK_COLORS, TOPPING_PROPERTIES } from '../DrinkVisualizer';

// DrinkVisualizer uses a legacy state shape internally (milk, syrups, toppings, cupSize).
// We pass plain objects that match that legacy shape since the module types state as `any`.

// Helper to create a minimal valid state
const createBaseState = (overrides: Record<string, any> = {}): Record<string, any> => ({
  syrups: [],
  toppings: [],
  ...overrides,
});

describe('DrinkVisualizer', () => {
  describe('generateVisualProperties', () => {
    // Happy path tests
    describe('happy path', () => {
      it('should return empty layers for empty state', () => {
        const state = createBaseState();
        const result = DrinkVisualizer.generateVisualProperties(state);

        expect(result.layers).toHaveLength(0);
        expect(result.hasTopping).toBe(false);
        expect(result.hasFoam).toBe(false);
        expect(result.temperature).toBe('hot');
      });

      it('should generate base layer when drink type is selected', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'latte',
            name: 'Latte',
            category: 'coffee',
            priceCents: 450,
          },
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        expect(result.layers.length).toBeGreaterThan(0);
        const baseLayer = result.layers.find(l => l.id === 'base');
        expect(baseLayer).toBeDefined();
        expect(baseLayer?.name).toBe('Latte');
      });

      it('should include syrup layer when syrup is added', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'latte',
            name: 'Latte',
            category: 'coffee',
            priceCents: 450,
          },
          syrups: [{
            id: 'vanilla',
            name: 'Vanilla Syrup',
            type: 'modifier',
            category: 'syrup',
            priceCents: 50,
            canTransformDrink: false,
            visual: { color: '#F5DEB3', opacity: 0.4, layerOrder: 1 },
            available: true,
          }],
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        const syrupLayer = result.layers.find(l => l.id === 'syrup-0');
        expect(syrupLayer).toBeDefined();
        expect(syrupLayer?.name).toBe('Vanilla Syrup');
      });

      it('should include milk layer when milk is added', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'latte',
            name: 'Latte',
            category: 'coffee',
            priceCents: 450,
          },
          milk: {
            id: 'oat',
            name: 'Oat Milk',
            type: 'modifier',
            category: 'milk',
            priceCents: 75,
            canTransformDrink: false,
            visual: { color: '#F0E68C', opacity: 0.8, layerOrder: 2 },
            available: true,
          },
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        const milkLayer = result.layers.find(l => l.id === 'milk');
        expect(milkLayer).toBeDefined();
        expect(milkLayer?.name).toBe('Oat Milk');
      });
    });

    // Success scenarios with various configurations
    describe('success scenarios', () => {
      it('should set temperature to cold when isHot is false', () => {
        const state = createBaseState({
          isHot: false,
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        expect(result.temperature).toBe('cold');
      });

      it('should add foam layer for hot drinks', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'latte',
            name: 'Latte',
            category: 'coffee',
            priceCents: 450,
          },
          isHot: true,
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        expect(result.hasFoam).toBe(true);
        const foamLayer = result.layers.find(l => l.id === 'foam');
        expect(foamLayer).toBeDefined();
      });

      it('should add whipped cream as a layer not a topping', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'latte',
            name: 'Latte',
            category: 'coffee',
            priceCents: 450,
          },
          toppings: [{
            id: 'whip',
            name: 'Whipped Cream',
            type: 'modifier',
            category: 'topping',
            priceCents: 50,
            canTransformDrink: false,
            visual: { color: '#FFFAF0', opacity: 0.9, layerOrder: 4 },
            available: true,
          }],
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        const whippedLayer = result.layers.find(l => l.id === 'whipped');
        expect(whippedLayer).toBeDefined();
        expect(result.hasTopping).toBe(false); // Whipped cream is a layer, not a particle topping
      });

      it('should show particle toppings for cinnamon', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'latte',
            name: 'Latte',
            category: 'coffee',
            priceCents: 450,
          },
          toppings: [{
            id: 'cinnamon',
            name: 'Cinnamon',
            type: 'modifier',
            category: 'topping',
            priceCents: 0,
            canTransformDrink: false,
            visual: { color: '#D2691E', opacity: 0.5, layerOrder: 4 },
            available: true,
          }],
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        expect(result.hasTopping).toBe(true);
        expect(result.toppingType).toBe('Cinnamon');
      });

      it('should order layers correctly (syrup at bottom, foam at top)', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'latte',
            name: 'Latte',
            category: 'coffee',
            priceCents: 450,
          },
          isHot: true,
          milk: {
            id: 'whole',
            name: 'Whole Milk',
            type: 'modifier',
            category: 'milk',
            priceCents: 0,
            canTransformDrink: false,
            visual: { color: '#FFFEF7', opacity: 0.8, layerOrder: 2 },
            available: true,
          },
          syrups: [{
            id: 'caramel',
            name: 'Caramel Syrup',
            type: 'modifier',
            category: 'syrup',
            priceCents: 50,
            canTransformDrink: false,
            visual: { color: '#D2691E', opacity: 0.4, layerOrder: 1 },
            available: true,
          }],
        });

        const result = DrinkVisualizer.generateVisualProperties(state);
        const sortedLayers = [...result.layers].sort((a, b) => a.order - b.order);

        // Order should be: syrup (0) -> base (1) -> milk (2) -> foam (3)
        expect(sortedLayers[0].id).toBe('syrup-0');
        expect(sortedLayers[1].id).toBe('base');
        expect(sortedLayers[2].id).toBe('milk');
        expect(sortedLayers[3].id).toBe('foam');
      });
    });

    // Edge cases
    describe('edge cases', () => {
      it('should handle missing drinkType gracefully', () => {
        const state = createBaseState({
          category: 'coffee',
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        // Should not throw and should return valid structure
        expect(result.layers).toBeDefined();
        expect(Array.isArray(result.layers)).toBe(true);
      });

      it('should handle empty syrups array', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'latte',
            name: 'Latte',
            category: 'coffee',
            priceCents: 450,
          },
          syrups: [],
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        const syrupLayers = result.layers.filter(l => l.id.startsWith('syrup'));
        expect(syrupLayers).toHaveLength(0);
      });

      it('should handle empty toppings array', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'latte',
            name: 'Latte',
            category: 'coffee',
            priceCents: 450,
          },
          toppings: [],
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        expect(result.hasTopping).toBe(false);
        expect(result.toppingType).toBeUndefined();
      });
    });

    // Different drink categories
    describe('drink categories', () => {
      it('should use green color for green tea', () => {
        const state = createBaseState({
          category: 'tea',
          drinkType: {
            id: 'green-tea',
            name: 'Green Tea',
            category: 'tea',
            priceCents: 300,
          },
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        const baseLayer = result.layers.find(l => l.id === 'base');
        // Green Tea uses DRINK_PROFILES color, which is more realistic than DRINK_COLORS
        expect(baseLayer?.color).toBe('#8DB360');
      });

      it('should use dark color for espresso', () => {
        const state = createBaseState({
          category: 'coffee',
          drinkType: {
            id: 'espresso',
            name: 'Espresso',
            category: 'coffee',
            priceCents: 300,
          },
        });

        const result = DrinkVisualizer.generateVisualProperties(state);

        const baseLayer = result.layers.find(l => l.id === 'base');
        // Espresso uses DRINK_PROFILES color, which is more realistic than DRINK_COLORS
        expect(baseLayer?.color).toBe('#1A0A02');
      });
    });
  });

  describe('getCupHeight', () => {
    it('should return 160 for small cup', () => {
      expect(DrinkVisualizer.getCupHeight('small')).toBe(160);
    });

    it('should return 200 for medium cup', () => {
      expect(DrinkVisualizer.getCupHeight('medium')).toBe(200);
    });

    it('should return 240 for large cup', () => {
      expect(DrinkVisualizer.getCupHeight('large')).toBe(240);
    });

    it('should return 200 as default for undefined cup size', () => {
      expect(DrinkVisualizer.getCupHeight(undefined)).toBe(200);
    });
  });

  describe('generateDrinkName', () => {
    it('should return empty string when no drink type', () => {
      const state = createBaseState();
      expect(DrinkVisualizer.generateDrinkName(state)).toBe('');
    });

    it('should include drink type name', () => {
      const state = createBaseState({
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
      });

      const name = DrinkVisualizer.generateDrinkName(state);
      expect(name).toContain('Latte');
    });

    it('should include cup size', () => {
      const state = createBaseState({
        cupSize: 'large',
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
      });

      const name = DrinkVisualizer.generateDrinkName(state);
      expect(name).toContain('Large');
    });

    it('should include Iced for cold drinks', () => {
      const state = createBaseState({
        isHot: false,
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
      });

      const name = DrinkVisualizer.generateDrinkName(state);
      expect(name).toContain('Iced');
    });

    it('should include syrup flavor', () => {
      const state = createBaseState({
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        syrups: [{
          id: 'vanilla',
          name: 'Vanilla Syrup',
          type: 'modifier',
          category: 'syrup',
          priceCents: 50,
          canTransformDrink: false,
          visual: { color: '#F5DEB3', opacity: 0.4, layerOrder: 1 },
          available: true,
        }],
      });

      const name = DrinkVisualizer.generateDrinkName(state);
      expect(name).toContain('Vanilla');
    });

    it('should include non-standard milk type', () => {
      const state = createBaseState({
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        milk: {
          id: 'oat',
          name: 'Oat Milk',
          type: 'modifier',
          category: 'milk',
          priceCents: 75,
          canTransformDrink: false,
          visual: { color: '#F0E68C', opacity: 0.8, layerOrder: 2 },
          available: true,
        },
      });

      const name = DrinkVisualizer.generateDrinkName(state);
      expect(name).toContain('Oat');
    });

    it('should not include whole milk in name', () => {
      const state = createBaseState({
        drinkType: {
          id: 'latte',
          name: 'Latte',
          category: 'coffee',
          priceCents: 450,
        },
        milk: {
          id: 'whole',
          name: 'Whole Milk',
          type: 'modifier',
          category: 'milk',
          priceCents: 0,
          canTransformDrink: false,
          visual: { color: '#FFFEF7', opacity: 0.8, layerOrder: 2 },
          available: true,
        },
      });

      const name = DrinkVisualizer.generateDrinkName(state);
      expect(name).not.toContain('Whole');
    });
  });

  // Test exported constants
  describe('exported constants', () => {
    it('DRINK_COLORS should have drink categories', () => {
      expect(DRINK_COLORS['coffee']).toBeDefined();
      expect(DRINK_COLORS['tea']).toBeDefined();
      expect(DRINK_COLORS['italian_soda']).toBeDefined();
      expect(DRINK_COLORS['juice']).toBeDefined();
      expect(DRINK_COLORS['blended']).toBeDefined();
      expect(DRINK_COLORS['specialty']).toBeDefined();
    });

    it('SYRUP_COLORS should have common syrup flavors', () => {
      expect(SYRUP_COLORS.vanilla).toBeDefined();
      expect(SYRUP_COLORS.caramel).toBeDefined();
      expect(SYRUP_COLORS.hazelnut).toBeDefined();
      expect(SYRUP_COLORS.default).toBeDefined();
    });

    it('MILK_COLORS should have common milk types', () => {
      expect(MILK_COLORS['Whole Milk']).toBeDefined();
      expect(MILK_COLORS['Oat Milk']).toBeDefined();
      expect(MILK_COLORS['Almond Milk']).toBeDefined();
      expect(MILK_COLORS.default).toBeDefined();
    });

    it('TOPPING_PROPERTIES should have common toppings', () => {
      expect(TOPPING_PROPERTIES['Whipped Cream']).toBeDefined();
      expect(TOPPING_PROPERTIES['Foam']).toBeDefined();
      expect(TOPPING_PROPERTIES['Cinnamon']).toBeDefined();
      expect(TOPPING_PROPERTIES.default).toBeDefined();
    });
  });
});
