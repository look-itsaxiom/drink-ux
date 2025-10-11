import { DrinkBuilderState, DrinkCategory, CupSize } from '@drink-ux/shared';

export interface DrinkLayer {
  id: string;
  name: string;
  color: string;
  opacity: number;
  height: number; // percentage of cup height (0-1)
  order: number; // lower = bottom layer
  animated?: boolean;
  animationType?: 'fill' | 'foam' | 'drizzle' | 'sparkle';
}

export interface VisualProperties {
  layers: DrinkLayer[];
  hasTopping: boolean;
  hasFoam: boolean;
  temperature: 'hot' | 'cold';
  toppingType?: string;
}

// Base drink colors by category
export const DRINK_COLORS = {
  [DrinkCategory.COFFEE]: {
    base: '#8B4513', // Saddle brown
    light: '#D2691E', // Chocolate
    dark: '#3E2723', // Dark brown
  },
  [DrinkCategory.TEA]: {
    base: '#CD853F', // Peru
    light: '#DEB887', // Burlywood
    dark: '#A0522D', // Sienna
    green: '#228B22', // Forest green
    black: '#2F1B14', // Dark tea
  },
  [DrinkCategory.ITALIAN_SODA]: {
    base: '#87CEEB', // Sky blue
    light: '#F0F8FF', // Alice blue
    cherry: '#DC143C', // Crimson
    vanilla: '#F5DEB3', // Wheat
  },
  [DrinkCategory.JUICE]: {
    orange: '#FFA500', // Orange
    apple: '#FFFF00', // Yellow
    cranberry: '#DC143C', // Crimson
    base: '#FF6347', // Tomato
  },
  [DrinkCategory.BLENDED]: {
    base: '#DDA0DD', // Plum
    strawberry: '#FF69B4', // Hot pink
    vanilla: '#F5DEB3', // Wheat
  },
  [DrinkCategory.SPECIALTY]: {
    base: '#9370DB', // Medium purple
    light: '#E6E6FA', // Lavender
  },
};

// Syrup colors
export const SYRUP_COLORS = {
  vanilla: '#F5DEB3',
  caramel: '#D2691E',
  hazelnut: '#D2B48C',
  chocolate: '#8B4513',
  raspberry: '#DC143C',
  strawberry: '#FF69B4',
  coconut: '#FFFAF0',
  amaretto: '#D2691E',
  irish_cream: '#F5DEB3',
  pumpkin_spice: '#FF8C00',
  cinnamon: '#D2691E',
  lavender: '#E6E6FA',
  mint: '#98FB98',
  default: '#DAA520', // Golden rod
};

// Milk colors and properties
export const MILK_COLORS = {
  'Whole Milk': { color: '#FFFEF7', opacity: 0.8 },
  'Skim Milk': { color: '#FFFEF7', opacity: 0.6 },
  '2% Milk': { color: '#FFFEF7', opacity: 0.7 },
  'Almond Milk': { color: '#F5E6D3', opacity: 0.7 },
  'Oat Milk': { color: '#F0E68C', opacity: 0.8 },
  'Soy Milk': { color: '#FFFACD', opacity: 0.7 },
  'Coconut Milk': { color: '#FFFAF0', opacity: 0.8 },
  'Cashew Milk': { color: '#F5E6D3', opacity: 0.6 },
  'Heavy Cream': { color: '#FFFEF7', opacity: 0.9 },
  default: { color: '#FFFEF7', opacity: 0.7 },
};

// Topping properties
export const TOPPING_PROPERTIES = {
  'Whipped Cream': {
    color: '#FFFEF7',
    type: 'foam',
    height: 0.15,
    animated: true,
  },
  'Foam': {
    color: '#FFFEF7',
    type: 'foam',
    height: 0.1,
    animated: true,
  },
  'Cinnamon': {
    color: '#D2691E',
    type: 'sprinkle',
    height: 0.02,
    animated: true,
  },
  'Chocolate Chips': {
    color: '#8B4513',
    type: 'sprinkle',
    height: 0.03,
    animated: true,
  },
  'Cocoa Powder': {
    color: '#8B4513',
    type: 'dust',
    height: 0.02,
    animated: true,
  },
  default: {
    color: '#DDD',
    type: 'sprinkle',
    height: 0.02,
    animated: false,
  },
};

