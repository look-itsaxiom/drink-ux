import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '../../../generated/prisma';
import { createCatalogRouter } from '../catalog';
import { CatalogService } from '../../services/CatalogService';
import { AuthService } from '../../services/AuthService';
import { sessionMiddleware, SESSION_COOKIE_NAME } from '../../middleware/session';

const prisma = new PrismaClient();
let catalogService: CatalogService;
let authService: AuthService;

// Counter for unique emails
let emailCounter = 0;

// Test helper to create authenticated session
async function createAuthenticatedUser(emailPrefix?: string) {
  emailCounter++;
  const uniqueId = `${Date.now()}-${emailCounter}-${Math.random().toString(36).substring(2, 8)}`;
  const email = emailPrefix ? `${emailPrefix}-${uniqueId}@test.com` : `test-${uniqueId}@test.com`;

  const result = await authService.signup({
    email,
    password: 'SecureP@ss1',
    businessName: `Test Business ${uniqueId}`,
  });
  const login = await authService.login({
    email,
    password: 'SecureP@ss1',
  });
  return {
    user: result.user,
    business: result.business,
    sessionToken: login.sessionToken,
  };
}

beforeAll(async () => {
  catalogService = new CatalogService(prisma);
  authService = new AuthService(prisma);
});

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

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('Catalog Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(sessionMiddleware(authService));
    app.use('/api/catalog', createCatalogRouter(catalogService));
  });

  // =============================================================================
  // CATEGORY ROUTES
  // =============================================================================
  describe('Categories', () => {
    describe('POST /api/catalog/categories', () => {
      it('creates a category when authenticated', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();

        const response = await request(app)
          .post('/api/catalog/categories')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: business.id,
            name: 'Hot Drinks',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Hot Drinks');
        expect(response.body.data.businessId).toBe(business.id);
      });

      it('creates a category with optional fields', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();

        const response = await request(app)
          .post('/api/catalog/categories')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: business.id,
            name: 'Cold Drinks',
            color: '#0088FF',
            icon: 'ice',
            displayOrder: 5,
          });

        expect(response.status).toBe(201);
        expect(response.body.data.color).toBe('#0088FF');
        expect(response.body.data.icon).toBe('ice');
        expect(response.body.data.displayOrder).toBe(5);
      });

      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .post('/api/catalog/categories')
          .send({
            businessId: 'some-id',
            name: 'Hot Drinks',
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('returns 403 for unauthorized business access', async () => {
        const { sessionToken } = await createAuthenticatedUser();
        const { business: otherBusiness } = await createAuthenticatedUser('other');

        const response = await request(app)
          .post('/api/catalog/categories')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: otherBusiness.id,
            name: 'Hot Drinks',
          });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FORBIDDEN');
      });

      it('returns 400 for invalid request body', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();

        const response = await request(app)
          .post('/api/catalog/categories')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: business.id,
            name: '', // Invalid empty name
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('returns 400 for duplicate category name', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();

        await request(app)
          .post('/api/catalog/categories')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: business.id,
            name: 'Hot Drinks',
          });

        const response = await request(app)
          .post('/api/catalog/categories')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: business.id,
            name: 'Hot Drinks',
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('DUPLICATE_NAME');
      });
    });

    describe('GET /api/catalog/categories', () => {
      it('lists categories for a business', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();

        // Create some categories
        await catalogService.createCategory({
          businessId: business.id,
          name: 'Hot Drinks',
          displayOrder: 1,
        });
        await catalogService.createCategory({
          businessId: business.id,
          name: 'Cold Drinks',
          displayOrder: 2,
        });

        const response = await request(app)
          .get('/api/catalog/categories')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: business.id });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].name).toBe('Hot Drinks');
        expect(response.body.data[1].name).toBe('Cold Drinks');
      });

      it('returns 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/catalog/categories')
          .query({ businessId: 'some-id' });

        expect(response.status).toBe(401);
      });

      it('returns 403 for unauthorized business access', async () => {
        const { sessionToken } = await createAuthenticatedUser();
        const { business: otherBusiness } = await createAuthenticatedUser('other');

        const response = await request(app)
          .get('/api/catalog/categories')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: otherBusiness.id });

        expect(response.status).toBe(403);
      });

      it('returns empty array for business with no categories', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();

        const response = await request(app)
          .get('/api/catalog/categories')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: business.id });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(0);
      });
    });

    describe('GET /api/catalog/categories/:id', () => {
      it('returns a category by ID', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();
        const category = await catalogService.createCategory({
          businessId: business.id,
          name: 'Hot Drinks',
        });

        const response = await request(app)
          .get(`/api/catalog/categories/${category.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(category.id);
        expect(response.body.data.name).toBe('Hot Drinks');
      });

      it('returns 404 for non-existent category', async () => {
        const { sessionToken } = await createAuthenticatedUser();

        const response = await request(app)
          .get('/api/catalog/categories/non-existent-id')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('NOT_FOUND');
      });

      it('returns 403 for category from another business', async () => {
        const { business: otherBusiness, sessionToken: otherToken } = await createAuthenticatedUser('other');
        const { sessionToken } = await createAuthenticatedUser('main');

        const category = await catalogService.createCategory({
          businessId: otherBusiness.id,
          name: 'Other Category',
        });

        const response = await request(app)
          .get(`/api/catalog/categories/${category.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(403);
      });
    });

    describe('PUT /api/catalog/categories/:id', () => {
      it('updates a category', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();
        const category = await catalogService.createCategory({
          businessId: business.id,
          name: 'Original Name',
        });

        const response = await request(app)
          .put(`/api/catalog/categories/${category.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            name: 'Updated Name',
            color: '#FF0000',
          });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.color).toBe('#FF0000');
      });

      it('returns 404 for non-existent category', async () => {
        const { sessionToken } = await createAuthenticatedUser();

        const response = await request(app)
          .put('/api/catalog/categories/non-existent-id')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ name: 'New Name' });

        expect(response.status).toBe(404);
      });

      it('returns 403 for category from another business', async () => {
        const { business: otherBusiness } = await createAuthenticatedUser('other');
        const { sessionToken } = await createAuthenticatedUser('main');

        const category = await catalogService.createCategory({
          businessId: otherBusiness.id,
          name: 'Other Category',
        });

        const response = await request(app)
          .put(`/api/catalog/categories/${category.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({ name: 'Hacked Name' });

        expect(response.status).toBe(403);
      });
    });

    describe('DELETE /api/catalog/categories/:id', () => {
      it('deletes a category', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();
        const category = await catalogService.createCategory({
          businessId: business.id,
          name: 'To Delete',
        });

        const response = await request(app)
          .delete(`/api/catalog/categories/${category.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify deletion
        const categories = await catalogService.listCategories(business.id);
        expect(categories.find(c => c.id === category.id)).toBeUndefined();
      });

      it('returns 404 for non-existent category', async () => {
        const { sessionToken } = await createAuthenticatedUser();

        const response = await request(app)
          .delete('/api/catalog/categories/non-existent-id')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(404);
      });

      it('returns 400 if category has active items', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();
        const category = await catalogService.createCategory({
          businessId: business.id,
          name: 'Has Items',
        });
        await catalogService.createBase({
          businessId: business.id,
          categoryId: category.id,
          name: 'Active Base',
          priceCents: 399,
        });

        const response = await request(app)
          .delete(`/api/catalog/categories/${category.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('HAS_ACTIVE_ITEMS');
      });
    });

    describe('POST /api/catalog/categories/reorder', () => {
      it('reorders categories', async () => {
        const { business, sessionToken } = await createAuthenticatedUser();

        const cat1 = await catalogService.createCategory({
          businessId: business.id,
          name: 'Category 1',
          displayOrder: 0,
        });
        const cat2 = await catalogService.createCategory({
          businessId: business.id,
          name: 'Category 2',
          displayOrder: 1,
        });
        const cat3 = await catalogService.createCategory({
          businessId: business.id,
          name: 'Category 3',
          displayOrder: 2,
        });

        const response = await request(app)
          .post('/api/catalog/categories/reorder')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: business.id,
            categoryIds: [cat3.id, cat1.id, cat2.id],
          });

        expect(response.status).toBe(200);

        // Verify new order
        const categories = await catalogService.listCategories(business.id);
        expect(categories[0].name).toBe('Category 3');
        expect(categories[1].name).toBe('Category 1');
        expect(categories[2].name).toBe('Category 2');
      });
    });
  });

  // =============================================================================
  // BASE ROUTES
  // =============================================================================
  describe('Bases', () => {
    let testBusinessId: string;
    let testCategoryId: string;
    let sessionToken: string;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser();
      testBusinessId = auth.business.id;
      sessionToken = auth.sessionToken;

      const category = await catalogService.createCategory({
        businessId: testBusinessId,
        name: 'Hot Drinks',
      });
      testCategoryId = category.id;
    });

    describe('POST /api/catalog/bases', () => {
      it('creates a base', async () => {
        const response = await request(app)
          .post('/api/catalog/bases')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            categoryId: testCategoryId,
            name: 'Espresso',
            priceCents: 399,
          });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('Espresso');
        expect(response.body.data.basePrice).toBe(3.99);
      });

      it('creates a base with all optional fields', async () => {
        const response = await request(app)
          .post('/api/catalog/bases')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            categoryId: testCategoryId,
            name: 'Hot Chocolate',
            priceCents: 450,
            visualColor: '#8B4513',
            visualOpacity: 0.9,
          });

        expect(response.status).toBe(201);
        // temperatureConstraint assertion removed (field no longer exists)
        expect(response.body.data.visualColor).toBe('#8B4513');
      });

      it('returns 400 for invalid category ID', async () => {
        const response = await request(app)
          .post('/api/catalog/bases')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            categoryId: 'invalid-id',
            name: 'Test Base',
            priceCents: 399,
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_CATEGORY');
      });

      it('returns 400 for negative price', async () => {
        const response = await request(app)
          .post('/api/catalog/bases')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            categoryId: testCategoryId,
            name: 'Test Base',
            priceCents: -100,
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_PRICE');
      });
    });

    describe('GET /api/catalog/bases', () => {
      it('lists bases by business', async () => {
        await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: testCategoryId,
          name: 'Espresso',
          priceCents: 399,
        });
        await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: testCategoryId,
          name: 'Latte',
          priceCents: 499,
        });

        const response = await request(app)
          .get('/api/catalog/bases')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
      });

      it('filters bases by category', async () => {
        const otherCategory = await catalogService.createCategory({
          businessId: testBusinessId,
          name: 'Cold Drinks',
        });

        await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: testCategoryId,
          name: 'Espresso',
          priceCents: 399,
        });
        await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: otherCategory.id,
          name: 'Cold Brew',
          priceCents: 450,
        });

        const response = await request(app)
          .get('/api/catalog/bases')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId, categoryId: testCategoryId });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Espresso');
      });

      it('filters bases by availability', async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: testCategoryId,
          name: 'Espresso',
          priceCents: 399,
        });
        await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: testCategoryId,
          name: 'Latte',
          priceCents: 499,
        });
        await catalogService.updateBase(base.id, { available: false });

        const response = await request(app)
          .get('/api/catalog/bases')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId, available: 'true' });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Latte');
      });
    });

    describe('GET /api/catalog/bases/:id', () => {
      it('returns a base by ID', async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: testCategoryId,
          name: 'Espresso',
          priceCents: 399,
        });

        const response = await request(app)
          .get(`/api/catalog/bases/${base.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(base.id);
      });

      it('returns 404 for non-existent base', async () => {
        const response = await request(app)
          .get('/api/catalog/bases/non-existent-id')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/catalog/bases/:id', () => {
      it('updates a base', async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: testCategoryId,
          name: 'Original',
          priceCents: 399,
        });

        const response = await request(app)
          .put(`/api/catalog/bases/${base.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            name: 'Updated',
            priceCents: 499,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Updated');
        expect(response.body.data.basePrice).toBe(4.99);
      });
    });

    describe('DELETE /api/catalog/bases/:id', () => {
      it('soft deletes a base', async () => {
        const base = await catalogService.createBase({
          businessId: testBusinessId,
          categoryId: testCategoryId,
          name: 'To Delete',
          priceCents: 399,
        });

        const response = await request(app)
          .delete(`/api/catalog/bases/${base.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);

        // Verify soft delete
        const deleted = await catalogService.getBase(base.id);
        expect(deleted!.available).toBe(false);
      });
    });
  });

  // =============================================================================
  // MODIFIER ROUTES
  // =============================================================================
  describe('Modifiers', () => {
    let testBusinessId: string;
    let sessionToken: string;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser();
      testBusinessId = auth.business.id;
      sessionToken = auth.sessionToken;
    });

    describe('POST /api/catalog/modifiers', () => {
      it('creates a modifier', async () => {
        const response = await request(app)
          .post('/api/catalog/modifiers')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            name: 'Oat Milk',
            modifierGroupId: 'test-mg-milk',
            priceCents: 75,
          });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('Oat Milk');
        expect(response.body.data.modifierGroupId).toBe('test-mg-milk');
        expect(response.body.data.price).toBe(0.75);
      });

      it('creates a modifier with visual properties', async () => {
        const response = await request(app)
          .post('/api/catalog/modifiers')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            name: 'Caramel Drizzle',
            modifierGroupId: 'test-mg-topping',
            priceCents: 50,
            visualColor: '#D4A574',
            visualLayerOrder: 5,
            visualAnimationType: 'drizzle',
          });

        expect(response.status).toBe(201);
        expect(response.body.data.visualColor).toBe('#D4A574');
        expect(response.body.data.visualAnimationType).toBe('drizzle');
      });

      it('allows zero price (free add-ons)', async () => {
        const response = await request(app)
          .post('/api/catalog/modifiers')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            name: 'Ice',
            modifierGroupId: 'test-mg-topping',
            priceCents: 0,
          });

        expect(response.status).toBe(201);
        expect(response.body.data.price).toBe(0);
      });

      it('returns 400 for invalid modifier type', async () => {
        const response = await request(app)
          .post('/api/catalog/modifiers')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            name: 'Invalid',
            type: 'INVALID_TYPE',
            priceCents: 50,
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/catalog/modifiers', () => {
      it('lists modifiers by business', async () => {
        await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Oat Milk',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });
        await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Vanilla',
          modifierGroupId: 'test-mg-syrup',
          priceCents: 50,
        });

        const response = await request(app)
          .get('/api/catalog/modifiers')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
      });

      it('filters modifiers by type', async () => {
        await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Oat Milk',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });
        await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Vanilla',
          modifierGroupId: 'test-mg-syrup',
          priceCents: 50,
        });

        const response = await request(app)
          .get('/api/catalog/modifiers')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId, modifierGroupId: 'test-mg-milk' });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Oat Milk');
      });
    });

    describe('GET /api/catalog/modifiers/:id', () => {
      it('returns a modifier by ID', async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Oat Milk',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });

        const response = await request(app)
          .get(`/api/catalog/modifiers/${modifier.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(modifier.id);
      });
    });

    describe('PUT /api/catalog/modifiers/:id', () => {
      it('updates a modifier', async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'Original',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });

        const response = await request(app)
          .put(`/api/catalog/modifiers/${modifier.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            name: 'Updated',
            priceCents: 100,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Updated');
        expect(response.body.data.price).toBe(1.00);
      });
    });

    describe('DELETE /api/catalog/modifiers/:id', () => {
      it('soft deletes a modifier', async () => {
        const modifier = await catalogService.createModifier({
          businessId: testBusinessId,
          name: 'To Delete',
          modifierGroupId: 'test-mg-milk',
          priceCents: 75,
        });

        const response = await request(app)
          .delete(`/api/catalog/modifiers/${modifier.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);

        // Verify soft delete
        const deleted = await catalogService.getModifier(modifier.id);
        expect(deleted!.available).toBe(false);
      });
    });
  });

  // =============================================================================
  // PRESET ROUTES
  // =============================================================================
  describe('Presets', () => {
    let testBusinessId: string;
    let testCategoryId: string;
    let testBaseId: string;
    let testModifierIds: string[];
    let sessionToken: string;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser();
      testBusinessId = auth.business.id;
      sessionToken = auth.sessionToken;

      const category = await catalogService.createCategory({
        businessId: testBusinessId,
        name: 'Hot Drinks',
      });
      testCategoryId = category.id;

      const base = await catalogService.createBase({
        businessId: testBusinessId,
        categoryId: testCategoryId,
        name: 'Espresso',
        priceCents: 399,
      });
      testBaseId = base.id;

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
      testModifierIds = [modifier1.id, modifier2.id];
    });

    describe('POST /api/catalog/presets', () => {
      it('creates a preset', async () => {
        const response = await request(app)
          .post('/api/catalog/presets')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            name: 'Vanilla Oat Latte',
            baseId: testBaseId,
            modifierIds: testModifierIds,
            priceCents: 599,
          });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('Vanilla Oat Latte');
        expect(response.body.data.price).toBe(5.99);
      });

      it('creates a preset with default settings', async () => {
        const response = await request(app)
          .post('/api/catalog/presets')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            name: 'Iced Latte',
            baseId: testBaseId,
            priceCents: 599,
            defaultVariationId: 'test-variation-1',
            defaultHot: false,
          });

        expect(response.status).toBe(201);
        expect(response.body.data.defaultVariationId).toBe('LARGE');
        expect(response.body.data.defaultHot).toBe(false);
      });

      it('creates a preset without modifiers', async () => {
        const response = await request(app)
          .post('/api/catalog/presets')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            name: 'Plain Espresso',
            baseId: testBaseId,
            priceCents: 399,
            modifierIds: [],
          });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('Plain Espresso');
      });

      it('returns 400 for invalid base ID', async () => {
        const response = await request(app)
          .post('/api/catalog/presets')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            name: 'Invalid',
            baseId: 'invalid-id',
            priceCents: 599,
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_BASE');
      });

      it('returns 400 for invalid modifier IDs', async () => {
        const response = await request(app)
          .post('/api/catalog/presets')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            businessId: testBusinessId,
            name: 'Invalid',
            baseId: testBaseId,
            modifierIds: ['invalid-id'],
            priceCents: 599,
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/catalog/presets', () => {
      it('lists presets by business', async () => {
        await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Vanilla Latte',
          baseId: testBaseId,
          modifierIds: testModifierIds,
          priceCents: 599,
        });
        await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Plain Espresso',
          baseId: testBaseId,
          priceCents: 399,
        });

        const response = await request(app)
          .get('/api/catalog/presets')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
      });

      it('filters presets by availability', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Available',
          baseId: testBaseId,
          priceCents: 599,
        });
        await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Unavailable',
          baseId: testBaseId,
          priceCents: 599,
        });
        await catalogService.updatePreset(preset.id, { available: false });

        const response = await request(app)
          .get('/api/catalog/presets')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ businessId: testBusinessId, available: 'true' });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Unavailable');
      });
    });

    describe('GET /api/catalog/presets/:id', () => {
      it('returns a preset by ID', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Test Preset',
          baseId: testBaseId,
          priceCents: 599,
        });

        const response = await request(app)
          .get(`/api/catalog/presets/${preset.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(preset.id);
      });

      it('includes modifiers when requested', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Full Preset',
          baseId: testBaseId,
          modifierIds: testModifierIds,
          priceCents: 599,
        });

        const response = await request(app)
          .get(`/api/catalog/presets/${preset.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({ includeModifiers: 'true' });

        expect(response.status).toBe(200);
        expect(response.body.data.modifiers).toHaveLength(2);
      });
    });

    describe('PUT /api/catalog/presets/:id', () => {
      it('updates a preset', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Original',
          baseId: testBaseId,
          priceCents: 599,
        });

        const response = await request(app)
          .put(`/api/catalog/presets/${preset.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            name: 'Updated',
            priceCents: 699,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Updated');
        expect(response.body.data.price).toBe(6.99);
      });

      it('updates preset modifiers', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'Original',
          baseId: testBaseId,
          modifierIds: [testModifierIds[0]],
          priceCents: 599,
        });

        const response = await request(app)
          .put(`/api/catalog/presets/${preset.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .send({
            modifierIds: testModifierIds,
          });

        expect(response.status).toBe(200);

        // Verify modifiers were updated
        const updated = await catalogService.getPresetWithModifiers(preset.id);
        expect(updated!.modifiers).toHaveLength(2);
      });
    });

    describe('DELETE /api/catalog/presets/:id', () => {
      it('soft deletes a preset', async () => {
        const preset = await catalogService.createPreset({
          businessId: testBusinessId,
          name: 'To Delete',
          baseId: testBaseId,
          priceCents: 599,
        });

        const response = await request(app)
          .delete(`/api/catalog/presets/${preset.id}`)
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

        expect(response.status).toBe(200);

        // Verify soft delete
        const deleted = await catalogService.getPreset(preset.id);
        expect(deleted!.available).toBe(false);
      });
    });

    describe('GET /api/catalog/presets/suggested-price', () => {
      it('calculates suggested price from components', async () => {
        const response = await request(app)
          .get('/api/catalog/presets/suggested-price')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({
            baseId: testBaseId,
            modifierIds: testModifierIds.join(','),
          });

        expect(response.status).toBe(200);
        // Base: 3.99 + Oat Milk: 0.75 + Vanilla: 0.50 = 5.24
        expect(response.body.data.suggestedPrice).toBe(5.24);
      });

      it('calculates price with base only', async () => {
        const response = await request(app)
          .get('/api/catalog/presets/suggested-price')
          .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
          .query({
            baseId: testBaseId,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.suggestedPrice).toBe(3.99);
      });
    });
  });
});
