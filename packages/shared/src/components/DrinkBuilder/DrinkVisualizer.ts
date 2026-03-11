import { DrinkBuilderState, DrinkCategory, CupSize } from '../../types.js';

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

export interface DrinkVisualProperties {
  layers: DrinkLayer[];
  hasTopping: boolean;
  hasFoam: boolean;
  temperature: 'hot' | 'cold';
  toppingType?: string;
}

// ── Color utilities ──────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

/** Mix two hex colors. ratio 0 = all colorA, 1 = all colorB */
function mixColors(colorA: string, colorB: string, ratio: number): string {
  const [rA, gA, bA] = hexToRgb(colorA);
  const [rB, gB, bB] = hexToRgb(colorB);
  const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex(
    rA + (rB - rA) * t,
    gA + (gB - gA) * t,
    bA + (bB - bA) * t,
  );
}

/** Lighten a color toward white */
function lighten(color: string, amount: number): string {
  return mixColors(color, '#FFFFFF', amount);
}

// ── Base drink colors by category ────────────────────────────────────

export const DRINK_COLORS = {
  [DrinkCategory.COFFEE]: {
    base: '#6F4E37',     // Classic coffee brown
    light: '#A0785A',    // Lighter coffee (for lattes without milk modifier)
    dark: '#2C1503',     // Near-black espresso/americano
  },
  [DrinkCategory.TEA]: {
    base: '#C68E4E',     // Amber tea
    light: '#DDBF8F',    // Light tea
    dark: '#8B5E3C',     // Strong black tea
    green: '#7BA05B',    // Green tea
    black: '#5C3317',    // Dark black tea
  },
  [DrinkCategory.ITALIAN_SODA]: {
    base: '#5DADE2',     // Bright blue
    light: '#AED6F1',
    cherry: '#E74C3C',
    vanilla: '#F5DEB3',
  },
  [DrinkCategory.JUICE]: {
    orange: '#F39C12',
    apple: '#F1C40F',
    cranberry: '#C0392B',
    base: '#E67E22',
  },
  [DrinkCategory.BLENDED]: {
    base: '#BB8FCE',     // Soft purple
    strawberry: '#EC7063',
    vanilla: '#F0E2C4',
  },
  [DrinkCategory.SPECIALTY]: {
    base: '#8E6CC0',
    light: '#D5C4F0',
  },
};

// Syrup colors — more saturated so they're visible at the cup bottom
export const SYRUP_COLORS: Record<string, string> = {
  vanilla: '#E8C96B',
  caramel: '#C67A2E',
  hazelnut: '#B8884E',
  chocolate: '#5C3317',
  raspberry: '#C92A5A',
  strawberry: '#D4497A',
  coconut: '#F2E5C8',
  amaretto: '#B8722D',
  irish_cream: '#D4B87A',
  pumpkin_spice: '#D47B1E',
  cinnamon: '#A0522D',
  lavender: '#B49ADB',
  mint: '#5EBD73',
  default: '#C79832',
};

// Milk colors — each type has a distinct tint so you can tell them apart
export const MILK_COLORS: Record<string, { color: string; opacity: number; blendStrength: number }> = {
  'Whole Milk':   { color: '#FFF8E7', opacity: 0.85, blendStrength: 0.55 },
  'Skim Milk':    { color: '#F0F0F0', opacity: 0.70, blendStrength: 0.40 },
  '2% Milk':      { color: '#FFF5E0', opacity: 0.78, blendStrength: 0.48 },
  'Almond Milk':  { color: '#F0DFC0', opacity: 0.75, blendStrength: 0.45 },
  'Oat Milk':     { color: '#EDD9A3', opacity: 0.82, blendStrength: 0.50 },
  'Soy Milk':     { color: '#F5ECC0', opacity: 0.75, blendStrength: 0.42 },
  'Coconut Milk': { color: '#FFF5EC', opacity: 0.80, blendStrength: 0.48 },
  'Cashew Milk':  { color: '#F2E0C4', opacity: 0.72, blendStrength: 0.40 },
  'Heavy Cream':  { color: '#FFFBE8', opacity: 0.92, blendStrength: 0.65 },
  default:        { color: '#FFF5E0', opacity: 0.75, blendStrength: 0.45 },
};

