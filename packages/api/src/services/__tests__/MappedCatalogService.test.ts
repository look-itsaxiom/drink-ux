import { PrismaClient } from '../../../generated/prisma';
import { MappedCatalogService, MappedCatalogError } from '../MappedCatalogService';
import { MockPOSAdapter } from '../../adapters/pos/MockPOSAdapter';
import { RawCatalogData } from '../../adapters/pos/POSAdapter';
import { encryptToken } from '../../utils/encryption';

const TEST_ENCRYPTION_KEY = process.env.POS_TOKEN_ENCRYPTION_KEY || 'test-key-must-be-32-chars-long!!';

const prisma = new PrismaClient();

// Test fixtures
const mockSquareCatalog: RawCatalogData = {
  items: [
    {
      id: 'ITEM_LATTE',
      name: 'Latte',
      description: 'Espresso with steamed milk',
      price: 500,
      imageIds: ['IMG_LATTE'],
      modifierListIds: ['MODLIST_MILK', 'MODLIST_SYRUP'],
      modifierListInfo: [
        { modifierListId: 'MODLIST_MILK', minSelectedModifiers: 1, maxSelectedModifiers: 1 },
        { modifierListId: 'MODLIST_SYRUP', minSelectedModifiers: 0, maxSelectedModifiers: 3 },
      ],
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
  images: [
    { id: 'IMG_LATTE', url: 'https://example.com/latte.jpg' },
  ],
  taxes: [],
  modifierLists: [
    {
      id: 'MODLIST_MILK',
      name: 'Milk Options',
      modifiers: [
        { id: 'MOD_OAT', name: 'Oat Milk', price: 75 },
        { id: 'MOD_ALMOND', name: 'Almond Milk', price: 75 },
      ],
    },
    {
      id: 'MODLIST_SYRUP',
      name: 'Syrups',
      modifiers: [
        { id: 'MOD_VANILLA', name: 'Vanilla Syrup', price: 50 },
        { id: 'MOD_CARAMEL', name: 'Caramel Syrup', price: 50 },
      ],
    },
    {
      id: 'MODLIST_TOPPING',
      name: 'Toppings',
      modifiers: [
        { id: 'MOD_WHIP', name: 'Whipped Cream', price: 0 },
      ],
    },
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
        posAccessToken: encryptToken('test-access-token', TEST_ENCRYPTION_KEY),
        posRefreshToken: encryptToken('test-refresh-token', TEST_ENCRYPTION_KEY),
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
      await prisma.itemMapping.createMany({
        data: [
          { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
          { businessId: testBusinessId, squareItemId: 'ITEM_MOCHA', itemType: 'BASE', category: 'espresso' },
        ],
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog).toBeDefined();
      expect(catalog.bases).toHaveLength(2);
      expect(catalog.bases[0]).toMatchObject({
        squareItemId: 'ITEM_LATTE',
        name: 'Latte',
        category: 'espresso',
      });
      expect(catalog.bases[0].variations).toBeDefined();
      expect(catalog.bases[0].variations).toHaveLength(3);
    });

    it('returns dynamic modifier groups from Square modifier lists', async () => {
      // Map items that reference modifier lists
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      // Should have modifier groups from referenced lists (MODLIST_MILK and MODLIST_SYRUP)
      expect(catalog.modifierGroups).toBeDefined();
      expect(catalog.modifierGroups.length).toBeGreaterThanOrEqual(2);

      const milkGroup = catalog.modifierGroups.find(g => g.id === 'MODLIST_MILK');
      expect(milkGroup).toBeDefined();
      expect(milkGroup!.name).toBe('Milk Options');
      expect(milkGroup!.selectionMode).toBe('single');
      expect(milkGroup!.minSelections).toBe(1);
      expect(milkGroup!.maxSelections).toBe(1);
      expect(milkGroup!.modifiers).toHaveLength(2);

      const syrupGroup = catalog.modifierGroups.find(g => g.id === 'MODLIST_SYRUP');
      expect(syrupGroup).toBeDefined();
      expect(syrupGroup!.name).toBe('Syrups');
      expect(syrupGroup!.selectionMode).toBe('multi');
      expect(syrupGroup!.maxSelections).toBe(3);
    });

    it('falls back to ItemMapping categories when no modifier lists exist', async () => {
      // Use catalog without modifier lists
      const catalogNoLists: RawCatalogData = {
        ...mockSquareCatalog,
        modifierLists: [],
        items: mockSquareCatalog.items.map(i => ({ ...i, modifierListIds: undefined, modifierListInfo: undefined })),
      };
      mockPOSAdapter.setCatalogResponse(catalogNoLists);

      await prisma.itemMapping.createMany({
        data: [
          { businessId: testBusinessId, squareItemId: 'MOD_OAT', itemType: 'MODIFIER', category: 'milk' },
          { businessId: testBusinessId, squareItemId: 'MOD_ALMOND', itemType: 'MODIFIER', category: 'milk' },
          { businessId: testBusinessId, squareItemId: 'MOD_VANILLA', itemType: 'MODIFIER', category: 'syrup' },
          { businessId: testBusinessId, squareItemId: 'MOD_WHIP', itemType: 'MODIFIER', category: 'topping' },
        ],
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.modifierGroups).toHaveLength(3);

      const milkGroup = catalog.modifierGroups.find(g => g.id === 'milk');
      expect(milkGroup).toBeDefined();
      expect(milkGroup!.name).toBe('Milk Options');
      expect(milkGroup!.selectionMode).toBe('single');
      expect(milkGroup!.modifiers).toHaveLength(2);

      const syrupGroup = catalog.modifierGroups.find(g => g.id === 'syrup');
      expect(syrupGroup).toBeDefined();
      expect(syrupGroup!.modifiers).toHaveLength(1);
    });

    it('includes image URLs from Square catalog', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases[0].imageUrl).toBe('https://example.com/latte.jpg');
    });

    it('includes description from Square catalog', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases[0].description).toBe('Espresso with steamed milk');
    });

    it('includes modifierGroupIds on bases', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases[0].modifierGroupIds).toEqual(['MODLIST_MILK', 'MODLIST_SYRUP']);
    });

    it('includes price from Square catalog', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_MATCHA', itemType: 'BASE', category: 'tea' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases[0].price).toBe(600);
    });

    it('includes size variations from Square catalog', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases[0].variations).toEqual([
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

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

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

      await mappedCatalogService.getCatalog(testBusinessId);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(1);

      await mappedCatalogService.getCatalog(testBusinessId);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(1);
    });

    it('fetches fresh data if cache is stale', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      await mappedCatalogService.getCatalog(testBusinessId);
      mappedCatalogService.invalidateCache(testBusinessId);

      await mappedCatalogService.getCatalog(testBusinessId);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(2);
    });

    it('caches per business (different businesses have separate caches)', async () => {
      const user2 = await prisma.user.create({
        data: { email: 'test2@example.com', hashedPassword: 'hashed' },
      });
      const business2 = await prisma.business.create({
        data: {
          name: 'Other Shop',
          slug: 'other-shop',
          ownerId: user2.id,
          posProvider: 'SQUARE',
          posAccessToken: encryptToken('test-token-2', TEST_ENCRYPTION_KEY),
          posRefreshToken: encryptToken('test-refresh-2', TEST_ENCRYPTION_KEY),
          posMerchantId: 'merchant-2',
        },
      });

      await prisma.itemMapping.createMany({
        data: [
          { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
          { businessId: business2.id, squareItemId: 'ITEM_MOCHA', itemType: 'BASE', category: 'espresso' },
        ],
      });

      await mappedCatalogService.getCatalog(testBusinessId);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(1);

      await mappedCatalogService.getCatalog(business2.id);
      expect(mockPOSAdapter.getCalls('importCatalog')).toHaveLength(2);
    });
  });

  // ===========================================================================
  // EMPTY MAPPINGS
  // ===========================================================================
  describe('empty mappings', () => {
    it('returns empty arrays when no mappings exist', async () => {
      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases).toEqual([]);
      expect(catalog.modifierGroups).toEqual([]);
    });

    it('returns empty modifier groups when only base mappings exist and no modifier lists referenced', async () => {
      // Use catalog with items that don't reference modifier lists
      const catalogNoListRefs: RawCatalogData = {
        ...mockSquareCatalog,
        items: [
          { id: 'ITEM_MATCHA', name: 'Matcha Latte', price: 600 },
        ],
        modifierLists: [],
      };
      mockPOSAdapter.setCatalogResponse(catalogNoListRefs);

      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_MATCHA', itemType: 'BASE', category: 'tea' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases).toHaveLength(1);
      expect(catalog.modifierGroups).toEqual([]);
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

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases).toHaveLength(1);
      expect(catalog.bases[0].squareItemId).toBe('ITEM_LATTE');
    });

    it('does not include unmapped Square items in catalog', async () => {
      await prisma.itemMapping.create({
        data: { businessId: testBusinessId, squareItemId: 'ITEM_LATTE', itemType: 'BASE', category: 'espresso' },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases).toHaveLength(1);
      expect(catalog.bases[0].squareItemId).toBe('ITEM_LATTE');
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
      const userNoCreds = await prisma.user.create({
        data: { email: 'nocreds@example.com', hashedPassword: 'hashed' },
      });
      const businessNoCreds = await prisma.business.create({
        data: {
          name: 'No Creds Shop',
          slug: 'no-creds-shop',
          ownerId: userNoCreds.id,
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

      const freshCatalog = await mappedCatalogService.getCatalog(testBusinessId);
      expect(freshCatalog.bases).toHaveLength(1);

      mappedCatalogService.invalidateCache(testBusinessId);
      mockPOSAdapter.setError('importCatalog', new Error('Square API unavailable'));

      const staleCatalog = await mappedCatalogService.getCatalog(testBusinessId, { allowStale: true });
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

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases[0].name).toBe('Signature Latte');
    });

    it('falls back to Square name when displayName is not set', async () => {
      await prisma.itemMapping.create({
        data: {
          businessId: testBusinessId,
          squareItemId: 'ITEM_LATTE',
          itemType: 'BASE',
          category: 'espresso',
        },
      });

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

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

      const catalog = await mappedCatalogService.getCatalog(testBusinessId);

      expect(catalog.bases[0].squareItemId).toBe('ITEM_MOCHA');
      expect(catalog.bases[1].squareItemId).toBe('ITEM_LATTE');
      expect(catalog.bases[2].squareItemId).toBe('ITEM_MATCHA');
    });
  });
});
