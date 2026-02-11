/**
 * Catalog Service
 * Handles fetching catalog data from the mapped catalog endpoint
 */

import { apiClient } from './api';

/**
 * Base drink from mapped catalog
 */
export interface MappedBase {
  squareItemId: string;
  name: string;
  price: number;
  category: string;
  sizes: string[];
  temperatures: string[];
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
 * Grouped modifiers from mapped catalog
 */
export interface MappedModifiers {
  milks: MappedModifier[];
  syrups: MappedModifier[];
  toppings: MappedModifier[];
}

/**
 * Mapped catalog response shape
 */
export interface MappedCatalog {
  bases: MappedBase[];
  modifiers: MappedModifiers;
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
 *
 * @param businessId - The business UUID
 * @returns Mapped catalog data
 * @throws ApiClientError if business not found or other errors
 */
export async function getMappedCatalog(businessId: string): Promise<MappedCatalog> {
  return apiClient.get<MappedCatalog>(`/api/catalog/${businessId}/mapped`);
}

/**
 * Group bases by category
 *
 * @param bases - Array of bases from mapped catalog
 * @returns Array of derived categories with their items
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

export default {
  getMappedCatalog,
  groupBasesByCategory,
  supportsHot,
  supportsIced,
  getDefaultIsHot,
};
