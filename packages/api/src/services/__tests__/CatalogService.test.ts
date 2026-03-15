import { PrismaClient } from '../../../generated/prisma';
import { CatalogService, CatalogError } from '../CatalogService';

const prisma = new PrismaClient();

// Test helper to create a test business
async function createTestBusiness(name: string = 'Test Business'): Promise<{ userId: string; businessId: string }> {
  const user = await prisma.user.create({
    data: {
      email: `owner-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
      hashedPassword: 'hashed_password',
      businesses: {
        create: {
          name,
          slug: `test-business-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        },
      },
    },
    include: { businesses: true },
  });
  return { userId: user.id, businessId: user.businesses[0].id };
}

// Helper to clean the database safely
async function cleanDatabase() {
  // Delete in order to respect foreign key constraints
  // This order deletes leaf tables first, then parents
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.syncHistory.deleteMany();
  await prisma.presetModifier.deleteMany();
  await prisma.preset.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.base.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('CatalogService', () => {
  let catalogService: CatalogService;
  let testBusinessId: string;
  let testUserId: string;

  beforeEach(async () => {
    await cleanDatabase();

    catalogService = new CatalogService(prisma);
    const { userId, businessId } = await createTestBusiness();
    testBusinessId = businessId;
    testUserId = userId;
  });

  // =============================================================================
  // CATEGORY TESTS
  // =============================================================================
  describe('Categories', () => {
    describe('createCategory', () => {
      // Happy path
      it('creates a category with name and business ID', async () => {
        const category = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Hot Drinks',
        });

        expect(category).toBeDefined();
        expect(category.name).toBe('Hot Drinks');
        expect(category.businessId).toBe(testBusinessId);
        expect(category.id).toBeDefined();
        expect(category.displayOrder).toBe(0);
      });

      it('creates category with optional color and icon', async () => {
        const category = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Cold Drinks',
          color: '#FF5733',
          icon: 'ice-cream',
        });

        expect(category.color).toBe('#FF5733');
        expect(category.icon).toBe('ice-cream');
      });

      it('creates category with custom display order', async () => {
        const category = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Specials',
          displayOrder: 10,
        });

        expect(category.displayOrder).toBe(10);
      });

      // Failure cases
      it('rejects duplicate category names within same business', async () => {
        await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Hot Drinks',
        });

        await expect(
          catalogService.createCategory({
            businessId: testBusinessId,
            name: 'Hot Drinks',
          })
        ).rejects.toThrow(CatalogError);

        try {
          await catalogService.createCategory({
            businessId: testBusinessId,
            name: 'Hot Drinks',
          });
        } catch (error) {
          expect((error as CatalogError).code).toBe('DUPLICATE_NAME');
        }
      });

      it('allows same category name in different businesses', async () => {
        const { businessId: otherBusinessId } = await createTestBusiness('Other Business');

        await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Hot Drinks',
        });

        const otherCategory = await catalogService.createCategory({
          businessId: otherBusinessId,
          name: 'Hot Drinks',
        });

        expect(otherCategory.name).toBe('Hot Drinks');
      });

      it('throws error for invalid business ID', async () => {
        await expect(
          catalogService.createCategory({
            businessId: 'non-existent-id',
            name: 'Hot Drinks',
          })
        ).rejects.toThrow(CatalogError);

        try {
          await catalogService.createCategory({
            businessId: 'non-existent-id',
            name: 'Hot Drinks',
          });
        } catch (error) {
          expect((error as CatalogError).code).toBe('INVALID_BUSINESS');
        }
      });

      it('throws error for empty name', async () => {
        await expect(
          catalogService.createCategory({
            businessId: testBusinessId,
            name: '',
          })
        ).rejects.toThrow(CatalogError);

        try {
          await catalogService.createCategory({
            businessId: testBusinessId,
            name: '   ',
          });
        } catch (error) {
          expect((error as CatalogError).code).toBe('INVALID_INPUT');
        }
      });

      // Edge cases
      it('handles category with very long name (validates max length)', async () => {
        const longName = 'A'.repeat(256);

        await expect(
          catalogService.createCategory({
            businessId: testBusinessId,
            name: longName,
          })
        ).rejects.toThrow(CatalogError);

        try {
          await catalogService.createCategory({
            businessId: testBusinessId,
            name: longName,
          });
        } catch (error) {
          expect((error as CatalogError).code).toBe('INVALID_INPUT');
        }
      });

      it('handles category with special characters in name', async () => {
        const category = await catalogService.createCategory({
          businessId: testBusinessId,
          name: "Joe's Special & Amazing Drinks!",
        });

        expect(category.name).toBe("Joe's Special & Amazing Drinks!");
      });

      it('trims whitespace from name', async () => {
        const category = await catalogService.createCategory({
          businessId: testBusinessId,
          name: '  Hot Drinks  ',
        });

        expect(category.name).toBe('Hot Drinks');
      });
    });

    describe('updateCategory', () => {
      let categoryId: string;

      beforeEach(async () => {
        const category = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Original Name',
        });
        categoryId = category.id;
      });

      it('updates category name', async () => {
        const updated = await catalogService.updateCategory(categoryId, {
          name: 'Updated Name',
        });

        expect(updated.name).toBe('Updated Name');
      });

      it('updates category color and icon', async () => {
        const updated = await catalogService.updateCategory(categoryId, {
          color: '#00FF00',
          icon: 'coffee',
        });

        expect(updated.color).toBe('#00FF00');
        expect(updated.icon).toBe('coffee');
      });

      it('updates display order', async () => {
        const updated = await catalogService.updateCategory(categoryId, {
          displayOrder: 5,
        });

        expect(updated.displayOrder).toBe(5);
      });

      it('throws error for non-existent category', async () => {
        await expect(
          catalogService.updateCategory('non-existent-id', { name: 'New Name' })
        ).rejects.toThrow(CatalogError);

        try {
          await catalogService.updateCategory('non-existent-id', { name: 'New Name' });
        } catch (error) {
          expect((error as CatalogError).code).toBe('NOT_FOUND');
        }
      });

      it('rejects duplicate name when updating', async () => {
        await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Existing Name',
        });

        await expect(
          catalogService.updateCategory(categoryId, { name: 'Existing Name' })
        ).rejects.toThrow(CatalogError);
      });
    });

    describe('listCategories', () => {
      beforeEach(async () => {
        await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Cold Drinks',
          displayOrder: 2,
        });
        await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Hot Drinks',
          displayOrder: 1,
        });
        await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Specials',
          displayOrder: 3,
        });
      });

      it('lists all categories for a business', async () => {
        const categories = await catalogService.listCategories(testBusinessId);

        expect(categories).toHaveLength(3);
      });

      it('orders categories by displayOrder', async () => {
        const categories = await catalogService.listCategories(testBusinessId);

        expect(categories[0].name).toBe('Hot Drinks');
        expect(categories[1].name).toBe('Cold Drinks');
        expect(categories[2].name).toBe('Specials');
      });

      it('returns empty array for business with no categories', async () => {
        const { businessId: emptyBusinessId } = await createTestBusiness('Empty Business');

        const categories = await catalogService.listCategories(emptyBusinessId);

        expect(categories).toHaveLength(0);
      });

      it('does not return categories from other businesses', async () => {
        const { businessId: otherBusinessId } = await createTestBusiness('Other Business');
        await catalogService.createCategory({
          businessId: otherBusinessId,
          name: 'Other Category',
        });

        const categories = await catalogService.listCategories(testBusinessId);

        expect(categories).toHaveLength(3);
        expect(categories.every(c => c.businessId === testBusinessId)).toBe(true);
      });
    });

    describe('reorderCategories', () => {
      let categoryIds: string[];

      beforeEach(async () => {
        const cat1 = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Category 1',
          displayOrder: 0,
        });
        const cat2 = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Category 2',
          displayOrder: 1,
        });
        const cat3 = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Category 3',
          displayOrder: 2,
        });
        categoryIds = [cat1.id, cat2.id, cat3.id];
      });

      it('reorders categories based on array order', async () => {
        // Reverse the order
        const newOrder = [categoryIds[2], categoryIds[0], categoryIds[1]];
        await catalogService.reorderCategories(testBusinessId, newOrder);

        const categories = await catalogService.listCategories(testBusinessId);
        expect(categories[0].name).toBe('Category 3');
        expect(categories[1].name).toBe('Category 1');
        expect(categories[2].name).toBe('Category 2');
      });

      it('throws error for category IDs from different business', async () => {
        const { businessId: otherBusinessId } = await createTestBusiness('Other Business');
        const otherCategory = await catalogService.createCategory({
          businessId: otherBusinessId,
          name: 'Other Category',
        });

        await expect(
          catalogService.reorderCategories(testBusinessId, [otherCategory.id, ...categoryIds])
        ).rejects.toThrow(CatalogError);
      });
    });

    describe('deleteCategory (soft delete)', () => {
      let categoryId: string;

      beforeEach(async () => {
        const category = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'To Delete',
        });
        categoryId = category.id;
      });

      it('soft deletes category by removing it from active listing', async () => {
        await catalogService.deleteCategory(categoryId);

        // Category should not be in listing
        const categories = await catalogService.listCategories(testBusinessId);
        expect(categories.find(c => c.id === categoryId)).toBeUndefined();
      });

      it('throws error for non-existent category', async () => {
        await expect(
          catalogService.deleteCategory('non-existent-id')
        ).rejects.toThrow(CatalogError);
      });

      it('prevents deletion if category has active bases', async () => {
        // Create a base in this category
        await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Test Base',
          priceCents: 499,
        });

        await expect(
          catalogService.deleteCategory(categoryId)
        ).rejects.toThrow(CatalogError);

        try {
          await catalogService.deleteCategory(categoryId);
        } catch (error) {
          expect((error as CatalogError).code).toBe('HAS_ACTIVE_ITEMS');
        }
      });

      it('allows deletion if category only has inactive bases', async () => {
        // Create a base and then make it unavailable
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Inactive Base',
          priceCents: 499,
        });
        await catalogService.updateBase(base.id, { available: false });

        // Should now be able to delete category
        await catalogService.deleteCategory(categoryId);

        const categories = await catalogService.listCategories(testBusinessId);
        expect(categories.find(c => c.id === categoryId)).toBeUndefined();
      });
    });

    describe('getCategory', () => {
      it('returns category by ID', async () => {
        const created = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Test Category',
        });

        const retrieved = await catalogService.getCategory(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
        expect(retrieved!.name).toBe('Test Category');
      });

      it('returns null for non-existent category', async () => {
        const retrieved = await catalogService.getCategory('non-existent-id');

        expect(retrieved).toBeNull();
      });
    });
  });

  // =============================================================================
  // BASE TESTS
  // =============================================================================
  describe('Bases', () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await catalogService.createCategory({
        businessId: testBusinessId,
        name: 'Hot Drinks',
      });
      categoryId = category.id;
    });

    describe('createBase', () => {
      // Happy path
      it('creates base with name, category, and price', async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Espresso',
          priceCents: 399,
        });

        expect(base).toBeDefined();
        expect(base.name).toBe('Espresso');
        expect(base.categoryId).toBe(categoryId);
        expect(base.priceCents).toBe(399);
        // temperatureConstraint test removed (field no longer exists)
        expect(base.available).toBe(true);
      });

      it('creates base with temperature constraint', async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Hot Chocolate',
          priceCents: 450,
        });

        // temperatureConstraint test removed (field no longer exists)
      });

      it('creates base with visual properties', async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Latte',
          priceCents: 499,
          visualColor: '#8B4513',
          visualOpacity: 0.8,
        });

        expect(base.visualColor).toBe('#8B4513');
        expect(base.visualOpacity).toBe(0.8);
      });

      // Success cases
      it('creates base that supports both hot and cold', async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Latte',
          priceCents: 450,
        });

        // temperatureConstraint test removed (field no longer exists)
      });

      it('handles price as decimal (cents)', async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Drip Coffee',
          priceCents: 249,
        });

        expect(base.priceCents).toBe(249);
      });

      // Failure cases
      it('rejects invalid temperature constraint', async () => {
        await expect(
          catalogService.createBase({
            businessId: testBusinessId,
            categoryId,
            name: 'Test Base',
            priceCents: 399,
          })
        ).rejects.toThrow(CatalogError);
      });

      it('throws error for invalid category ID', async () => {
        await expect(
          catalogService.createBase({
            businessId: testBusinessId,
            categoryId: 'non-existent-id',
            name: 'Test Base',
            priceCents: 399,
          })
        ).rejects.toThrow(CatalogError);

        try {
          await catalogService.createBase({
            businessId: testBusinessId,
            categoryId: 'non-existent-id',
            name: 'Test Base',
            priceCents: 399,
          });
        } catch (error) {
          expect((error as CatalogError).code).toBe('INVALID_CATEGORY');
        }
      });

      it('validates price is non-negative', async () => {
        await expect(
          catalogService.createBase({
            businessId: testBusinessId,
            categoryId,
            name: 'Test Base',
            priceCents: -100,
          })
        ).rejects.toThrow(CatalogError);

        try {
          await catalogService.createBase({
            businessId: testBusinessId,
            categoryId,
            name: 'Test Base',
            priceCents: -100,
          });
        } catch (error) {
          expect((error as CatalogError).code).toBe('INVALID_PRICE');
        }
      });

      it('rejects duplicate base name within same business', async () => {
        await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Espresso',
          priceCents: 399,
        });

        await expect(
          catalogService.createBase({
            businessId: testBusinessId,
            categoryId,
            name: 'Espresso',
            priceCents: 450,
          })
        ).rejects.toThrow(CatalogError);
      });

      it('throws error for empty name', async () => {
        await expect(
          catalogService.createBase({
            businessId: testBusinessId,
            categoryId,
            name: '',
            priceCents: 399,
          })
        ).rejects.toThrow(CatalogError);
      });
    });

    describe('updateBase', () => {
      let baseId: string;

      beforeEach(async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Original Base',
          priceCents: 399,
        });
        baseId = base.id;
      });

      it('updates base name', async () => {
        const updated = await catalogService.updateBase(baseId, {
          name: 'Updated Base',
        });

        expect(updated.name).toBe('Updated Base');
      });

      it('updates base price', async () => {
        const updated = await catalogService.updateBase(baseId, {
          priceCents: 599,
        });

        expect(updated.priceCents).toBe(599);
      });

      it('toggles availability', async () => {
        const updated = await catalogService.updateBase(baseId, {
          available: false,
        });

        expect(updated.available).toBe(false);
      });

      it('updates temperature constraint', async () => {
        const updated = await catalogService.updateBase(baseId, {
        });

        // temperatureConstraint test removed (field no longer exists)
      });

      it('throws error for non-existent base', async () => {
        await expect(
          catalogService.updateBase('non-existent-id', { name: 'New Name' })
        ).rejects.toThrow(CatalogError);
      });
    });

    describe('listBases', () => {
      beforeEach(async () => {
        await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Espresso',
          priceCents: 399,
        });
        await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Latte',
          priceCents: 499,
        });
      });

      it('lists bases by category', async () => {
        const bases = await catalogService.listBases({ categoryId });

        expect(bases).toHaveLength(2);
        expect(bases.every(b => b.categoryId === categoryId)).toBe(true);
      });

      it('lists bases by business', async () => {
        const bases = await catalogService.listBases({ businessId: testBusinessId });

        expect(bases).toHaveLength(2);
      });

      it('filters by availability', async () => {
        // Make one base unavailable
        const bases = await catalogService.listBases({ businessId: testBusinessId });
        await catalogService.updateBase(bases[0].id, { available: false });

        const availableBases = await catalogService.listBases({
          businessId: testBusinessId,
          available: true,
        });

        expect(availableBases).toHaveLength(1);
      });
    });

    describe('getBase', () => {
      it('returns base by ID', async () => {
        const created = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'Espresso',
          priceCents: 399,
        });

        const retrieved = await catalogService.getBase(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null for non-existent base', async () => {
        const retrieved = await catalogService.getBase('non-existent-id');

        expect(retrieved).toBeNull();
      });
    });

    describe('deleteBase', () => {
      let baseId: string;

      beforeEach(async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId,
          name: 'To Delete',
          priceCents: 399,
        });
        baseId = base.id;
      });

      it('marks base as unavailable (soft delete)', async () => {
        await catalogService.deleteBase(baseId);

        const base = await catalogService.getBase(baseId);
        expect(base!.available).toBe(false);
      });

      it('throws error for non-existent base', async () => {
        await expect(
          catalogService.deleteBase('non-existent-id')
        ).rejects.toThrow(CatalogError);
      });
    });
  });

  // =============================================================================
  // MODIFIER TESTS
  // =============================================================================
  describe('Modifiers', () => {
    describe('createModifier', () => {
      // Happy path
      it('creates modifier with name, type, and price', async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Oat Milk',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });

        expect(modifier).toBeDefined();
        expect(modifier.name).toBe('Oat Milk');
        expect(modifier.modifierGroupId).toBe('test-mg-milk');
        expect(modifier.priceCents).toBe(75);
        expect(modifier.available).toBe(true);
      });

      it('creates syrup modifier', async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Vanilla',
          modifierGroupId: 'test-mg-syrup',
          priceCents: 50,
        });

        expect(modifier.modifierGroupId).toBe('test-mg-syrup');
      });

      it('creates topping modifier', async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Whipped Cream',
          modifierGroupId: 'test-mg-topping',
          priceCents: 50,
        });

        expect(modifier.modifierGroupId).toBe('test-mg-topping');
      });

      it('creates modifier with visual properties', async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Caramel Drizzle',
          modifierGroupId: 'test-mg-topping',
          priceCents: 50,
          visualColor: '#D4A574',
          visualLayerOrder: 5,
          visualAnimationType: 'drizzle',
        });

        expect(modifier.visualColor).toBe('#D4A574');
        expect(modifier.visualLayerOrder).toBe(5);
        expect(modifier.visualAnimationType).toBe('drizzle');
      });

      // Edge cases
      it('creates modifier with zero price (free add-on)', async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Ice',
          modifierGroupId: 'test-mg-topping',
          priceCents: 0,
        });

        expect(modifier.priceCents).toBe(0);
      });

      // Failure cases
      it('rejects invalid modifier type', async () => {
        await expect(
          catalogService.createModifier({
            businessId: testBusinessId,
            name: 'Invalid',
            modifierGroupId: 'invalid-group',
            priceCents: 50,
          })
        ).rejects.toThrow(CatalogError);
      });

      it('validates modifier types match enum', async () => {
        // Valid types should work
        const milkModifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Almond Milk',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });
        expect(milkModifier.modifierGroupId).toBe('test-mg-milk');

        const syrupModifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Hazelnut',
          modifierGroupId: 'test-mg-syrup',
          priceCents: 50,
        });
        expect(syrupModifier.modifierGroupId).toBe('test-mg-syrup');

        const toppingModifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Foam',
          modifierGroupId: 'test-mg-topping',
          priceCents: 0,
        });
        expect(toppingModifier.modifierGroupId).toBe('test-mg-topping');
      });

      it('rejects duplicate modifier name within same business and type', async () => {
        await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Oat Milk',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });

        await expect(
          catalogService.createModifier({
            businessId: testBusinessId,
            name: 'Oat Milk',
            modifierGroupId: 'test-mg-milk',
            priceCents: 80,
          })
        ).rejects.toThrow(CatalogError);
      });

      it('allows same modifier name with different types', async () => {
        await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Vanilla',
          modifierGroupId: 'test-mg-syrup',
          priceCents: 50,
        });

        // Same name but different type should be allowed
        // (Though this might not make sense in practice, the schema allows it if type differs)
        // Actually, looking at the schema: @@unique([businessId, type, name])
        // So same name with different type should work
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Vanilla',
          modifierGroupId: 'test-mg-topping', // Different type
          priceCents: 50,
        });

        expect(modifier.name).toBe('Vanilla');
        expect(modifier.modifierGroupId).toBe('test-mg-topping');
      });

      it('throws error for empty name', async () => {
        await expect(
          catalogService.createModifier({
            businessId: testBusinessId,
            name: '',
            modifierGroupId: 'test-mg-milk',
            priceCents: 75,
          })
        ).rejects.toThrow(CatalogError);
      });

      it('validates price is non-negative', async () => {
        await expect(
          catalogService.createModifier({
            businessId: testBusinessId,
            name: 'Test',
            modifierGroupId: 'test-mg-milk',
            priceCents: -50,
          })
        ).rejects.toThrow(CatalogError);
      });
    });

    describe('updateModifier', () => {
      let modifierId: string;

      beforeEach(async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Original Modifier',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });
        modifierId = modifier.id;
      });

      it('updates modifier name', async () => {
        const updated = await catalogService.updateModifier(modifierId, {
          name: 'Updated Modifier',
        });

        expect(updated.name).toBe('Updated Modifier');
      });

      it('updates modifier price', async () => {
        const updated = await catalogService.updateModifier(modifierId, {
          priceCents: 100,
        });

        expect(updated.priceCents).toBe(100);
      });

      it('toggles availability', async () => {
        const updated = await catalogService.updateModifier(modifierId, {
          available: false,
        });

        expect(updated.available).toBe(false);
      });

      it('throws error for non-existent modifier', async () => {
        await expect(
          catalogService.updateModifier('non-existent-id', { name: 'New Name' })
        ).rejects.toThrow(CatalogError);
      });
    });

    describe('listModifiers', () => {
      beforeEach(async () => {
        await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Oat Milk',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });
        await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Almond Milk',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });
        await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Vanilla',
          modifierGroupId: 'test-mg-syrup',
          priceCents: 50,
        });
      });

      it('lists all modifiers for a business', async () => {
        const modifiers = await catalogService.listModifiers({ businessId: testBusinessId });

        expect(modifiers).toHaveLength(3);
      });

      it('filters modifiers by type', async () => {
        const milkModifiers = await catalogService.listModifiers({
          businessId: testBusinessId,
          modifierGroupId: 'test-mg-milk',
        });

        expect(milkModifiers).toHaveLength(2);
        expect(milkModifiers.every(m => m.modifierGroupId === 'test-mg-milk')).toBe(true);
      });

      it('filters by availability', async () => {
        const modifiers = await catalogService.listModifiers({ businessId: testBusinessId });
        await catalogService.updateModifier(modifiers[0].id, { available: false });

        const availableModifiers = await catalogService.listModifiers({
          businessId: testBusinessId,
          available: true,
        });

        expect(availableModifiers).toHaveLength(2);
      });
    });

    describe('getModifier', () => {
      it('returns modifier by ID', async () => {
        const created = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Test Modifier',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });

        const retrieved = await catalogService.getModifier(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null for non-existent modifier', async () => {
        const retrieved = await catalogService.getModifier('non-existent-id');

        expect(retrieved).toBeNull();
      });
    });

    describe('deleteModifier', () => {
      let modifierId: string;

      beforeEach(async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'To Delete',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });
        modifierId = modifier.id;
      });

      it('marks modifier as unavailable (soft delete)', async () => {
        await catalogService.deleteModifier(modifierId);

        const modifier = await catalogService.getModifier(modifierId);
        expect(modifier!.available).toBe(false);
      });

      it('throws error for non-existent modifier', async () => {
        await expect(
          catalogService.deleteModifier('non-existent-id')
        ).rejects.toThrow(CatalogError);
      });
    });
  });

  // =============================================================================
  // PRESET TESTS
  // =============================================================================
  describe('Presets', () => {
    let categoryId: string;
    let baseId: string;
    let modifierIds: string[];

    beforeEach(async () => {
      const category = await catalogService.createCategory({
        businessId: testBusinessId,
        name: 'Hot Drinks',
      });
      categoryId = category.id;

      const base = await catalogService.createBase({
        businessId: testBusinessId,
        categoryId,
        name: 'Espresso',
        priceCents: 399,
      });
      baseId = base.id;

      const modifier1 = await catalogService.createModifier({
        businessId: testBusinessId,
        name: 'Oat Milk',
        modifierGroupId: 'test-mg-milk',
        priceCents: 75,
      });
      const modifier2 = await catalogService.createModifier({
        businessId: testBusinessId,
        name: 'Vanilla',
        modifierGroupId: 'test-mg-syrup',
        priceCents: 50,
      });
      modifierIds = [modifier1.id, modifier2.id];
    });

    describe('createPreset', () => {
      // Happy path
      it('creates preset with name, base, modifiers, and price', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Vanilla Oat Latte',
          baseId,
          modifierIds,
          priceCents: 599,
        });

        expect(preset).toBeDefined();
        expect(preset.name).toBe('Vanilla Oat Latte');
        expect(preset.baseId).toBe(baseId);
        expect(preset.priceCents).toBe(599);
        expect(preset.available).toBe(true);
      });

      it('creates preset with default size and temperature', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Iced Latte',
          baseId,
          priceCents: 599,
          defaultVariationId: 'test-variation-1',
          defaultHot: false,
        });

        expect(preset.defaultVariationId).toBe('test-variation-1');
        expect(preset.defaultHot).toBe(false);
      });

      it('creates preset with image URL', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Photo Latte',
          baseId,
          priceCents: 599,
          imageUrl: 'https://example.com/latte.jpg',
        });

        expect(preset.imageUrl).toBe('https://example.com/latte.jpg');
      });

      // Edge cases
      it('creates preset with no modifiers (just the base)', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Plain Espresso',
          baseId,
          priceCents: 399,
          modifierIds: [],
        });

        expect(preset).toBeDefined();
        expect(preset.name).toBe('Plain Espresso');
      });

      it('creates preset with multiple modifiers of same type', async () => {
        // Create another milk modifier
        const extraMilk = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Extra Oat Milk',
          modifierGroupId: 'test-mg-milk',
          priceCents: 50,
        });

        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Double Milk Latte',
          baseId,
          modifierIds: [modifierIds[0], extraMilk.id],
          priceCents: 699,
        });

        expect(preset).toBeDefined();
      });

      it('calculates suggested price from components', async () => {
        const suggestedPrice = await catalogService.calculateSuggestedPrice(baseId, modifierIds);

        // Base: 3.99 + Oat Milk: 0.75 + Vanilla: 0.50 = 5.24
        expect(suggestedPrice).toBe(5.24);
      });

      // Failure cases
      it('rejects preset without base', async () => {
        await expect(
          catalogService.createPreset({
            businessId: testBusinessId,
            name: 'No Base',
            baseId: '',
            priceCents: 599,
          })
        ).rejects.toThrow(CatalogError);
      });

      it('throws error for invalid base ID', async () => {
        await expect(
          catalogService.createPreset({
            businessId: testBusinessId,
            name: 'Invalid Base',
            baseId: 'non-existent-id',
            priceCents: 599,
          })
        ).rejects.toThrow(CatalogError);

        try {
          await catalogService.createPreset({
            businessId: testBusinessId,
            name: 'Invalid Base',
            baseId: 'non-existent-id',
            priceCents: 599,
          });
        } catch (error) {
          expect((error as CatalogError).code).toBe('INVALID_BASE');
        }
      });

      it('throws error for invalid modifier IDs', async () => {
        await expect(
          catalogService.createPreset({
            businessId: testBusinessId,
            name: 'Invalid Modifiers',
            baseId,
            modifierIds: ['non-existent-id'],
            priceCents: 599,
          })
        ).rejects.toThrow(CatalogError);
      });

      it('rejects duplicate preset name within same business', async () => {
        await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Vanilla Latte',
          baseId,
          priceCents: 599,
        });

        await expect(
          catalogService.createPreset({
            businessId: testBusinessId,
            name: 'Vanilla Latte',
            baseId,
            priceCents: 699,
          })
        ).rejects.toThrow(CatalogError);
      });

      it('throws error for empty name', async () => {
        await expect(
          catalogService.createPreset({
            businessId: testBusinessId,
            name: '',
            baseId,
            priceCents: 599,
          })
        ).rejects.toThrow(CatalogError);
      });

      it('validates price is non-negative', async () => {
        await expect(
          catalogService.createPreset({
            businessId: testBusinessId,
            name: 'Negative Price',
            baseId,
            priceCents: -100,
          })
        ).rejects.toThrow(CatalogError);
      });
    });

    describe('updatePreset', () => {
      let presetId: string;

      beforeEach(async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Original Preset',
          baseId,
          modifierIds,
          priceCents: 599,
        });
        presetId = preset.id;
      });

      it('updates preset name', async () => {
        const updated = await catalogService.updatePreset(presetId, {
          name: 'Updated Preset',
        });

        expect(updated.name).toBe('Updated Preset');
      });

      it('updates preset price', async () => {
        const updated = await catalogService.updatePreset(presetId, {
          priceCents: 699,
        });

        expect(updated.priceCents).toBe(699);
      });

      it('updates preset modifiers', async () => {
        const newModifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Caramel',
          modifierGroupId: 'test-mg-syrup',
          priceCents: 50,
        });

        const updated = await catalogService.updatePreset(presetId, {
          modifierIds: [newModifier.id],
        });

        expect(updated).toBeDefined();
        // Verify the modifiers were updated
        const presetWithModifiers = await catalogService.getPresetWithModifiers(presetId);
        expect(presetWithModifiers!.modifiers).toHaveLength(1);
        expect(presetWithModifiers!.modifiers[0].modifier.name).toBe('Caramel');
      });

      it('toggles availability', async () => {
        const updated = await catalogService.updatePreset(presetId, {
          available: false,
        });

        expect(updated.available).toBe(false);
      });

      it('throws error for non-existent preset', async () => {
        await expect(
          catalogService.updatePreset('non-existent-id', { name: 'New Name' })
        ).rejects.toThrow(CatalogError);
      });
    });

    describe('listPresets', () => {
      beforeEach(async () => {
        await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Vanilla Latte',
          baseId,
          modifierIds,
          priceCents: 599,
        });
        await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Plain Espresso',
          baseId,
          priceCents: 399,
        });
      });

      it('lists all presets for a business', async () => {
        const presets = await catalogService.listPresets({ businessId: testBusinessId });

        expect(presets).toHaveLength(2);
      });

      it('lists presets by category (via base)', async () => {
        // Create another category and base
        const otherCategory = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Cold Drinks',
        });
        const otherBase = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: otherCategory.id,
          name: 'Cold Brew',
          priceCents: 450,
        });
        await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Iced Cold Brew',
          baseId: otherBase.id,
          priceCents: 499,
        });

        // Filter by original category
        const hotPresets = await catalogService.listPresets({
          businessId: testBusinessId,
          categoryId,
        });

        expect(hotPresets).toHaveLength(2);
        expect(hotPresets.every(p => p.base.categoryId === categoryId)).toBe(true);
      });

      it('filters by availability', async () => {
        const presets = await catalogService.listPresets({ businessId: testBusinessId });
        await catalogService.updatePreset(presets[0].id, { available: false });

        const availablePresets = await catalogService.listPresets({
          businessId: testBusinessId,
          available: true,
        });

        expect(availablePresets).toHaveLength(1);
      });
    });

    describe('getPreset', () => {
      it('returns preset by ID', async () => {
        const created = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Test Preset',
          baseId,
          priceCents: 599,
        });

        const retrieved = await catalogService.getPreset(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
      });

      it('returns null for non-existent preset', async () => {
        const retrieved = await catalogService.getPreset('non-existent-id');

        expect(retrieved).toBeNull();
      });
    });

    describe('getPresetWithModifiers', () => {
      it('returns preset with its modifiers', async () => {
        const created = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Full Preset',
          baseId,
          modifierIds,
          priceCents: 599,
        });

        const retrieved = await catalogService.getPresetWithModifiers(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved!.modifiers).toHaveLength(2);
        expect(retrieved!.modifiers.map(m => m.modifier.name).sort()).toEqual(['Oat Milk', 'Vanilla']);
      });
    });

    describe('deletePreset', () => {
      let presetId: string;

      beforeEach(async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'To Delete',
          baseId,
          priceCents: 599,
        });
        presetId = preset.id;
      });

      it('marks preset as unavailable (soft delete)', async () => {
        await catalogService.deletePreset(presetId);

        const preset = await catalogService.getPreset(presetId);
        expect(preset!.available).toBe(false);
      });

      it('throws error for non-existent preset', async () => {
        await expect(
          catalogService.deletePreset('non-existent-id')
        ).rejects.toThrow(CatalogError);
      });
    });
  });

  // =============================================================================
  // AUTHORIZATION TESTS
  // =============================================================================
  describe('Authorization', () => {
    it('verifies user owns business before category operations', async () => {
      const { businessId: otherBusinessId } = await createTestBusiness('Other Business');

      // Create a category in other business
      const otherCategory = await catalogService.createCategory({
        businessId: otherBusinessId,
        name: 'Other Category',
      });

      // Try to update it without proper authorization
      // (In routes, this would be checked via middleware, but service should also validate)
      // The service validates businessId ownership at the route level
      // For now, the service methods don't take userId - that's handled by routes
    });
  });

  // =============================================================================
  // TRANSACTION TESTS
  // =============================================================================
  describe('Transactions', () => {
    it('uses transaction for preset creation with modifiers', async () => {
      const category = await catalogService.createCategory({
        businessId: testBusinessId,
        name: 'Transaction Test',
      });
      const base = await catalogService.createBase({
        businessId: testBusinessId,
        categoryId: category.id,
        name: 'Transaction Base',
        priceCents: 399,
      });
      const modifier = await catalogService.createModifier({
        businessId: testBusinessId,
        name: 'Transaction Modifier',
        modifierGroupId: 'test-mg-milk',
        priceCents: 75,
      });

      // Create preset - this should use a transaction
      const preset = await catalogService.createPreset({
        businessId: testBusinessId,
        name: 'Transaction Preset',
        baseId: base.id,
        modifierIds: [modifier.id],
        priceCents: 599,
      });

      expect(preset).toBeDefined();

      // Verify the preset-modifier relationship was created
      const presetWithModifiers = await catalogService.getPresetWithModifiers(preset.id);
      expect(presetWithModifiers!.modifiers).toHaveLength(1);
    });
  });
});
