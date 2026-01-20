/**
 * Tests for business routes
 * TDD: Write tests BEFORE implementation
 */

import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient, AccountState, Prisma } from '../../../generated/prisma';
import { createBusinessRouter, BusinessRouterOptions } from '../business';

const prisma = new PrismaClient();

// Test data
let testUserId: string;
let testBusinessId: string;

beforeAll(async () => {
  // Clean database
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'business-test@example.com',
      passwordHash: 'not-used-in-this-test',
    },
  });
  testUserId = user.id;

  // Create test business with full setup
  const business = await prisma.business.create({
    data: {
      name: "Joe's Coffee Shop",
      slug: 'joes-coffee',
      ownerId: testUserId,
      accountState: 'ACTIVE',
      theme: {
        primaryColor: '#4A90A4',
        secondaryColor: '#F5E6D3',
        logoUrl: 'https://example.com/logo.png',
        fontFamily: 'Inter',
      },
    },
  });
  testBusinessId = business.id;

  // Create categories
  await prisma.category.createMany({
    data: [
      { businessId: testBusinessId, name: 'Coffee', displayOrder: 1, color: '#8B4513' },
      { businessId: testBusinessId, name: 'Tea', displayOrder: 2, color: '#228B22' },
      { businessId: testBusinessId, name: 'Smoothies', displayOrder: 3, color: '#FF6347' },
    ],
  });

  // Get a category for bases
  const coffeeCategory = await prisma.category.findFirst({
    where: { businessId: testBusinessId, name: 'Coffee' },
  });

  // Create some bases (menu items)
  if (coffeeCategory) {
    await prisma.base.createMany({
      data: [
        {
          businessId: testBusinessId,
          categoryId: coffeeCategory.id,
          name: 'Espresso',
          basePrice: 3.5,
          available: true,
        },
        {
          businessId: testBusinessId,
          categoryId: coffeeCategory.id,
          name: 'Latte',
          basePrice: 4.5,
          available: true,
        },
        {
          businessId: testBusinessId,
          categoryId: coffeeCategory.id,
          name: 'Cappuccino',
          basePrice: 4.0,
          available: true,
        },
      ],
    });
  }
});

afterAll(async () => {
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await prisma.$disconnect();
});

describe('GET /api/business/:slug', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/business', createBusinessRouter(prisma));
  });

  // Happy path tests
  describe('happy path - returns business config', () => {
    it('returns business config for valid slug', async () => {
      const response = await request(app).get('/api/business/joes-coffee');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testBusinessId);
      expect(response.body.data.name).toBe("Joe's Coffee Shop");
      expect(response.body.data.slug).toBe('joes-coffee');
    });

    it('returns theme configuration', async () => {
      const response = await request(app).get('/api/business/joes-coffee');

      expect(response.body.data.theme).toBeDefined();
      expect(response.body.data.theme.primaryColor).toBe('#4A90A4');
      expect(response.body.data.theme.secondaryColor).toBe('#F5E6D3');
      expect(response.body.data.theme.logoUrl).toBe('https://example.com/logo.png');
    });

    it('returns catalog summary with category count', async () => {
      const response = await request(app).get('/api/business/joes-coffee');

      expect(response.body.data.catalogSummary).toBeDefined();
      expect(response.body.data.catalogSummary.categoryCount).toBe(3);
    });

    it('returns catalog summary with item count', async () => {
      const response = await request(app).get('/api/business/joes-coffee');

      expect(response.body.data.catalogSummary.itemCount).toBe(3);
    });
  });

  // Success cases - different account states
  describe('success cases - accessible account states', () => {
    it('returns config for ACTIVE business', async () => {
      const response = await request(app).get('/api/business/joes-coffee');

      expect(response.status).toBe(200);
      expect(response.body.data.accountState).toBe('ACTIVE');
    });

    it('returns config for SETUP_COMPLETE business', async () => {
      await prisma.business.create({
        data: {
          name: 'Setup Cafe',
          slug: 'setup-cafe',
          ownerId: testUserId,
          accountState: 'SETUP_COMPLETE',
        },
      });

      const response = await request(app).get('/api/business/setup-cafe');

      expect(response.status).toBe(200);
      expect(response.body.data.accountState).toBe('SETUP_COMPLETE');
    });

    it('returns config for ONBOARDING business', async () => {
      await prisma.business.create({
        data: {
          name: 'Onboarding Cafe',
          slug: 'onboarding-cafe',
          ownerId: testUserId,
          accountState: 'ONBOARDING',
        },
      });

      const response = await request(app).get('/api/business/onboarding-cafe');

      expect(response.status).toBe(200);
      expect(response.body.data.accountState).toBe('ONBOARDING');
    });
  });

  // Failure cases
  describe('failure cases - non-existent or inactive business', () => {
    it('returns 404 for non-existent slug', async () => {
      const response = await request(app).get('/api/business/non-existent-cafe');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BUSINESS_NOT_FOUND');
    });

    it('returns 404 for PAUSED business', async () => {
      await prisma.business.create({
        data: {
          name: 'Paused Cafe',
          slug: 'paused-cafe',
          ownerId: testUserId,
          accountState: 'PAUSED',
        },
      });

      const response = await request(app).get('/api/business/paused-cafe');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BUSINESS_NOT_FOUND');
    });

    it('returns 404 for EJECTED business', async () => {
      await prisma.business.create({
        data: {
          name: 'Ejected Cafe',
          slug: 'ejected-cafe',
          ownerId: testUserId,
          accountState: 'EJECTED',
        },
      });

      const response = await request(app).get('/api/business/ejected-cafe');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BUSINESS_NOT_FOUND');
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles case-insensitive slug lookup', async () => {
      const response = await request(app).get('/api/business/JOES-COFFEE');

      // Express router is case-sensitive by default, but we should handle it
      // The slug itself should be normalized by the database
      expect(response.status).toBe(404); // Since we store lowercase
    });

    it('handles slug with numbers', async () => {
      await prisma.business.create({
        data: {
          name: 'Cafe 123',
          slug: 'cafe-123',
          ownerId: testUserId,
          accountState: 'ACTIVE',
        },
      });

      const response = await request(app).get('/api/business/cafe-123');

      expect(response.status).toBe(200);
      expect(response.body.data.slug).toBe('cafe-123');
    });

    it('handles very long slug', async () => {
      const longSlug = 'a'.repeat(63);
      await prisma.business.create({
        data: {
          name: 'Long Slug Cafe',
          slug: longSlug,
          ownerId: testUserId,
          accountState: 'ACTIVE',
        },
      });

      const response = await request(app).get(`/api/business/${longSlug}`);

      expect(response.status).toBe(200);
    });

    it('returns null theme when not configured', async () => {
      await prisma.business.create({
        data: {
          name: 'No Theme Cafe',
          slug: 'no-theme-cafe',
          ownerId: testUserId,
          accountState: 'ACTIVE',
          theme: Prisma.JsonNull,
        },
      });

      const response = await request(app).get('/api/business/no-theme-cafe');

      expect(response.status).toBe(200);
      expect(response.body.data.theme).toBeNull();
    });

    it('does not expose sensitive fields (posAccessToken)', async () => {
      const response = await request(app).get('/api/business/joes-coffee');

      expect(response.body.data.posAccessToken).toBeUndefined();
      expect(response.body.data.posRefreshToken).toBeUndefined();
    });

    it('does not expose owner information', async () => {
      const response = await request(app).get('/api/business/joes-coffee');

      expect(response.body.data.ownerId).toBeUndefined();
      expect(response.body.data.owner).toBeUndefined();
    });
  });
});

