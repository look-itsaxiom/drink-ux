import { PrismaClient } from '../../../generated/prisma';
import { MappedCatalogService, MappedCatalogError } from '../MappedCatalogService';
import { MockPOSAdapter } from '../../adapters/pos/MockPOSAdapter';
import { RawCatalogData } from '../../adapters/pos/POSAdapter';

const prisma = new PrismaClient();

// Type definitions for catalog response
interface CatalogBase {
  squareItemId: string;
  name: string;
  price: number;
  category: string;
  sizes: Array<{ variationId: string; name: string; price: number }>;
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

// Test fixtures
const mockSquareCatalog: RawCatalogData = {
  items: [
    {
      id: 'ITEM_LATTE',
      name: 'Latte',
      description: 'Espresso with steamed milk',
      price: 500,
      variations: [
        { id: 'VAR_LATTE_SM', name: 'Small', price: 450 },
        { id: 'VAR_LATTE_MD', name: 'Medium', price: 500 },
        { id: 'VAR_LATTE_LG', name: 'Large', price: 550 },
      ],
    },
    {
      id: 'ITEM_MOCHA',
      name: 'Mocha',
      description: 'Espresso with chocolate and milk',
      price: 550,
      variations: [
        { id: 'VAR_MOCHA_SM', name: 'Small', price: 500 },
        { id: 'VAR_MOCHA_MD', name: 'Medium', price: 550 },
      ],
    },
    {
      id: 'ITEM_MATCHA',
      name: 'Matcha Latte',
      description: 'Japanese green tea',
      price: 600,
    },
    {
      id: 'ITEM_TSHIRT',
      name: 'Coffee Shop T-Shirt',
      description: 'Branded merchandise',
      price: 2500,
    },
  ],
  modifiers: [
    { id: 'MOD_OAT', name: 'Oat Milk', price: 75, modifierListId: 'MODLIST_MILK' },
    { id: 'MOD_ALMOND', name: 'Almond Milk', price: 75, modifierListId: 'MODLIST_MILK' },
    { id: 'MOD_VANILLA', name: 'Vanilla Syrup', price: 50, modifierListId: 'MODLIST_SYRUP' },
    { id: 'MOD_CARAMEL', name: 'Caramel Syrup', price: 50, modifierListId: 'MODLIST_SYRUP' },
    { id: 'MOD_WHIP', name: 'Whipped Cream', price: 0, modifierListId: 'MODLIST_TOPPING' },
  ],
  categories: [
    { id: 'CAT_COFFEE', name: 'Coffee', ordinal: 1 },
    { id: 'CAT_TEA', name: 'Tea', ordinal: 2 },
  ],
};

beforeAll(async () => {
  await prisma.$transaction([
    prisma.itemMapping.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('MappedCatalogService', () => {
  let mappedCatalogService: MappedCatalogService;
  let mockPOSAdapter: MockPOSAdapter;
  let testBusinessId: string;

  beforeEach(async () => {
    // Clean database before each test
    await prisma.$transaction([
      prisma.itemMapping.deleteMany(),
      prisma.business.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    // Set up mock POS adapter
    mockPOSAdapter = new MockPOSAdapter();
    mockPOSAdapter.setCatalogResponse(mockSquareCatalog);

    // Create test business with Square credentials
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        hashedPassword: 'hashed-test-password',
      },
    });

    const business = await prisma.business.create({
      data: {
        name: 'Test Coffee Shop',
        slug: 'test-coffee-shop',
        ownerId: user.id,
        posProvider: 'SQUARE',
        posAccessToken: 'test-access-token',
        posRefreshToken: 'test-refresh-token',
        posMerchantId: 'test-merchant-id',
      },
    });

    testBusinessId = business.id;

    // Create service with mock adapter
    mappedCatalogService = new MappedCatalogService(prisma, mockPOSAdapter);
  });

  // ===========================================================================
  // GET CATALOG - Basic Functionality
  // ===========================================================================
  describe('getCatalog', () => {
    it('fetches from Square and returns structured catalog with bases', async () => {
      // Create mappings for base drinks
      await prisma.itemMapping.createMany({
        data: [
          { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
          { businessId: testBusinessId, squareItemId: 'ITEM_MOCHA', itemType: 'BASE', category: 'espresso' },
        ],
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog).toBeDefined();
      expect(catalog.bases).toHaveLength(2);
      expect(catalog.bases[0]).toMatchObject({
        squareItemId: 'ITEM_LATTE',
        name: 'Latte',
        category: 'espresso',
      });
      expect(catalog.bases[0].sizes).toBeDefined();
      expect(catalog.bases[0].sizes).toHaveLength(3);
    });

    it('returns structured modifiers grouped by type (milks, syrups, toppings)', async () => {
      // Create mappings for modifiers
      await prisma.itemMapping.createMany({
        data: [
          { businessId: testBusinessId, squareItemId: 'MOD_OAT', itemType: 'MODIFIER', category: 'milk' },
          { businessId: testBusinessId, squareItemId: 'MOD_ALMOND', itemType: 'MODIFIER', category: 'milk' },
          { businessId: testBusinessId, squareItemId: 'MOD_VANILLA', itemType: 'MODIFIER', category: 'syrup' },
          { businessId: testBusinessId, squareItemId: 'MOD_WHIP', itemType: 'MODIFIER', category: 'topping' },
        ],
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.modifiers).toBeDefined();
      expect(catalog.modifiers.milks).toHaveLength(2);
      expect(catalog.modifiers.syrups).toHaveLength(1);
      expect(catalog.modifiers.toppings).toHaveLength(1);

      expect(catalog.modifiers.milks[0]).toMatchObject({
        squareModifierId: 'MOD_OAT',
        name: 'Oat Milk',
        price: 75,
      });
    });

    it('includes price from Square catalog', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_MATCHA', itemType: 'BASE', category: 'tea' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases[0].price).toBe(600);
    });

    it('includes size variations from Square catalog', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases[0].sizes).toEqual([
        { variationId: 'VAR_LATTE_SM', name: 'Small', price: 450 },
        { variationId: 'VAR_LATTE_MD', name: 'Medium', price: 500 },
        { variationId: 'VAR_LATTE_LG', name: 'Large', price: 550 },
      ]);
    });

    it('includes temperature options from mapping', async () => {
      await prisma.itemMapping.create({
        data: {
          businessId: testBusinessId,
          squareItemId: 'ITEM_LATTE',
          itemType: 'BASE',
          category: 'espresso',
          temperatureOptions: ['HOT', 'ICED'],
        },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases[0].temperatures).toEqual(['HOT', 'ICED']);
    });
  });

  // ===========================================================================
  // CACHING
  // ===========================================================================
  describe('caching', () => {
    it('returns cached data if fresh (does not call Square API)', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      // First call - should hit Square
      await mappedCatalogService.getCatalog(testBusinessId);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(1);

      // Second call - should use cache
      await mappedCatalogService.getCatalog(testBusinessId);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(1); // Still 1
    });

    it('fetches fresh data if cache is stale', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      // First call
      await mappedCatalogService.getCatalog(testBusinessId);

      // Force cache to be stale (simulate time passing)
      mappedCatalogService.invalidateCache(testBusinessId);

      // Second call - should hit Square again
      await mappedCatalogService.getCatalog(testBusinessId);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(2);
    });

    it('caches per business (different businesses have separate caches)', async () => {
      // Create second business
      const user2 = await prisma.user.create({
        data: { email: 'test2@example.com', hashedPassword: 'hashed' },
      });
      const business2 = await prisma.business.create({
        data: {
          name: 'Other Shop',
          slug: 'other-shop',
          ownerId: user2.id,
          posProvider: 'SQUARE',
          posAccessToken: 'test-token-2',
          posRefreshToken: 'test-refresh-2',
          posMerchantId: 'merchant-2',
        },
      });

      await prisma.itemMapping.createMany({
        data: [
          { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
          { businessId: business2.id, squareItemId: 'ITEM_MOCHA', itemType: 'BASE', category: 'espresso' },
        ],
      });

      // Fetch for first business
      await mappedCatalogService.getCatalog(testBusinessId);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(1);

      // Fetch for second business - should call Square again (different cache)
      await mappedCatalogService.getCatalog(business2.id);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(2);
    });
  });

  // ===========================================================================
  // EMPTY MAPPINGS
  // ===========================================================================
  describe('empty mappings', () => {
    it('returns empty arrays when no mappings exist', async () => {
      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases).toEqual([]);
      expect(catalog.modifiers.milks).toEqual([]);
      expect(catalog.modifiers.syrups).toEqual([]);
      expect(catalog.modifiers.toppings).toEqual([]);
    });

    it('returns empty modifiers when only base mappings exist', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases).toHaveLength(1);
      expect(catalog.modifiers.milks).toEqual([]);
      expect(catalog.modifiers.syrups).toEqual([]);
      expect(catalog.modifiers.toppings).toEqual([]);
    });
  });

  // ===========================================================================
  // HIDDEN ITEMS FILTERING
  // ===========================================================================
  describe('hidden items filtering', () => {
    it('filters out items marked as HIDDEN', async () => {
      await prisma.itemMapping.createMany({
        data: [
          { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
          { businessId: testBusinessId, squareItemId: 'ITEM_TSHIRT', itemType: 'HIDDEN' },
        ],
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases).toHaveLength(1);
      expect(catalog.bases[0].squareItemId).toBe('ITEM_LATTE');
      // T-shirt should not appear anywhere
      const allItemIds = [
        ...catalog.bases.map((b: CatalogBase) => b.squareItemId),
        ...catalog.modifiers.milks.map((m: CatalogModifier) => m.squareModifierId),
        ...catalog.modifiers.syrups.map((m: CatalogModifier) => m.squareModifierId),
        ...catalog.modifiers.toppings.map((m: CatalogModifier) => m.squareModifierId),
      ];
      expect(allItemIds).not.toContain('ITEM_TSHIRT');
    });

    it('does not include unmapped Square items in catalog', async () => {
      // Only map one item - others should not appear
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases).toHaveLength(1);
      expect(catalog.bases[0].squareItemId).toBe('ITEM_LATTE');
      // ITEM_MOCHA, ITEM_MATCHA, ITEM_TSHIRT should not appear
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================
  describe('error handling', () => {
    it('throws error for non-existent business', async () => {
      await expect(
        mappedCatalogService.getCatalog('non-existent-business')
      ).rejects.toThrow(MappedCatalogError);

      try {
        await mappedCatalogService.getCatalog('non-existent-business');
      } catch (error) {
        expect((error as MappedCatalogError).code).toBe('BUSINESS_NOT_FOUND');
      }
    });

    it('throws error when business has no POS credentials', async () => {
      // Create business without POS credentials
      const userNoCreds = await prisma.user.create({
        data: { email: 'nocreds@example.com', hashedPassword: 'hashed' },
      });
      const businessNoCreds = await prisma.business.create({
        data: {
          name: 'No Creds Shop',
          slug: 'no-creds-shop',
          ownerId: userNoCreds.id,
          // No POS credentials
        },
      });

      await expect(
        mappedCatalogService.getCatalog(businessNoCreds.id)
      ).rejects.toThrow(MappedCatalogError);

      try {
        await mappedCatalogService.getCatalog(businessNoCreds.id);
      } catch (error) {
        expect((error as MappedCatalogError).code).toBe('NO_POS_CREDENTIALS');
      }
    });

    it('handles Square API errors gracefully', async () => {
      mockPOSAdapter.setError('importCatalog', new Error('Square API unavailable'));

      await expect(
        mappedCatalogService.getCatalog(testBusinessId)
      ).rejects.toThrow(MappedCatalogError);

      try {
        await mappedCatalogService.getCatalog(testBusinessId);
      } catch (error) {
        expect((error as MappedCatalogError).code).toBe('SQUARE_API_ERROR');
        expect((error as MappedCatalogError).message).toContain('Square API');
      }
    });

    it('returns stale cache when Square API fails (graceful degradation)', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      // First call succeeds - populates cache
      const freshCatalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;
      expect(freshCatalog.bases).toHaveLength(1);

      // Invalidate cache (make it stale)
      mappedCatalogService.invalidateCache(testBusinessId);

      // Set Square to fail
      mockPOSAdapter.setError('importCatalog', new Error('Square API unavailable'));

      // Should return stale cache rather than throwing (graceful degradation)
      const staleCatalog = await mappedCatalogService.getCatalog(testBusinessId, { allowStale: true }) as MappedCatalog;
      expect(staleCatalog.bases).toHaveLength(1);
      expect(staleCatalog.bases[0].squareItemId).toBe('ITEM_LATTE');
    });
  });

  // ===========================================================================
  // DISPLAY NAME OVERRIDES
  // ===========================================================================
  describe('display name overrides', () => {
    it('uses displayName from mapping when provided', async () => {
      await prisma.itemMapping.create({
        data: {
          businessId: testBusinessId,
          squareItemId: 'ITEM_LATTE',
          itemType: 'BASE',
          category: 'espresso',
          displayName: 'Signature Latte',
        },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases[0].name).toBe('Signature Latte');
    });

    it('falls back to Square name when displayName is not set', async () => {
      await prisma.itemMapping.create({
        data: {
          businessId: testBusinessId,
          squareItemId: 'ITEM_LATTE',
          itemType: 'BASE',
          category: 'espresso',
          // No displayName
        },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases[0].name).toBe('Latte');
    });
  });

  // ===========================================================================
  // DISPLAY ORDER
  // ===========================================================================
  describe('display order', () => {
    it('orders bases by displayOrder from mapping', async () => {
      await prisma.itemMapping.createMany({
        data: [
          { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso', displayOrder: 2 },
          { businessId: testBusinessId, squareItemId: 'ITEM_MOCHA', itemType: 'BASE', category: 'espresso', displayOrder: 1 },
          { businessId: testBusinessId, squareItemId: 'ITEM_MATCHA', itemType: 'BASE', category: 'tea', displayOrder: 3 },
        ],
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId) as MappedCatalog;

      expect(catalog.bases[0].squareItemId).toBe('ITEM_MOCHA'); // displayOrder: 1
      expect(catalog.bases[1].squareItemId).toBe('ITEM_LATTE'); // displayOrder: 2
      expect(catalog.bases[2].squareItemId).toBe('ITEM_MATCHA'); // displayOrder: 3
    });
  });
});
