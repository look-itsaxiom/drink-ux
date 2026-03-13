/**
 * Catalog Diff Calculation Utilities
 *
 * Compares local catalog state against last-known POS state
 * to determine what needs to be created, updated, or deactivated.
 */

/**
 * Represents a local item (Base or Preset) for diff calculation
 */
export interface LocalItem {
  id: string;
  name: string;
  basePrice?: number; // For Base items
  price?: number; // For Preset items
  posItemId: string | null;
  available: boolean;
  updatedAt: Date;
}

/**
 * Represents a local modifier for diff calculation
 */
export interface LocalModifier {
  id: string;
  name: string;
  type: string; // MILK, SYRUP, TOPPING
  price: number;
  posModifierId: string | null;
  available: boolean;
  updatedAt: Date;
}

/**
 * Represents a change to an item that needs to be synced
 */
export interface DiffItemChange {
  localId: string;
  name: string;
  price: number;
  posItemId: string | null;
  itemType: 'base' | 'preset';
}

/**
 * Represents a change to a modifier that needs to be synced
 */
export interface DiffModifierChange {
  localId: string;
  name: string;
  price: number;
  posModifierId: string | null;
  modifierType: string;
}

/**
 * Result of diffing items
 */
export interface DiffResult<T> {
  created: T[];
  updated: T[];
  deactivated: T[];
}

/**
 * Complete catalog diff result
 */
export interface CatalogDiff {
  items: DiffResult<DiffItemChange>;
  modifiers: DiffResult<DiffModifierChange>;
  totalChanges: number;
  hasChanges: boolean;
}

/**
 * Input for catalog diff calculation
 */
export interface CatalogInput {
  bases: LocalItem[];
  modifiers: LocalModifier[];
  presets: LocalItem[];
}

/**
 * Calculates the diff between local catalog and last-known POS state.
 *
 * Logic:
 * - New: No posItemId/posModifierId (never synced)
 * - Updated: Has posItemId/posModifierId AND updatedAt > lastSyncedAt
 * - Deactivated: Has posItemId/posModifierId AND available=false
 *
 * @param catalog Local catalog data
 * @param lastSyncedAt Timestamp of last successful sync (null if never synced)
 * @returns CatalogDiff with items categorized by change type
 */
export function calculateCatalogDiff(
  catalog: CatalogInput,
  lastSyncedAt?: Date | null
): CatalogDiff {
  const items: DiffResult<DiffItemChange> = {
    created: [],
    updated: [],
    deactivated: [],
  };

  const modifiers: DiffResult<DiffModifierChange> = {
    created: [],
    updated: [],
    deactivated: [],
  };

  // Process bases
  for (const base of catalog.bases) {
    const change = classifyItemChange(base, 'base', lastSyncedAt);
    if (change) {
      items[change.type].push(change.item);
    }
  }

  // Process presets
  for (const preset of catalog.presets) {
    const change = classifyItemChange(preset, 'preset', lastSyncedAt);
    if (change) {
      items[change.type].push(change.item);
    }
  }

  // Process modifiers
  for (const modifier of catalog.modifiers) {
    const change = classifyModifierChange(modifier, lastSyncedAt);
    if (change) {
      modifiers[change.type].push(change.modifier);
    }
  }

  const totalChanges =
    items.created.length +
    items.updated.length +
    items.deactivated.length +
    modifiers.created.length +
    modifiers.updated.length +
    modifiers.deactivated.length;

  return {
    items,
    modifiers,
    totalChanges,
    hasChanges: totalChanges > 0,
  };
}

/**
 * Classifies what type of change an item represents
 */
function classifyItemChange(
  item: LocalItem,
  itemType: 'base' | 'preset',
  lastSyncedAt?: Date | null
): { type: 'created' | 'updated' | 'deactivated'; item: DiffItemChange } | null {
  const price = item.basePrice ?? item.price ?? 0;
  const change: DiffItemChange = {
    localId: item.id,
    name: item.name,
    price,
    posItemId: item.posItemId,
    itemType,
  };

  // Never synced - create new
  if (!item.posItemId) {
    return { type: 'created', item: change };
  }

  // Has posItemId and is deactivated
  if (!item.available) {
    return { type: 'deactivated', item: change };
  }

  // Has posItemId and is active - check if updated
  if (isModifiedSinceSync(item.updatedAt, lastSyncedAt)) {
    return { type: 'updated', item: change };
  }

  // No change needed
  return null;
}

/**
 * Classifies what type of change a modifier represents
 */
function classifyModifierChange(
  modifier: LocalModifier,
  lastSyncedAt?: Date | null
): { type: 'created' | 'updated' | 'deactivated'; modifier: DiffModifierChange } | null {
  const change: DiffModifierChange = {
    localId: modifier.id,
    name: modifier.name,
    price: modifier.price,
    posModifierId: modifier.posModifierId,
    modifierType: modifier.type,
  };

  // Never synced - create new
  if (!modifier.posModifierId) {
    return { type: 'created', modifier: change };
  }

  // Has posModifierId and is deactivated
  if (!modifier.available) {
    return { type: 'deactivated', modifier: change };
  }

  // Has posModifierId and is active - check if updated
  if (isModifiedSinceSync(modifier.updatedAt, lastSyncedAt)) {
    return { type: 'updated', modifier: change };
  }

  // No change needed
  return null;
}

/**
 * Checks if an item was modified after the last sync
 * If no lastSyncedAt is provided, treats all items as modified
 */
function isModifiedSinceSync(updatedAt: Date, lastSyncedAt?: Date | null): boolean {
  // If never synced before, consider everything as modified
  if (!lastSyncedAt) {
    return true;
  }

  return updatedAt > lastSyncedAt;
}
