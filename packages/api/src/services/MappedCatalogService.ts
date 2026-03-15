import { PrismaClient, ItemMapping } from '../../generated/prisma';
import { POSAdapter, RawCatalogData, RawPOSItem, RawPOSModifier, RawPOSImage, RawPOSModifierList } from '../adapters/pos/POSAdapter';
import { decryptToken } from '../utils/encryption';

const ENCRYPTION_KEY = process.env.POS_TOKEN_ENCRYPTION_KEY || 'test-key-must-be-32-chars-long!!';

export type MappedCatalogErrorCode = 'BUSINESS_NOT_FOUND' | 'NO_POS_CREDENTIALS' | 'SQUARE_API_ERROR';

export class MappedCatalogError extends Error {
  code: MappedCatalogErrorCode;

  constructor(code: MappedCatalogErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'MappedCatalogError';
  }
}

interface CatalogVariation {
  variationId: string;
  name: string;
  price: number;
}

interface CatalogBase {
  squareItemId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  category: string;
  variations: CatalogVariation[];
  temperatures: string[];
  modifierGroupIds: string[];
}

interface CatalogModifier {
  squareModifierId: string;
  name: string;
  price: number;
}

interface CatalogModifierGroup {
  id: string;
  name: string;
  selectionMode: 'single' | 'multi';
  minSelections: number;
  maxSelections: number;
  modifiers: CatalogModifier[];
}

interface MappedCatalog {
  bases: CatalogBase[];
  modifierGroups: CatalogModifierGroup[];
}

interface CacheEntry {
  catalog: MappedCatalog;
  timestamp: number;
  stale: boolean;
}

interface ServiceOptions {
  cacheTTL?: number; // milliseconds
}

interface GetCatalogOptions {
  allowStale?: boolean;
}

export class MappedCatalogService {
  private prisma: PrismaClient;
  private posAdapter: POSAdapter;
  private cacheTTL: number;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(prisma: PrismaClient, posAdapter: POSAdapter, options?: ServiceOptions) {
    this.prisma = prisma;
    this.posAdapter = posAdapter;
    this.cacheTTL = options?.cacheTTL ?? 5 * 60 * 1000; // 5 minutes default
  }

  async getCatalog(businessId: string, options?: GetCatalogOptions): Promise<MappedCatalog> {
    // Check cache first
    const cached = this.cache.get(businessId);
    if (cached && !cached.stale) {
      const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
      if (!isExpired) {
        return cached.catalog;
      }
    }

    // Validate business exists and has credentials
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new MappedCatalogError('BUSINESS_NOT_FOUND', `Business ${businessId} not found`);
    }

    if (!business.posAccessToken || !business.posRefreshToken) {
      throw new MappedCatalogError('NO_POS_CREDENTIALS', 'Business has no POS credentials');
    }

    // Set credentials on adapter (tokens are stored encrypted)
    this.posAdapter.setCredentials({
      accessToken: decryptToken(business.posAccessToken, ENCRYPTION_KEY),
      refreshToken: business.posRefreshToken ? decryptToken(business.posRefreshToken, ENCRYPTION_KEY) : '',
      merchantId: business.posMerchantId || '',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // placeholder
    });