// Topping properties
export const TOPPING_PROPERTIES: Record<string, { color: string; type: string; height: number; animated: boolean }> = {
  'Whipped Cream': {
    color: '#FFFFF0',
    type: 'foam',
    height: 0.15,
    animated: true,
  },
  'Foam': {
    color: '#FFFFF0',
    type: 'foam',
    height: 0.1,
    animated: true,
  },
  'Cinnamon': {
    color: '#A0522D',
    type: 'sprinkle',
    height: 0.02,
    animated: true,
  },
  'Chocolate Chips': {
    color: '#5C3317',
    type: 'sprinkle',
    height: 0.03,
    animated: true,
  },
  'Cocoa Powder': {
    color: '#6B3A20',
    type: 'dust',
    height: 0.02,
    animated: true,
  },
  default: {
    color: '#CCC',
    type: 'sprinkle',
    height: 0.02,
    animated: false,
  },
};

export class DrinkVisualizer {
  /**
   * Build layers that reflect what the drink actually looks like.
   *
   * Key insight: milk doesn't sit as a white stripe on top of coffee.
   * It blends in and lightens the whole body. We model that by mixing
   * the milk color into the base color. Foam and whipped cream DO sit
   * on top as visually distinct layers.
   */
  static generateVisualProperties(state: DrinkBuilderState): DrinkVisualProperties {
    const layers: DrinkLayer[] = [];

    // ── Gather ingredients ──────────────────────────────────
    const firstSyrup = state.syrups[0];
    const milkPresent = Boolean(state.milk);
    const hasFoamDrink = this.shouldHaveFoam(state);
    const foamPresent = state.isHot || hasFoamDrink;

    const firstTopping = state.toppings[0]?.name;
    const isWhipped = firstTopping === 'Whipped Cream';

    // ── Calculate layer heights ─────────────────────────────
    const syrupHeight = firstSyrup ? 0.06 : 0;
    const foamHeight = foamPresent ? (hasFoamDrink ? 0.12 : 0.06) : 0;
    const whippedHeight = isWhipped ? 0.14 : 0;
    // Milk doesn't get its own layer — it blends into the base
    const othersTotal = syrupHeight + foamHeight + whippedHeight;
    const baseHeight = Math.max(0.25, Math.min(0.7, 0.88 - othersTotal));

    let order = 0;

    // ── 1) Syrup pool at the bottom ─────────────────────────
    if (firstSyrup) {
      const syrupColor = this.getSyrupColor(firstSyrup.name);
      layers.push({
        id: 'syrup-0',
        name: firstSyrup.name,
        color: syrupColor,
        opacity: 0.7,
        height: syrupHeight,
        order: order++,
        animated: true,
        animationType: 'fill',
      });
    }

    // ── 2) Main body (base drink + milk blended together) ───
    if (state.drinkType && state.category) {
      const rawBase = this.getBaseDrinkColor(state);

      // Blend milk into the base to get the actual drink color
      let bodyColor = rawBase;
      if (milkPresent && state.milk) {
        const milkProps = this.getMilkProperties(state.milk.name);
        bodyColor = mixColors(rawBase, milkProps.color, milkProps.blendStrength);
      }

      layers.push({
        id: 'base',
        name: milkPresent ? `${state.drinkType.name} with ${state.milk?.name}` : state.drinkType.name,
        color: bodyColor,
        opacity: 0.92,
        height: baseHeight,
        order: order++,
        animated: true,
        animationType: 'fill',
      });
    }

    // ── 3) Foam cap (distinctly tan/cream — NOT pure white) ─
    if (foamPresent) {
      // Foam is airy and slightly off-white, tinted by the drink below
      const foamTint = state.category === DrinkCategory.COFFEE ? '#F5E6D0' : '#F0EAD6';
      layers.push({
        id: 'foam',
        name: 'Foam',
        color: foamTint,
        opacity: 0.92,
        height: foamHeight,
        order: order++,
        animated: true,
        animationType: 'foam',
      });
    }

    // ── 4) Whipped cream (bright white, distinct from foam) ─
    if (isWhipped) {
      layers.push({
        id: 'whipped',
        name: 'Whipped Cream',
        color: '#FFFFF4',
        opacity: 0.96,
        height: whippedHeight,
        order: order++,
        animated: true,
        animationType: 'foam',
      });
    }

    // Particle toppings (sprinkles, cocoa dust)
    const particleToppings = ['Cinnamon', 'Chocolate Chips', 'Cocoa Powder'];
    const showParticles = firstTopping ? particleToppings.includes(firstTopping) : false;

    return {
      layers,
      hasTopping: showParticles,
      hasFoam: foamPresent,
      temperature: state.isHot === false ? 'cold' : 'hot',
      toppingType: showParticles ? firstTopping : undefined,
    };
  }