export class DrinkVisualizer {
  static generateVisualProperties(state: DrinkBuilderState): VisualProperties {
    // Layering strategy (bottom -> top):
    // - Syrups: small layers at the very bottom (animation: fill)
    // - Base: adaptive height main liquid (animation: fill)
    // - Milk: middle layer if present (animation: fill)
    // - Foam: small layer at the top if present (animation: fill)
    // - Whipped Cream: medium layer above foam if selected (animation: fill)
    // Toppings (particles) are only shown for sprinkle/dust types; foam/whipped are treated as layers instead.
    const layers: DrinkLayer[] = [];

    // Gather desired heights
  const firstSyrup = state.syrups[0];
  const syrupHeight = 0.05; // slightly thicker bottom syrup layer
  const syrupTotal = firstSyrup ? syrupHeight : 0;

    const milkPresent = Boolean(state.milk);
    const milkHeight = milkPresent ? 0.2 : 0;

    const foamPresent = state.isHot || this.shouldHaveFoam(state);
    const foamHeight = foamPresent ? 0.08 : 0;

    const firstTopping = state.toppings[0]?.name;
    const isWhipped = firstTopping === 'Whipped Cream';
    const whippedHeight = isWhipped ? 0.12 : 0;

    // Base height adapts to fit remaining space
    let baseHeight = 0.6;
    const othersTotal = syrupTotal + milkHeight + foamHeight + whippedHeight;
    const maxTotal = 0.9; // leave a little headroom visually
    if (baseHeight + othersTotal > maxTotal) {
      baseHeight = Math.max(0.2, maxTotal - othersTotal);
    }

    let order = 0;

    // 1) Syrups at the very bottom
    if (firstSyrup) {
      const syrupColor = this.getSyrupColor(firstSyrup.name);
      layers.push({
        id: `syrup-0`,
        name: firstSyrup.name,
        color: syrupColor,
        opacity: 0.45,
        height: syrupHeight,
        order: order++,
        animated: true,
        animationType: 'fill',
      });
    }

    // 2) Base drink above syrups
    if (state.drinkType && state.category) {
      const baseColor = this.getBaseDrinkColor(state);
      layers.push({
        id: 'base',
        name: 'Base Drink',
        color: baseColor,
        opacity: 0.9,
        height: baseHeight,
        order: order++,
        animated: true,
        animationType: 'fill',
      });
    }

    // 3) Milk layer (middle)
    if (milkPresent && state.milk) {
      const milkProps = this.getMilkProperties(state.milk.name);
      layers.push({
        id: 'milk',
        name: state.milk.name,
        color: milkProps.color,
        opacity: milkProps.opacity,
        height: milkHeight,
        order: order++,
        animated: true,
        animationType: 'fill',
      });
    }

    // 4) Foam layer (small, at the top)
    if (foamPresent) {
      layers.push({
        id: 'foam',
        name: 'Foam',
        color: '#FFFEF7',
        opacity: 0.9,
        height: foamHeight,
        order: order++,
        animated: true,
        animationType: 'fill',
      });
    }

    // 5) Whipped cream (medium, above foam if present)
    if (isWhipped) {
      layers.push({
        id: 'whipped',
        name: 'Whipped Cream',
        color: '#FFFEF7',
        opacity: 0.95,
        height: whippedHeight,
        order: order++,
        animated: true,
        animationType: 'fill',
      });
    }

    // Only keep particle toppings for sprinkle/dust types
    const toppingName = firstTopping;
    const particleToppings = ['Cinnamon', 'Chocolate Chips', 'Cocoa Powder'];
    const showParticles = toppingName ? particleToppings.includes(toppingName) : false;

    return {
      layers,
      hasTopping: showParticles,
      hasFoam: foamPresent,
      temperature: state.isHot === false ? 'cold' : 'hot',
      toppingType: showParticles ? toppingName : undefined,
    };
  }

  private static getBaseDrinkColor(state: DrinkBuilderState): string {
    if (!state.category || !state.drinkType) return DRINK_COLORS[DrinkCategory.COFFEE].base;

    // Special handling for different drink types
    if (state.category === DrinkCategory.TEA) {
      const drinkName = state.drinkType.name.toLowerCase();
      if (drinkName.includes('green')) return DRINK_COLORS[DrinkCategory.TEA].green;
      if (drinkName.includes('black')) return DRINK_COLORS[DrinkCategory.TEA].black;
      return DRINK_COLORS[DrinkCategory.TEA].base;
    }

    if (state.category === DrinkCategory.COFFEE) {
      const drinkName = state.drinkType.name.toLowerCase();
      if (drinkName.includes('espresso') || drinkName.includes('americano')) {
        return DRINK_COLORS[DrinkCategory.COFFEE].dark;
      }
      if (drinkName.includes('latte') || drinkName.includes('cappuccino')) {
        return DRINK_COLORS[DrinkCategory.COFFEE].light;
      }
      return DRINK_COLORS[DrinkCategory.COFFEE].base;
    }

    // Default to the category base if available; otherwise coffee base
    return (DRINK_COLORS as any)[state.category]?.base || DRINK_COLORS[DrinkCategory.COFFEE].base;
  }

  private static getSyrupColor(syrupName: string): string {
    const normalizedName = syrupName.toLowerCase().replace(/\s+/g, '_').replace('_syrup', '');
    
    // Try exact match first
    if (SYRUP_COLORS[normalizedName as keyof typeof SYRUP_COLORS]) {
      return SYRUP_COLORS[normalizedName as keyof typeof SYRUP_COLORS];
    }

    // Try partial matches
    for (const [key, color] of Object.entries(SYRUP_COLORS)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return color;
      }
    }

    return SYRUP_COLORS.default;
  }

  private static getMilkProperties(milkName: string): { color: string; opacity: number } {
    return MILK_COLORS[milkName as keyof typeof MILK_COLORS] || MILK_COLORS.default;
  }

  private static shouldHaveFoam(state: DrinkBuilderState): boolean {
    if (!state.drinkType) return false;
    
    const drinkName = state.drinkType.name.toLowerCase();
    return drinkName.includes('cappuccino') || 
           drinkName.includes('latte') || 
           drinkName.includes('macchiato');
  }

  static getCupHeight(cupSize?: CupSize): number {
    switch (cupSize) {
      case CupSize.SMALL: return 160;
      case CupSize.MEDIUM: return 200;
      case CupSize.LARGE: return 240;
      default: return 200;
    }
  }

  static generateDrinkName(state: DrinkBuilderState): string {
    if (!state.drinkType) return '';

    const parts: string[] = [];
    
    // Size
    if (state.cupSize) {
      parts.push(state.cupSize.charAt(0).toUpperCase() + state.cupSize.slice(1));
    }

    // Temperature
    if (state.isHot === false) {
      parts.push('Iced');
    }

    // Syrup flavor (first one only for brevity)
    if (state.syrups.length > 0) {
      parts.push(state.syrups[0].name.replace(' Syrup', ''));
    }

    // Milk type
    if (state.milk && state.milk.name !== 'Whole Milk') {
      parts.push(state.milk.name.replace(' Milk', ''));
    }

    // Drink type
    parts.push(state.drinkType.name);

    return parts.join(' ');
  }
}