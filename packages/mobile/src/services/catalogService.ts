/**
 * Catalog Service
 * Handles fetching catalog data (categories, bases, modifiers, presets)
 */

import { TemperatureConstraint, CupSize, ModifierType } from '@drink-ux/shared';
import { apiClient } from './api';

/**
 * Catalog item (base drink) from API
 */
export interface CatalogItem {
  id: string;
  name: string;
  basePrice: number;
  temperatureConstraint: TemperatureConstraint | string;
  visualColor: string | null;
}

/**
 * Category with items from API
 */
export interface CategoryWithItems {
  id: string;
  name: string;
  displayOrder: number;
  color: string | null;
  icon: string | null;
  items: CatalogItem[];
}

/**
 * Basic catalog data from GET /api/business/:slug/catalog
 */
export interface CatalogData {
  businessId: string;
  categories: CategoryWithItems[];
}

/**
 * Modifier data structure
 */
export interface ModifierData {
  id: string;
  name: string;
  type: ModifierType | string;
  price: number;
  available: boolean;
  visualColor?: string | null;
  visualLayerOrder?: number;
  visualAnimationType?: string;
}

/**
 * Preset data structure
 */
export interface PresetData {
  id: string;
  name: string;
  baseId: string;
  defaultSize: CupSize | string;
  defaultHot: boolean;
  price: number;
  available: boolean;
  imageUrl?: string | null;
  modifierIds: string[];
}

/**
 * Full catalog data including modifiers and presets
 */
export interface FullCatalogData extends CatalogData {
  modifiers: ModifierData[];
  presets: PresetData[];
}

/**
 * Fetch basic catalog (categories with bases) for a business
 * Uses the public endpoint GET /api/business/:slug/catalog
 *
 * @param businessSlug - The business slug (subdomain)
 * @returns Catalog data with categories and items
 * @throws ApiClientError if business not found or other errors
 */
export async function getCatalog(businessSlug: string): Promise<CatalogData> {
  return apiClient.get<CatalogData>(`/api/business/${businessSlug}/catalog`);
}

/**
 * Fetch full catalog including modifiers and presets
 * This requires multiple API calls and authentication for some endpoints
 *
 * Note: The current API structure has modifiers and presets under /api/catalog/*
 * which requires authentication. This function will need to be updated
 * when public endpoints are available or authentication is integrated.
 *
 * @param businessSlug - The business slug (subdomain)
 * @returns Full catalog data
 * @throws ApiClientError if any request fails
 */
export async function getFullCatalog(
  businessSlug: string
): Promise<FullCatalogData> {
  // First, get the basic catalog
  const catalog = await getCatalog(businessSlug);

  // For now, modifiers and presets require auth, so we'll make parallel calls
  // In the future, these should be public endpoints or included in the main catalog response
  const [modifiers, presets] = await Promise.all([
    apiClient.get<ModifierData[]>(
      `/api/business/${businessSlug}/catalog/modifiers`
    ),
    apiClient.get<PresetData[]>(
      `/api/business/${businessSlug}/catalog/presets`
    ),
  ]);

  return {
    ...catalog,
    modifiers,
    presets,
  };
}

/**
 * Get items (bases) for a specific category
 *
 * @param catalog - The catalog data
 * @param categoryId - The category ID to filter by
 * @returns Array of catalog items for the category
 */
export function getItemsByCategory(
  catalog: CatalogData,
  categoryId: string
): CatalogItem[] {
  const category = catalog.categories.find((c) => c.id === categoryId);
  return category?.items || [];
}

/**
 * Get modifiers grouped by type
 *
 * @param modifiers - Array of modifiers
 * @returns Object with modifiers grouped by type
 */
export function groupModifiersByType(
  modifiers: ModifierData[]
): Record<string, ModifierData[]> {
  return modifiers.reduce(
    (groups, modifier) => {
      const type = modifier.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(modifier);
      return groups;
    },
    {} as Record<string, ModifierData[]>
  );
}

/**
 * Find a preset by ID
 *
 * @param presets - Array of presets
 * @param presetId - The preset ID to find
 * @returns The preset or undefined
 */
export function findPreset(
  presets: PresetData[],
  presetId: string
): PresetData | undefined {
  return presets.find((p) => p.id === presetId);
}

/**
 * Get available presets (featured drinks)
 *
 * @param presets - Array of presets
 * @returns Array of available presets
 */
export function getAvailablePresets(presets: PresetData[]): PresetData[] {
  return presets.filter((p) => p.available);
}

/**
 * Check if a base supports hot drinks
 *
 * @param temperatureConstraint - The temperature constraint
 * @returns True if hot is supported
 */
export function supportsHot(
  temperatureConstraint: TemperatureConstraint | string
): boolean {
  return (
    temperatureConstraint === TemperatureConstraint.HOT_ONLY ||
    temperatureConstraint === TemperatureConstraint.BOTH ||
    temperatureConstraint === 'HOT_ONLY' ||
    temperatureConstraint === 'BOTH'
  );
}

/**
 * Check if a base supports iced drinks
 *
 * @param temperatureConstraint - The temperature constraint
 * @returns True if iced is supported
 */
export function supportsIced(
  temperatureConstraint: TemperatureConstraint | string
): boolean {
  return (
    temperatureConstraint === TemperatureConstraint.ICED_ONLY ||
    temperatureConstraint === TemperatureConstraint.BOTH ||
    temperatureConstraint === 'ICED_ONLY' ||
    temperatureConstraint === 'BOTH'
  );
}

export default {
  getCatalog,
  getFullCatalog,
  getItemsByCategory,
  groupModifiersByType,
  findPreset,
  getAvailablePresets,
  supportsHot,
  supportsIced,
};
