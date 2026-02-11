/**
 * Tests for tenant middleware
 * TDD: Write tests BEFORE implementation
 */

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import { PrismaClient, AccountState } from '../../../generated/prisma';
import {
  tenantMiddleware,
  requireTenant,
  TenantRequest,
  TenantBusiness,
} from '../tenant';

const prisma = new PrismaClient();

// Test business data
let testBusiness: {
  id: string;
  name: string;
  slug: string;
};
let testUserId: string;

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
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'tenant-test@example.com',
      hashedPassword: 'not-used-in-this-test',
    },
  });
  testUserId = user.id;

  // Create test business with active account
  const business = await prisma.business.create({
    data: {
      name: "Joe's Coffee",
      slug: 'joes-coffee',
      ownerId: testUserId,
      accountState: 'ACTIVE',
      theme: {
        primaryColor: '#4A90A4',
        secondaryColor: '#F5E6D3',
        logoUrl: 'https://example.com/logo.png',
      },
    },
  });
  testBusiness = {
    id: business.id,
    name: business.name,
    slug: business.slug,
  };
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
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await prisma.$disconnect();
});

describe('tenantMiddleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(tenantMiddleware(prisma));

    // Test endpoint that returns tenant info
    app.get('/test', (req: TenantRequest, res: Response) => {
      res.json({
        hasTenant: !!req.tenant,
        tenant: req.tenant || null,
        isMainDomain: req.isMainDomain || false,
      });
    });
  });

  // Happy path tests
  describe('happy path - attach business to request', () => {
    it('attaches business to request when valid subdomain found', async () => {
      const response = await request(app)
        .get('/test')
        .set('Host', 'joes-coffee.drink-ux.com');

      expect(response.status).toBe(200);
      expect(response.body.hasTenant).toBe(true);
      expect(response.body.tenant).toBeDefined();
      expect(response.body.tenant.id).toBe(testBusiness.id);
      expect(response.body.tenant.name).toBe("Joe's Coffee");
      expect(response.body.tenant.slug).toBe('joes-coffee');
    });

    it('includes theme data in tenant object', async () => {
      const response = await request(app)
        .get('/test')
        .set('Host', 'joes-coffee.drink-ux.com');

      expect(response.body.tenant.theme).toBeDefined();
      expect(response.body.tenant.theme.primaryColor).toBe('#4A90A4');
    });

    it('handles localhost subdomain for development', async () => {
      const response = await request(app)
        .get('/test')
        .set('Host', 'joes-coffee.localhost:3001');

      expect(response.status).toBe(200);
      expect(response.body.hasTenant).toBe(true);
      expect(response.body.tenant.slug).toBe('joes-coffee');
    });
  });

  // Success cases - continue to next middleware
  describe('success cases - middleware flow', () => {
    it('continues to next middleware after resolving tenant', async () => {
      const response = await request(app)
        .get('/test')
        .set('Host', 'joes-coffee.drink-ux.com');

      expect(response.status).toBe(200);
      expect(response.body.tenant).toBeDefined();
    });

    it('sets isMainDomain flag for main domain requests', async () => {
      const response = await request(app)
        .get('/test')
        .set('Host', 'drink-ux.com');

      expect(response.status).toBe(200);
      expect(response.body.isMainDomain).toBe(true);
      expect(response.body.tenant).toBeNull();
    });

    it('handles www prefix correctly (treats as main domain)', async () => {
      const response = await request(app)
        .get('/test')
        .set('Host', 'www.drink-ux.com');

      expect(response.status).toBe(200);
      expect(response.body.isMainDomain).toBe(true);
    });
  });

  // Failure cases
  describe('failure cases - non-existent business', () => {
    it('returns 404 for non-existent business slug', async () => {
      const response = await request(app)
        .get('/test')
        .set('Host', 'non-existent-cafe.drink-ux.com');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });

    it('returns 404 for inactive business', async () => {
      // Create inactive business
      await prisma.business.create({
        data: {
          name: 'Inactive Cafe',
          slug: 'inactive-cafe',
          ownerId: testUserId,
          accountState: 'PAUSED',
        },
      });

      const response = await request(app)
        .get('/test')
        .set('Host', 'inactive-cafe.drink-ux.com');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });

    it('returns 404 for ejected business', async () => {
      // Create ejected business
      await prisma.business.create({
        data: {
          name: 'Ejected Cafe',
          slug: 'ejected-cafe',
          ownerId: testUserId,
          accountState: 'EJECTED',
        },
      });

      const response = await request(app)
        .get('/test')
        .set('Host', 'ejected-cafe.drink-ux.com');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles missing host header gracefully', async () => {
      const response = await request(app)
        .get('/test')
        .set('Host', '');

      // Should treat as main domain or continue without tenant
      expect(response.status).toBe(200);
      expect(response.body.tenant).toBeNull();
    });

    it('handles case-insensitive slug lookup', async () => {
      const response = await request(app)
        .get('/test')
        .set('Host', 'JOES-COFFEE.drink-ux.com');

      expect(response.status).toBe(200);
      expect(response.body.hasTenant).toBe(true);
      expect(response.body.tenant.slug).toBe('joes-coffee');
    });

    it('allows setup_complete businesses', async () => {
      await prisma.business.create({
        data: {
          name: 'Setup Cafe',
          slug: 'setup-cafe',
          ownerId: testUserId,
          accountState: 'SETUP_COMPLETE',
        },
      });

      const response = await request(app)
        .get('/test')
        .set('Host', 'setup-cafe.drink-ux.com');

      expect(response.status).toBe(200);
      expect(response.body.hasTenant).toBe(true);
    });

    it('allows onboarding businesses', async () => {
      await prisma.business.create({
        data: {
          name: 'Onboarding Cafe',
          slug: 'onboarding-cafe',
          ownerId: testUserId,
          accountState: 'ONBOARDING',
        },
      });

      const response = await request(app)
        .get('/test')
        .set('Host', 'onboarding-cafe.drink-ux.com');

      expect(response.status).toBe(200);
      expect(response.body.hasTenant).toBe(true);
    });
  });
});

