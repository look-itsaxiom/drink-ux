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

// ── Drink-specific layer profiles ────────────────────────────────────
// Each profile defines realistic proportions as the drink would actually
// look in the cup. Heights are fractions of available liquid space.

interface DrinkProfile {
  /** Base/body color */
  baseColor: string;
  /** Height of the main body (0-1) */
  baseHeight: number;
  /** Whether this drink has visible foam */
  hasFoam: boolean;
  /** Foam height (0-1) */
  foamHeight: number;
  /** Foam color */
  foamColor: string;
  /** Whether milk blends into the body vs sitting as a layer */
  milkBlends: boolean;
  /** How much milk lightens the base (higher = more milk visible) */
  milkBlendStrength: number;
}

/**
 * Profiles keyed by lowercase drink name.
 * Proportions reflect what you'd actually see looking at the cup.
 */
const DRINK_PROFILES: Record<string, DrinkProfile> = {
  // ── Coffee drinks ─────────────────────────────────────────
  'latte': {
    baseColor: '#4A3728',       // Dark espresso concentrate
    baseHeight: 0.76,           // Mostly milk-blended body
    hasFoam: true,
    foamHeight: 0.10,           // Thin foam cap
    foamColor: '#F0E0C8',       // Warm cream foam
    milkBlends: true,
    milkBlendStrength: 0.65,    // Heavy milk — latte is very milky
  },
  'cappuccino': {
    baseColor: '#3E2A1A',       // Dark espresso base
    baseHeight: 0.50,           // Less body — more foam
    hasFoam: true,
    foamHeight: 0.28,           // Thick, pillowy foam — signature of cappuccino
    foamColor: '#F5E6D0',       // Coffee-tinted foam
    milkBlends: true,
    milkBlendStrength: 0.45,    // Less milk blend than latte
  },
  'americano': {
    baseColor: '#1C0E04',       // Very dark — espresso + hot water
    baseHeight: 0.86,           // Nearly fills the cup
    hasFoam: false,
    foamHeight: 0.03,           // Thin crema on top
    foamColor: '#C8A882',       // Golden crema
    milkBlends: true,
    milkBlendStrength: 0.30,    // Milk barely lightens the dark body
  },
  'drip coffee': {
    baseColor: '#3B2212',       // Medium-dark roasted brown
    baseHeight: 0.88,           // Fills cup, no foam
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#E0D0B8',
    milkBlends: true,
    milkBlendStrength: 0.40,
  },
  'cold brew': {
    baseColor: '#1A0C03',       // Very dark — concentrated cold-steeped
    baseHeight: 0.88,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#D0C0A8',
    milkBlends: true,
    milkBlendStrength: 0.35,
  },
  'iced coffee': {
    baseColor: '#4A3020',       // Medium brown — diluted with ice
    baseHeight: 0.88,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#D0C0A8',
    milkBlends: true,
    milkBlendStrength: 0.45,
  },
  'espresso': {
    baseColor: '#1A0A02',       // Near-black
    baseHeight: 0.30,           // Only fills bottom third of cup
    hasFoam: true,
    foamHeight: 0.06,           // Thin crema
    foamColor: '#C4946E',       // Golden-brown crema
    milkBlends: false,
    milkBlendStrength: 0.20,
  },
  'mocha': {
    baseColor: '#3E1E0E',       // Chocolate-espresso blend
    baseHeight: 0.72,
    hasFoam: true,
    foamHeight: 0.10,
    foamColor: '#E8D4BE',       // Chocolate-tinged foam
    milkBlends: true,
    milkBlendStrength: 0.50,
  },
  'macchiato': {
    baseColor: '#1E0E04',       // Dark espresso with just a "stain" of milk
    baseHeight: 0.68,
    hasFoam: true,
    foamHeight: 0.16,           // Dollop of foam on top
    foamColor: '#F2E4D0',
    milkBlends: true,
    milkBlendStrength: 0.20,    // Very little milk
  },
  'flat white': {
    baseColor: '#4A3728',       // Similar to latte but denser
    baseHeight: 0.82,           // Less foam than latte
    hasFoam: true,
    foamHeight: 0.05,           // Microfoam — very thin
    foamColor: '#F0E8DC',
    milkBlends: true,
    milkBlendStrength: 0.60,
  },
  'frappe': {
    baseColor: '#5C3D28',       // Blended iced coffee
    baseHeight: 0.82,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#E0D0B8',
    milkBlends: true,
    milkBlendStrength: 0.50,
  },

  // ── Tea drinks ────────────────────────────────────────────
  'green tea': {
    baseColor: '#8DB360',       // Warm leafy green
    baseHeight: 0.86,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#D8E8C0',
    milkBlends: false,
    milkBlendStrength: 0.35,
  },
  'black tea': {
    baseColor: '#A0602C',       // Rich amber
    baseHeight: 0.86,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#E0D0B8',
    milkBlends: true,
    milkBlendStrength: 0.45,
  },
  'herbal tea': {
    baseColor: '#C8944E',       // Light golden amber
    baseHeight: 0.86,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#E8DCC4',
    milkBlends: false,
    milkBlendStrength: 0.30,
  },
  'earl grey': {
    baseColor: '#8B6040',       // Medium amber with bergamot tint
    baseHeight: 0.86,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#E0D0B8',
    milkBlends: true,
    milkBlendStrength: 0.45,
  },
  'chai latte': {
    baseColor: '#6B3E22',       // Spiced dark tea
    baseHeight: 0.74,
    hasFoam: true,
    foamHeight: 0.12,
    foamColor: '#F0E2D0',       // Creamy spiced foam
    milkBlends: true,
    milkBlendStrength: 0.55,
  },
  'matcha latte': {
    baseColor: '#5E8C3A',       // Vivid matcha green
    baseHeight: 0.76,
    hasFoam: true,
    foamHeight: 0.10,
    foamColor: '#E8F0D8',       // Green-tinted foam
    milkBlends: true,
    milkBlendStrength: 0.50,
  },

  // ── Italian sodas ─────────────────────────────────────────
  'italian soda': {
    baseColor: '#4A9ED6',       // Bright fizzy blue
    baseHeight: 0.88,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#FFFFFF',
    milkBlends: false,
    milkBlendStrength: 0,
  },
  'italian cream soda': {
    baseColor: '#6DB8E8',       // Lighter blue base
    baseHeight: 0.70,
    hasFoam: true,
    foamHeight: 0.16,           // Cream cap on top
    foamColor: '#FFF8F0',       // White cream layer
    milkBlends: false,
    milkBlendStrength: 0.30,
  },

  // ── Juices ────────────────────────────────────────────────
  'orange juice': {
    baseColor: '#E8920E',       // Bright pulpy orange
    baseHeight: 0.88,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#F8D898',
    milkBlends: false,
    milkBlendStrength: 0,
  },
  'apple juice': {
    baseColor: '#D4A820',       // Clear golden apple
    baseHeight: 0.88,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#F0E0A0',
    milkBlends: false,
    milkBlendStrength: 0,
  },
  'lemonade': {
    baseColor: '#E8D24A',       // Pale cloudy yellow
    baseHeight: 0.88,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#F8F0C0',
    milkBlends: false,
    milkBlendStrength: 0,
  },

  // ── Blended ───────────────────────────────────────────────
  'smoothie': {
    baseColor: '#D46A8C',       // Berry pink — thick and opaque
    baseHeight: 0.86,
    hasFoam: false,
    foamHeight: 0,
    foamColor: '#F0C0D0',
    milkBlends: true,
    milkBlendStrength: 0.30,
  },

  // ── Specialty ─────────────────────────────────────────────
  'hot chocolate': {
    baseColor: '#3E1A0A',       // Rich dark chocolate
    baseHeight: 0.72,
    hasFoam: true,
    foamHeight: 0.12,           // Marshmallow/foam cap
    foamColor: '#FFF4E8',
    milkBlends: true,
    milkBlendStrength: 0.35,
  },
  'steamer': {
    baseColor: '#F0E4D0',       // Steamed milk — very pale
    baseHeight: 0.82,
    hasFoam: true,
    foamHeight: 0.08,
    foamColor: '#FFF8F0',
    milkBlends: false,
    milkBlendStrength: 0,
  },
};

