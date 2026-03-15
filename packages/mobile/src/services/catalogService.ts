/**
 * Catalog Service
 * Handles fetching catalog data from the mapped catalog endpoint
 */

import { apiClient } from './api';

/**
 * Variation (size/option) for a menu item
 */
export interface MappedVariation {
  variationId: string;
  name: string;
  price: number;
}

/**
 * Base item from mapped catalog
 */
export interface MappedBase {
  squareItemId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  category: string;
  variations: MappedVariation[];
  temperatures: string[];
  modifierGroupIds: string[];
}

/**
 * Modifier from mapped catalog
 */
export interface MappedModifier {
  squareModifierId: string;
  name: string;
  price: number;
}

/**
 * Dynamic modifier group with selection constraints
 */
export interface MappedModifierGroup {
  id: string;
  name: string;
  selectionMode: 'single' | 'multi';
  minSelections: number;
  maxSelections: number;
  modifiers: MappedModifier[];
}

/**
 * Preset (curated recipe) from the business
 */
export interface MappedPreset {
  id: string;
  name: string;
  baseId: string;            // squareItemId of the underlying item
  baseName: string;
  imageUrl?: string;
  priceCents: number;
  defaultVariationId?: string;
  defaultHot: boolean;
  modifierIds: string[];     // squareModifierIds pre-selected
}

/**
 * Mapped catalog response shape
 */
export interface MappedCatalog {
  bases: MappedBase[];
  modifierGroups: MappedModifierGroup[];
  presets: MappedPreset[];
}

/**
 * Category derived from bases
 */
export interface DerivedCategory {
  id: string;
  name: string;
  items: MappedBase[];
}

/**
 * Fetch mapped catalog for a business
 * Uses GET /api/catalog/:businessId/mapped
 */
export async function getMappedCatalog(businessId: string): Promise<MappedCatalog> {
  return apiClient.get<MappedCatalog>(`/api/catalog/${businessId}/mapped`);
}

/**
 * Group bases by category
 */
export function groupBasesByCategory(bases: MappedBase[]): DerivedCategory[] {
  const categoryMap = new Map<string, MappedBase[]>();

  for (const base of bases) {
    const category = base.category || 'Other';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(base);
  }

  return Array.from(categoryMap.entries()).map(([name, items]) => ({
    id: name.toLowerCase().replace(/\s+/g, '_'),
    name,
    items,
  }));
}

/**
 * Check if a base supports hot temperature
 */
export function supportsHot(temperatures: string[]): boolean {
  return temperatures.includes('hot') || temperatures.includes('HOT');
}

/**
 * Check if a base supports iced temperature
 */
export function supportsIced(temperatures: string[]): boolean {
  return temperatures.includes('iced') || temperatures.includes('ICED');
}

/**
 * Determine if drink should default to hot
 * Returns undefined if both are supported (user must choose)
 */
export function getDefaultIsHot(temperatures: string[]): boolean | undefined {
  const hot = supportsHot(temperatures);
  const iced = supportsIced(temperatures);

  if (hot && !iced) return true;
  if (iced && !hot) return false;
  return undefined; // Both supported, user chooses
}

/**
 * Get the display price for an item.
 * If multiple variations, returns the lowest price ("from $X.XX").
 * If one variation, returns that price.
 * Falls back to base price.
 */
export function getDisplayPrice(base: MappedBase): { price: number; hasMultiple: boolean } {
  if (base.variations.length > 1) {
    const minPrice = Math.min(...base.variations.map(v => v.price));
    return { price: minPrice, hasMultiple: true };
  }
  if (base.variations.length === 1) {
    return { price: base.variations[0].price, hasMultiple: false };
  }
  return { price: base.price, hasMultiple: false };
}

export default {
  getMappedCatalog,
  groupBasesByCategory,
  supportsHot,
  supportsIced,
  getDefaultIsHot,
  getDisplayPrice,
};