describe('tenantMiddleware with skip paths', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Configure middleware to skip certain paths
    app.use(tenantMiddleware(prisma, { skipPaths: ['/health', '/api/public'] }));

    app.get('/health', (req: TenantRequest, res: Response) => {
      res.json({ status: 'ok', hasTenant: !!req.tenant });
    });

    app.get('/api/public/info', (req: TenantRequest, res: Response) => {
      res.json({ info: 'public', hasTenant: !!req.tenant });
    });

    app.get('/api/private', (req: TenantRequest, res: Response) => {
      res.json({ hasTenant: !!req.tenant, tenant: req.tenant });
    });
  });

  it('skips tenant resolution for health check endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .set('Host', 'non-existent.drink-ux.com');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.hasTenant).toBe(false);
  });

  it('skips tenant resolution for public API paths', async () => {
    const response = await request(app)
      .get('/api/public/info')
      .set('Host', 'non-existent.drink-ux.com');

    expect(response.status).toBe(200);
    expect(response.body.info).toBe('public');
  });

  it('still requires tenant for non-skipped paths', async () => {
    const response = await request(app)
      .get('/api/private')
      .set('Host', 'non-existent.drink-ux.com');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
  });
});

describe('requireTenant middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(tenantMiddleware(prisma, { allowMainDomain: true }));

    // Protected endpoint
    app.get('/protected', requireTenant, (req: TenantRequest, res: Response) => {
      res.json({
        message: 'Success',
        tenantId: req.tenant!.id,
      });
    });
  });

  it('allows access when tenant is present', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Host', 'joes-coffee.drink-ux.com');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success');
    expect(response.body.tenantId).toBe(testBusiness.id);
  });

  it('returns 400 when tenant is required but missing', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Host', 'drink-ux.com');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('TENANT_REQUIRED');
  });

  it('returns proper JSON error format', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Host', 'drink-ux.com');

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code');
    expect(response.body.error).toHaveProperty('message');
  });
});

describe('TenantBusiness type', () => {
  it('includes required fields', async () => {
    const app = express();
    app.use(express.json());
    app.use(tenantMiddleware(prisma));

    app.get('/test', (req: TenantRequest, res: Response) => {
      const tenant = req.tenant;
      res.json({
        hasId: tenant && typeof tenant.id === 'string',
        hasName: tenant && typeof tenant.name === 'string',
        hasSlug: tenant && typeof tenant.slug === 'string',
        hasAccountState: tenant && typeof tenant.accountState === 'string',
        hasTheme: tenant && tenant.theme !== undefined,
      });
    });

    const response = await request(app)
      .get('/test')
      .set('Host', 'joes-coffee.drink-ux.com');

    expect(response.body.hasId).toBe(true);
    expect(response.body.hasName).toBe(true);
    expect(response.body.hasSlug).toBe(true);
    expect(response.body.hasAccountState).toBe(true);
    expect(response.body.hasTheme).toBe(true);
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
    app.use(tenantMiddleware(mockPrisma));

    app.get('/test', (req: TenantRequest, res: Response) => {
      res.json({ tenant: req.tenant });
    });

    const response = await request(app)
      .get('/test')
      .set('Host', 'joes-coffee.drink-ux.com');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
});