/** Look up a profile by drink name (case-insensitive, partial match) */
function getDrinkProfile(drinkName: string): DrinkProfile | undefined {
  const lower = drinkName.toLowerCase();
  // Exact match first
  if (DRINK_PROFILES[lower]) return DRINK_PROFILES[lower];
  // Partial match
  for (const [key, profile] of Object.entries(DRINK_PROFILES)) {
    if (lower.includes(key) || key.includes(lower)) return profile;
  }
  return undefined;
}

// ── Base drink colors by category (fallback when no profile matches) ─

export const DRINK_COLORS = {
  [DrinkCategory.COFFEE]: {
    base: '#6F4E37',
    light: '#A0785A',
    dark: '#2C1503',
  },
  [DrinkCategory.TEA]: {
    base: '#C68E4E',
    light: '#DDBF8F',
    dark: '#8B5E3C',
    green: '#7BA05B',
    black: '#5C3317',
  },
  [DrinkCategory.ITALIAN_SODA]: {
    base: '#5DADE2',
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
    base: '#BB8FCE',
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
  'Whole Milk':   { color: '#FFF0D4', opacity: 0.88, blendStrength: 0.60 },
  'Skim Milk':    { color: '#E8E8EC', opacity: 0.75, blendStrength: 0.45 },
  '2% Milk':      { color: '#FFECC8', opacity: 0.82, blendStrength: 0.52 },
  'Almond Milk':  { color: '#E8D0A8', opacity: 0.80, blendStrength: 0.48 },
  'Oat Milk':     { color: '#E0CA90', opacity: 0.85, blendStrength: 0.55 },
  'Soy Milk':     { color: '#F0E0A8', opacity: 0.78, blendStrength: 0.46 },
  'Coconut Milk': { color: '#F8ECDC', opacity: 0.84, blendStrength: 0.52 },
  'Cashew Milk':  { color: '#E8D0AC', opacity: 0.78, blendStrength: 0.44 },
  'Heavy Cream':  { color: '#FFF4D0', opacity: 0.94, blendStrength: 0.70 },
  default:        { color: '#FFECC8', opacity: 0.80, blendStrength: 0.50 },
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
   * Uses drink-specific profiles for realistic proportions — a latte
   * is mostly milk with a thin espresso presence, a cappuccino has
   * thick foam, an espresso only fills a third of the cup, etc.
   *
   * Milk blends into the body color rather than sitting as a stripe.
   * Foam and whipped cream sit on top as distinct visual layers.
   */
  static generateVisualProperties(state: DrinkBuilderState): DrinkVisualProperties {
    const layers: DrinkLayer[] = [];

    // ── Gather ingredients ──────────────────────────────────
    const firstSyrup = state.syrups[0];
    const milkPresent = Boolean(state.milk);
    const firstTopping = state.toppings[0]?.name;
    const isWhipped = firstTopping === 'Whipped Cream';

    // ── Look up drink-specific profile ───────────────────────
    const drinkName = state.drinkType?.name || '';
    const profile = getDrinkProfile(drinkName);

    // ── Calculate layer heights ─────────────────────────────
    const syrupHeight = firstSyrup ? 0.06 : 0;
    const whippedHeight = isWhipped ? 0.14 : 0;

    let foamHeight: number;
    let foamPresent: boolean;
    let foamColor: string;

    if (profile) {
      foamPresent = profile.hasFoam;
      foamHeight = profile.foamHeight;
      foamColor = profile.foamColor;
    } else {
      // Fallback: old behavior
      const hasFoamDrink = this.shouldHaveFoam(state);
      foamPresent = state.isHot !== false || hasFoamDrink;
      foamHeight = foamPresent ? (hasFoamDrink ? 0.12 : 0.06) : 0;
      foamColor = state.category === DrinkCategory.COFFEE ? '#F5E6D0' : '#F0EAD6';
    }

    // Base body height: use profile or calculate remainder
    const othersTotal = syrupHeight + (foamPresent ? foamHeight : 0) + whippedHeight;
    let baseHeight: number;
    if (profile) {
      // Shrink base to make room for syrup/whipped, but respect profile proportions
      baseHeight = Math.max(0.10, profile.baseHeight - syrupHeight - whippedHeight);
    } else {
      baseHeight = Math.max(0.25, Math.min(0.7, 0.88 - othersTotal));
    }

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
      let bodyColor: string;

      if (profile) {
        bodyColor = profile.baseColor;
        // Blend milk into body if applicable
        if (milkPresent && state.milk && profile.milkBlends) {
          const milkProps = this.getMilkProperties(state.milk.name);
          // Use profile's blend strength as multiplier on the milk's own strength
          const effectiveBlend = Math.min(1, milkProps.blendStrength * (profile.milkBlendStrength / 0.50));
          bodyColor = mixColors(bodyColor, milkProps.color, effectiveBlend);
        }
      } else {
        bodyColor = this.getBaseDrinkColor(state);
        if (milkPresent && state.milk) {
          const milkProps = this.getMilkProperties(state.milk.name);
          bodyColor = mixColors(bodyColor, milkProps.color, milkProps.blendStrength);
        }
      }

      layers.push({
        id: 'base',
        name: milkPresent ? `${state.drinkType.name} with ${state.milk?.name}` : state.drinkType.name,
        color: bodyColor,
        opacity: 0.94,
        height: baseHeight,
        order: order++,
        animated: true,
        animationType: 'fill',
      });
    }

    // ── 3) Foam cap ─────────────────────────────────────────
    if (foamPresent && foamHeight > 0) {
      layers.push({
        id: 'foam',
        name: 'Foam',
        color: foamColor,
        opacity: 0.93,
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
