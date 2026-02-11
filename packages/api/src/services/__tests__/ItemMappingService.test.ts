import { PrismaClient } from '../../../generated/prisma';
import { ItemMappingService, ItemMappingError } from '../ItemMappingService';

const prisma = new PrismaClient();

// Type for Square items passed to getUnmappedItems
interface SquareItem {
  id: string;
  name: string;
}

beforeAll(async () => {
  // Clean database before tests
  await prisma.$transaction([
    prisma.itemMapping.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('ItemMappingService', () => {
  let itemMappingService: ItemMappingService;
  let testBusinessId: string;

  beforeEach(async () => {
    // Clean database before each test
    await prisma.$transaction([
      prisma.itemMapping.deleteMany(),
      prisma.business.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    itemMappingService = new ItemMappingService(prisma);

    // Create a test user and business directly
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
      },
    });

    testBusinessId = business.id;
  });

  // ===========================================================================
  // CREATE MAPPING
  // ===========================================================================
  describe('createMapping', () => {
    it('creates a mapping for a BASE item type', async () => {
      const mapping = await itemMappingService.createMapping(
        testBusinessId,
        'SQUARE_ITEM_123',
        'BASE',
        'espresso'
      );

      expect(mapping).toBeDefined();
      expect(mapping.id).toBeDefined();
      expect(mapping.businessId).toBe(testBusinessId);
      expect(mapping.squareItemId).toBe('SQUARE_ITEM_123');
      expect(mapping.itemType).toBe('BASE');
      expect(mapping.category).toBe('espresso');
    });

    it('creates a mapping for a MODIFIER item type with category', async () => {
      const mapping = await itemMappingService.createMapping(
        testBusinessId,
        'SQUARE_MOD_456',
        'MODIFIER',
        'milk'
      );

      expect(mapping).toBeDefined();
      expect(mapping.itemType).toBe('MODIFIER');
      expect(mapping.category).toBe('milk');
    });

    it('creates a mapping for HIDDEN item type without category', async () => {
      const mapping = await itemMappingService.createMapping(
        testBusinessId,
        'SQUARE_ITEM_789',
        'HIDDEN'
      );

      expect(mapping).toBeDefined();
      expect(mapping.itemType).toBe('HIDDEN');
      expect(mapping.category).toBeNull();
    });

    it('throws error for invalid business ID', async () => {
      await expect(
        itemMappingService.createMapping(
          'non-existent-business',
          'SQUARE_ITEM_123',
          'BASE'
        )
      ).rejects.toThrow(ItemMappingError);

      try {
        await itemMappingService.createMapping(
          'non-existent-business',
          'SQUARE_ITEM_123',
          'BASE'
        );
      } catch (error) {
        expect((error as ItemMappingError).code).toBe('BUSINESS_NOT_FOUND');
      }
    });

    it('throws error when duplicate mapping exists (unique constraint)', async () => {
      // Create first mapping
      await itemMappingService.createMapping(
        testBusinessId,
        'SQUARE_ITEM_123',
        'BASE',
        'espresso'
      );

      // Try to create duplicate
      await expect(
        itemMappingService.createMapping(
          testBusinessId,
          'SQUARE_ITEM_123',
          'MODIFIER',
          'milk'
        )
      ).rejects.toThrow(ItemMappingError);

      try {
        await itemMappingService.createMapping(
          testBusinessId,
          'SQUARE_ITEM_123',
          'MODIFIER',
          'milk'
        );
      } catch (error) {
        expect((error as ItemMappingError).code).toBe('DUPLICATE_MAPPING');
      }
    });

    it('allows same squareItemId for different businesses', async () => {
      // Create another business
      const user2 = await prisma.user.create({
        data: {
          email: 'test2@example.com',
          hashedPassword: 'hashed-test-password',
        },
      });

      const business2 = await prisma.business.create({
        data: {
          name: 'Other Coffee Shop',
          slug: 'other-coffee-shop',
          ownerId: user2.id,
        },
      });

      // Create mapping for first business
      const mapping1 = await itemMappingService.createMapping(
        testBusinessId,
        'SQUARE_ITEM_123',
        'BASE',
        'espresso'
      );

      // Create mapping for second business with same squareItemId
      const mapping2 = await itemMappingService.createMapping(
        business2.id,
        'SQUARE_ITEM_123',
        'BASE',
        'espresso'
      );

      expect(mapping1).toBeDefined();
      expect(mapping2).toBeDefined();
      expect(mapping1.businessId).not.toBe(mapping2.businessId);
    });
  });

  // ===========================================================================
  // GET MAPPINGS
  // ===========================================================================
  describe('getMappings', () => {
    it('returns all mappings for a business', async () => {
      // Create multiple mappings
      await itemMappingService.createMapping(testBusinessId, 'ITEM_1', 'BASE', 'espresso');
      await itemMappingService.createMapping(testBusinessId, 'ITEM_2', 'BASE', 'tea');
      await itemMappingService.createMapping(testBusinessId, 'MOD_1', 'MODIFIER', 'milk');

      const mappings = await itemMappingService.getMappings(testBusinessId);

      expect(mappings).toHaveLength(3);
      const ids = mappings.map((m: { squareItemId: string }) => m.squareItemId);
      expect(ids).toContain('ITEM_1');
      expect(ids).toContain('ITEM_2');
      expect(ids).toContain('MOD_1');
    });

    it('returns empty array when no mappings exist', async () => {
      const mappings = await itemMappingService.getMappings(testBusinessId);

      expect(mappings).toEqual([]);
    });

    it('only returns mappings for the specified business', async () => {
      // Create another business
      const user2 = await prisma.user.create({
        data: {
          email: 'test2@example.com',
          hashedPassword: 'hashed-test-password',
        },
      });

      const business2 = await prisma.business.create({
        data: {
          name: 'Other Coffee Shop',
          slug: 'other-coffee-shop',
          ownerId: user2.id,
        },
      });

      // Create mappings for both businesses
      await itemMappingService.createMapping(testBusinessId, 'ITEM_1', 'BASE');
      await itemMappingService.createMapping(business2.id, 'ITEM_2', 'BASE');

      const mappings = await itemMappingService.getMappings(testBusinessId);

      expect(mappings).toHaveLength(1);
      expect(mappings[0].squareItemId).toBe('ITEM_1');
    });
  });

  // ===========================================================================
  // UPDATE MAPPING
  // ===========================================================================
  describe('updateMapping', () => {
    it('updates item type', async () => {
      const mapping = await itemMappingService.createMapping(
        testBusinessId,
        'ITEM_1',
        'BASE',
        'espresso'
      );

      const updated = await itemMappingService.updateMapping(mapping.id, {
        itemType: 'HIDDEN',
      });

      expect(updated.itemType).toBe('HIDDEN');
      expect(updated.squareItemId).toBe('ITEM_1'); // unchanged
    });

    it('updates category', async () => {
      const mapping = await itemMappingService.createMapping(
        testBusinessId,
        'MOD_1',
        'MODIFIER',
        'milk'
      );

      const updated = await itemMappingService.updateMapping(mapping.id, {
        category: 'syrup',
      });

      expect(updated.category).toBe('syrup');
    });

    it('updates display name', async () => {
      const mapping = await itemMappingService.createMapping(
        testBusinessId,
        'ITEM_1',
        'BASE'
      );

      const updated = await itemMappingService.updateMapping(mapping.id, {
        displayName: 'Fancy Latte',
      });

      expect(updated.displayName).toBe('Fancy Latte');
    });

    it('updates display order', async () => {
      const mapping = await itemMappingService.createMapping(
        testBusinessId,
        'ITEM_1',
        'BASE'
      );

      const updated = await itemMappingService.updateMapping(mapping.id, {
        displayOrder: 5,
      });

      expect(updated.displayOrder).toBe(5);
    });

    it('throws error for non-existent mapping', async () => {
      await expect(
        itemMappingService.updateMapping('non-existent-id', { category: 'tea' })
      ).rejects.toThrow(ItemMappingError);

      try {
        await itemMappingService.updateMapping('non-existent-id', { category: 'tea' });
      } catch (error) {
        expect((error as ItemMappingError).code).toBe('MAPPING_NOT_FOUND');
      }
    });
  });

  // ===========================================================================
  // DELETE MAPPING
  // ===========================================================================
  describe('deleteMapping', () => {
    it('deletes an existing mapping', async () => {
      const mapping = await itemMappingService.createMapping(
        testBusinessId,
        'ITEM_1',
        'BASE'
      );

      await itemMappingService.deleteMapping(mapping.id);

      const mappings = await itemMappingService.getMappings(testBusinessId);
      expect(mappings).toHaveLength(0);
    });

    it('throws error for non-existent mapping', async () => {
      await expect(
        itemMappingService.deleteMapping('non-existent-id')
      ).rejects.toThrow(ItemMappingError);

      try {
        await itemMappingService.deleteMapping('non-existent-id');
      } catch (error) {
        expect((error as ItemMappingError).code).toBe('MAPPING_NOT_FOUND');
      }
    });
  });

  // ===========================================================================
  // GET UNMAPPED ITEMS
  // ===========================================================================
  describe('getUnmappedItems', () => {
    it('returns items that have no mapping', async () => {
      // Create one mapping
      await itemMappingService.createMapping(testBusinessId, 'ITEM_1', 'BASE');

      // Provide a list of Square items
      const squareItems: SquareItem[] = [
        { id: 'ITEM_1', name: 'Latte' },
        { id: 'ITEM_2', name: 'Mocha' },
        { id: 'ITEM_3', name: 'Espresso' },
      ];

      const unmapped = await itemMappingService.getUnmappedItems(
        testBusinessId,
        squareItems
      );

      expect(unmapped).toHaveLength(2);
      const ids = unmapped.map((i: SquareItem) => i.id);
      expect(ids).toContain('ITEM_2');
      expect(ids).toContain('ITEM_3');
      expect(ids).not.toContain('ITEM_1');
    });

    it('returns all items when no mappings exist', async () => {
      const squareItems: SquareItem[] = [
        { id: 'ITEM_1', name: 'Latte' },
        { id: 'ITEM_2', name: 'Mocha' },
      ];

      const unmapped = await itemMappingService.getUnmappedItems(
        testBusinessId,
        squareItems
      );

      expect(unmapped).toHaveLength(2);
    });

    it('returns empty array when all items are mapped', async () => {
      await itemMappingService.createMapping(testBusinessId, 'ITEM_1', 'BASE');
      await itemMappingService.createMapping(testBusinessId, 'ITEM_2', 'BASE');

      const squareItems: SquareItem[] = [
        { id: 'ITEM_1', name: 'Latte' },
        { id: 'ITEM_2', name: 'Mocha' },
      ];

      const unmapped = await itemMappingService.getUnmappedItems(
        testBusinessId,
        squareItems
      );

      expect(unmapped).toHaveLength(0);
    });

    it('returns empty array when squareItems list is empty', async () => {
      const unmapped = await itemMappingService.getUnmappedItems(
        testBusinessId,
        []
      );

      expect(unmapped).toHaveLength(0);
    });
  });
});