  private static getBaseDrinkColor(state: DrinkBuilderState): string {
    if (!state.category || !state.drinkType) return DRINK_COLORS[DrinkCategory.COFFEE].base;

    const drinkName = state.drinkType.name.toLowerCase();

    if (state.category === DrinkCategory.TEA) {
      if (drinkName.includes('green')) return DRINK_COLORS[DrinkCategory.TEA].green;
      if (drinkName.includes('black')) return DRINK_COLORS[DrinkCategory.TEA].dark;
      if (drinkName.includes('chai')) return DRINK_COLORS[DrinkCategory.TEA].dark;
      return DRINK_COLORS[DrinkCategory.TEA].base;
    }

    if (state.category === DrinkCategory.COFFEE) {
      if (drinkName.includes('espresso')) return DRINK_COLORS[DrinkCategory.COFFEE].dark;
      if (drinkName.includes('americano')) return DRINK_COLORS[DrinkCategory.COFFEE].dark;
      // Lattes/cappuccinos start medium — milk blending will lighten further
      if (drinkName.includes('latte') || drinkName.includes('cappuccino') || drinkName.includes('mocha')) {
        return DRINK_COLORS[DrinkCategory.COFFEE].base;
      }
      if (drinkName.includes('macchiato')) return DRINK_COLORS[DrinkCategory.COFFEE].base;
      return DRINK_COLORS[DrinkCategory.COFFEE].base;
    }

    return (DRINK_COLORS as Record<string, Record<string, string>>)[state.category]?.base || DRINK_COLORS[DrinkCategory.COFFEE].base;
  }

  private static getSyrupColor(syrupName: string): string {
    const normalizedName = syrupName.toLowerCase().replace(/\s+/g, '_').replace('_syrup', '');

    if (SYRUP_COLORS[normalizedName]) {
      return SYRUP_COLORS[normalizedName];
    }

    for (const [key, color] of Object.entries(SYRUP_COLORS)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return color;
      }
    }

    return SYRUP_COLORS.default;
  }

  private static getMilkProperties(milkName: string): { color: string; opacity: number; blendStrength: number } {
    return MILK_COLORS[milkName] || MILK_COLORS.default;
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

    if (state.cupSize) {
      parts.push(state.cupSize.charAt(0).toUpperCase() + state.cupSize.slice(1));
    }

    if (state.isHot === false) {
      parts.push('Iced');
    }

    if (state.syrups.length > 0) {
      parts.push(state.syrups[0].name.replace(' Syrup', ''));
    }

    if (state.milk && state.milk.name !== 'Whole Milk') {
      parts.push(state.milk.name.replace(' Milk', ''));
    }

    parts.push(state.drinkType.name);

    return parts.join(' ');
  }
}
