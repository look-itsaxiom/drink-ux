import { PrismaClient, ItemMapping } from '../../generated/prisma';
import { POSAdapter, RawCatalogData, RawPOSItem, RawPOSModifier } from '../adapters/pos/POSAdapter';
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

interface CatalogSize {
  variationId: string;
  name: string;
  price: number;
}

interface CatalogBase {
  squareItemId: string;
  name: string;
  price: number;
  category: string;
  sizes: CatalogSize[];
  temperatures: string[];
}

interface CatalogModifier {
  squareModifierId: string;
  name: string;
  price: number;
}

interface MappedCatalog {
  bases: CatalogBase[];
  modifiers: {
    milks: CatalogModifier[];
    syrups: CatalogModifier[];
    toppings: CatalogModifier[];
  };
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

    // Build bases from items
    const bases: CatalogBase[] = [];
    for (const item of rawCatalog.items) {
      const mapping = mappingsBySquareId.get(item.id);
      if (!mapping || mapping.itemType !== 'BASE') continue;

      bases.push({
        squareItemId: item.id,
        name: mapping.displayName || item.name,
        price: item.price || item.variations?.[0]?.price || 0,
        category: mapping.category || '',
        sizes: (item.variations || []).map(v => ({
          variationId: v.id,
          name: v.name,
          price: v.price,
        })),
        temperatures: mapping.temperatureOptions,
      });
    }

    // Sort bases by displayOrder
    bases.sort((a, b) => {
      const orderA = mappingsBySquareId.get(a.squareItemId)?.displayOrder ?? 0;
      const orderB = mappingsBySquareId.get(b.squareItemId)?.displayOrder ?? 0;
      return orderA - orderB;
    });

    // Build modifiers grouped by category
    const milks: CatalogModifier[] = [];
    const syrups: CatalogModifier[] = [];
    const toppings: CatalogModifier[] = [];

    for (const mod of rawCatalog.modifiers) {
      const mapping = mappingsBySquareId.get(mod.id);
      if (!mapping || mapping.itemType !== 'MODIFIER') continue;

      const catalogMod: CatalogModifier = {
        squareModifierId: mod.id,
        name: mapping.displayName || mod.name,
        price: mod.price || 0,
      };

      switch (mapping.category) {
        case 'milk':
          milks.push(catalogMod);
          break;
        case 'syrup':
          syrups.push(catalogMod);
          break;
        case 'topping':
          toppings.push(catalogMod);
          break;
      }
    }

    return {
      bases,
      modifiers: { milks, syrups, toppings },
    };
  }

}