    // Fetch from Square
    let rawCatalog: RawCatalogData;
    try {
      rawCatalog = await this.posAdapter.importCatalog();
    } catch (error) {
      // If we have stale cache and allowStale is true, return it
      if (cached && options?.allowStale) {
        return cached.catalog;
      }
      throw new MappedCatalogError(
        'SQUARE_API_ERROR',
        `Square API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Get mappings
    const mappings = await this.prisma.itemMapping.findMany({
      where: { businessId },
    });

    // Build catalog
    const catalog = this.buildCatalog(rawCatalog, mappings);

    // Cache result
    this.cache.set(businessId, {
      catalog,
      timestamp: Date.now(),
      stale: false,
    });

    return catalog;
  }

  invalidateCache(businessId: string): void {
    const cached = this.cache.get(businessId);
    if (cached) {
      cached.stale = true;
    }
  }

  private buildCatalog(rawCatalog: RawCatalogData, mappings: ItemMapping[]): MappedCatalog {
    const mappingsBySquareId = new Map(mappings.map(m => [m.squareItemId, m]));

    // Build image lookup: imageId -> url
    const imageMap = new Map<string, string>();
    for (const img of (rawCatalog.images || [])) {
      imageMap.set(img.id, img.url);
    }

    // Build modifier list lookup
    const modifierListMap = new Map<string, RawPOSModifierList>();
    for (const ml of (rawCatalog.modifierLists || [])) {
      modifierListMap.set(ml.id, ml);
    }

    // Track which modifier lists are actually referenced by items
    const referencedModifierListIds = new Set<string>();

    // Build bases from items
    const bases: CatalogBase[] = [];
    for (const item of rawCatalog.items) {
      const mapping = mappingsBySquareId.get(item.id);
      if (!mapping || mapping.itemType !== 'BASE') continue;

      // Resolve image URL from imageIds
      let imageUrl: string | undefined;
      if (item.imageIds && item.imageIds.length > 0) {
        imageUrl = imageMap.get(item.imageIds[0]);
      }

      // Track referenced modifier lists
      const modifierGroupIds: string[] = [];
      if (item.modifierListIds) {
        for (const mlId of item.modifierListIds) {
          referencedModifierListIds.add(mlId);
          modifierGroupIds.push(mlId);
        }
      }

      bases.push({
        squareItemId: item.id,
        name: mapping.displayName || item.name,
        description: item.description,
        imageUrl,
        price: item.price || item.variations?.[0]?.price || 0,
        category: mapping.category || '',
        variations: (item.variations || []).map(v => ({
          variationId: v.id,
          name: v.name,
          price: v.price,
        })),
        temperatures: mapping.temperatureOptions,
        modifierGroupIds,
      });
    }

    // Sort bases by displayOrder
    bases.sort((a, b) => {
      const orderA = mappingsBySquareId.get(a.squareItemId)?.displayOrder ?? 0;
      const orderB = mappingsBySquareId.get(b.squareItemId)?.displayOrder ?? 0;
      return orderA - orderB;
    });

    // Build modifier groups from modifier lists
    const modifierGroups: CatalogModifierGroup[] = [];

    // First: build groups from Square modifier lists that items reference
    for (const mlId of referencedModifierListIds) {
      const ml = modifierListMap.get(mlId);
      if (!ml) continue;

      // Determine selection constraints from item modifierListInfo
      let minSelections = 0;
      let maxSelections = -1; // -1 means unlimited

      // Check all items for constraints on this modifier list
      for (const item of rawCatalog.items) {
        const info = item.modifierListInfo?.find(i => i.modifierListId === mlId);
        if (info) {
          if (info.minSelectedModifiers !== undefined) {
            minSelections = Math.max(minSelections, info.minSelectedModifiers);
          }
          if (info.maxSelectedModifiers !== undefined) {
            if (maxSelections === -1) {
              maxSelections = info.maxSelectedModifiers;
            } else {
              maxSelections = Math.max(maxSelections, info.maxSelectedModifiers);
            }
          }
        }
      }

      if (maxSelections === -1) {
        maxSelections = ml.modifiers.length;
      }

      const selectionMode = maxSelections === 1 ? 'single' : 'multi';

      const modifiers: CatalogModifier[] = ml.modifiers.map(mod => {
        const modMapping = mappingsBySquareId.get(mod.id);
        return {
          squareModifierId: mod.id,
          name: modMapping?.displayName || mod.name,
          price: mod.price || 0,
        };
      });

      modifierGroups.push({
        id: mlId,
        name: ml.name,
        selectionMode,
        minSelections,
        maxSelections,
        modifiers,
      });
    }

    // Fallback: if no modifier lists found, build groups from ItemMapping categories
    if (modifierGroups.length === 0) {
      const groupMap = new Map<string, CatalogModifier[]>();

      for (const mod of rawCatalog.modifiers) {
        const mapping = mappingsBySquareId.get(mod.id);
        if (!mapping || mapping.itemType !== 'MODIFIER') continue;

        const category = mapping.category || 'other';
        if (!groupMap.has(category)) {
          groupMap.set(category, []);
        }

        groupMap.get(category)!.push({
          squareModifierId: mod.id,
          name: mapping.displayName || mod.name,
          price: mod.price || 0,
        });
      }

      for (const [category, modifiers] of groupMap) {
        // Infer selection mode from category name
        const isSingleSelect = ['milk'].includes(category.toLowerCase());
        modifierGroups.push({
          id: category,
          name: formatGroupName(category),
          selectionMode: isSingleSelect ? 'single' : 'multi',
          minSelections: 0,
          maxSelections: isSingleSelect ? 1 : modifiers.length,
          modifiers,
        });
      }
    }

    return {
      bases,
      modifierGroups,
    };
  }

}

/**
 * Format a category slug into a display name
 * e.g. "milk" -> "Milk Options", "syrup" -> "Syrups"
 */
function formatGroupName(category: string): string {
  const name = category.charAt(0).toUpperCase() + category.slice(1);
  // Common pluralizations
  if (name.endsWith('s')) return name;
  if (name.toLowerCase() === 'milk') return 'Milk Options';
  return name + 's';
}