describe('database error handling', () => {
  it('returns 500 for database errors', async () => {
    // Create a mock prisma client that throws errors
    const mockPrisma = {
      business: {
        findUnique: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      },
    } as unknown as PrismaClient;

    const app = express();
    app.use(express.json());
    app.use('/api/business', createBusinessRouter(mockPrisma));

    const response = await request(app).get('/api/business/joes-coffee');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('response format', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/business', createBusinessRouter(prisma));
  });

  it('returns standard ApiResponse format on success', async () => {
    const response = await request(app).get('/api/business/joes-coffee');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).not.toHaveProperty('error');
  });

  it('returns standard ApiResponse format on error', async () => {
    const response = await request(app).get('/api/business/non-existent');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code');
    expect(response.body.error).toHaveProperty('message');
  });
});

describe('GET /api/business/:slug/catalog', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/business', createBusinessRouter(prisma));
  });

  it('returns full catalog for business', async () => {
    const response = await request(app).get('/api/business/joes-coffee/catalog');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.categories).toBeDefined();
    expect(Array.isArray(response.body.data.categories)).toBe(true);
    expect(response.body.data.categories.length).toBe(3);
  });

  it('includes items within categories', async () => {
    const response = await request(app).get('/api/business/joes-coffee/catalog');

    const coffeeCategory = response.body.data.categories.find(
      (c: any) => c.name === 'Coffee'
    );
    expect(coffeeCategory).toBeDefined();
    expect(coffeeCategory.items).toBeDefined();
    expect(coffeeCategory.items.length).toBe(3);
  });

  it('returns 404 for non-existent business', async () => {
    const response = await request(app).get('/api/business/non-existent/catalog');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('BUSINESS_NOT_FOUND');
  });

  it('returns 404 for inactive business', async () => {
    const response = await request(app).get('/api/business/paused-cafe/catalog');

    expect(response.status).toBe(404);
  });

  it('orders categories by displayOrder', async () => {
    const response = await request(app).get('/api/business/joes-coffee/catalog');

    const categoryNames = response.body.data.categories.map((c: any) => c.name);
    expect(categoryNames).toEqual(['Coffee', 'Tea', 'Smoothies']);
  });

  it('only returns available items', async () => {
    // Create an unavailable item
    const category = await prisma.category.findFirst({
      where: { businessId: testBusinessId, name: 'Coffee' },
    });

    await prisma.base.create({
      data: {
        businessId: testBusinessId,
        categoryId: category!.id,
        name: 'Unavailable Drink',
        basePrice: 5.0,
        available: false,
      },
    });

    const response = await request(app).get('/api/business/joes-coffee/catalog');

    const coffeeCategory = response.body.data.categories.find(
      (c: any) => c.name === 'Coffee'
    );
    const unavailableItem = coffeeCategory.items.find(
      (i: any) => i.name === 'Unavailable Drink'
    );
    expect(unavailableItem).toBeUndefined();
  });
});
