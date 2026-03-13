/**
 * E2E Integration Tests: Full Square Sandbox Flow (SKI-5)
 *
 * Tests the complete ordering pipeline against Square sandbox:
 *   1. Catalog import via real Square API
 *   2. ItemMapping persistence
 *   3. Mapped catalog API endpoint (GET /api/catalog/:businessId/mapped)
 *   4. Order submission to Square
 *
 * All live suites are skipped unless SQUARE_ACCESS_TOKEN is present.
 * These tests make real outbound HTTP calls to Square sandbox — do not run
 * in CI unless sandbox credentials are configured.
 */

import { PrismaClient } from '../../../generated/prisma';
import { SquareAdapter } from '../../adapters/pos/SquareAdapter';
import { MappedCatalogService } from '../../services/MappedCatalogService';
import { AuthService } from '../../services/AuthService';
import { OrderService, CreateOrderInput } from '../../services/OrderService';
import { encryptToken } from '../../utils/encryption';
import request from 'supertest';
import express from 'express';
import { createMappedCatalogRouter } from '../catalog-mapped';
import { posRouter } from '../pos';

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const ENCRYPTION_KEY = process.env.POS_TOKEN_ENCRYPTION_KEY || 'test-key-must-be-32-chars-long!!';

const HAS_SQUARE_CREDENTIALS = !!SQUARE_ACCESS_TOKEN;
const describe_live = HAS_SQUARE_CREDENTIALS ? describe : describe.skip;

const prisma = new PrismaClient();

/**
 * Creates a test business with encrypted Square credentials, simulating
 * a completed OAuth flow.
 */
async function createE2EBusiness(): Promise<{ businessId: string }> {
  const uniqueId = `e2e-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const authService = new AuthService(prisma);

  const { business } = await authService.signup({
    email: `${uniqueId}@e2e-test.com`,
    password: 'E2ETestPass1!',
    businessName: `E2E Coffee ${uniqueId}`,
  });

  const encryptedToken = encryptToken(SQUARE_ACCESS_TOKEN!, ENCRYPTION_KEY);
  await prisma.business.update({
    where: { id: business.id },
    data: {
      posAccessToken: encryptedToken,
      posRefreshToken: encryptedToken,
      posMerchantId: 'sandbox-merchant',
      posProvider: 'SQUARE',
      accountState: 'ACTIVE',
    },
  });

  return { businessId: business.id };
}

/**
 * Deletes all data for a test business.
 * Business deletion cascades to all child records (itemMappings, orders, catalog, etc.)
 * via Prisma's onDelete: Cascade on all businessId relations.
 */
async function deleteE2EBusiness(businessId: string) {
  // Find the owner user before deleting the business
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { ownerId: true },
  });

  // Deleting Business cascades to: Category, Base, Modifier, Order, ItemMapping, etc.
  await prisma.business.delete({ where: { id: businessId } });

  // Optionally clean up the E2E test user (sessions cascade via onDelete: Cascade)
  if (business?.ownerId) {
    await prisma.user.delete({ where: { id: business.ownerId } }).catch(() => {
      // Ignore if user has other businesses or is already deleted
    });
  }
}

// ============================================================================
// SUITE 1: SquareAdapter — raw catalog import
// ============================================================================

describe_live('Square Sandbox — SquareAdapter catalog import', () => {
  let adapter: SquareAdapter;

  beforeAll(() => {
    adapter = new SquareAdapter();
    adapter.setCredentials({
      accessToken: SQUARE_ACCESS_TOKEN!,
      refreshToken: '',
      merchantId: 'sandbox-merchant',
      expiresAt: new Date(Date.now() + 3600000),
    });
  });

  it('importCatalog returns a valid RawCatalogData structure', async () => {
    const catalog = await adapter.importCatalog();

    expect(catalog).toBeDefined();
    expect(Array.isArray(catalog.items)).toBe(true);
    expect(Array.isArray(catalog.modifiers)).toBe(true);
    expect(Array.isArray(catalog.categories)).toBe(true);

    console.log('[E2E] Square catalog summary:', {
      categories: catalog.categories.length,
      items: catalog.items.length,
      modifiers: catalog.modifiers.length,
    });
  }, 15000);

  it('catalog items have required id and name fields', async () => {
    const catalog = await adapter.importCatalog();

    for (const item of catalog.items) {
      expect(typeof item.id).toBe('string');
      expect(item.id).not.toBe('');
      expect(typeof item.name).toBe('string');
      expect(item.name).not.toBe('');
    }
  }, 15000);

  it('catalog modifiers have required id and name fields', async () => {
    const catalog = await adapter.importCatalog();

    for (const mod of catalog.modifiers) {
      expect(typeof mod.id).toBe('string');
      expect(mod.id).not.toBe('');
      expect(typeof mod.name).toBe('string');
    }
  }, 15000);

  it('getLocations returns at least one location', async () => {
    const locations = await adapter.getLocations();

    expect(Array.isArray(locations)).toBe(true);
    expect(locations.length).toBeGreaterThan(0);

    const loc = locations[0];
    expect(loc.id).toBeTruthy();
    expect(loc.name).toBeTruthy();

    console.log('[E2E] Square locations:', locations.map(l => `${l.name} (${l.id})`));
  }, 15000);
});

// ============================================================================
// SUITE 2: Catalog import via HTTP endpoint
// ============================================================================

describe_live('Square Sandbox — POST /api/pos/import-catalog', () => {
  let businessId: string;
  let app: express.Express;

  beforeAll(async () => {
    ({ businessId } = await createE2EBusiness());

    app = express();
    app.use(express.json());
    app.use('/api/pos', posRouter);
  }, 15000);

  afterAll(async () => {
    await deleteE2EBusiness(businessId);
  });

  it('imports catalog successfully and returns summary', async () => {
    const res = await request(app)
      .post('/api/pos/import-catalog')
      .send({ businessId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rawCatalog).toBeDefined();
    expect(typeof res.body.data.summary.items).toBe('number');
    expect(typeof res.body.data.summary.modifiers).toBe('number');

    console.log('[E2E] /api/pos/import-catalog summary:', res.body.data.summary);
  }, 20000);

  it('returns 404 for unknown businessId', async () => {
    const res = await request(app)
      .post('/api/pos/import-catalog')
      .send({ businessId: 'nonexistent-id' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  }, 10000);
});

// ============================================================================
// SUITE 3: MappedCatalogService — ItemMapping persistence and catalog fetch
// ============================================================================

describe_live('Square Sandbox — MappedCatalogService + ItemMappings', () => {
  let businessId: string;
  let squareAdapter: SquareAdapter;
  let mappedCatalogService: MappedCatalogService;
  let seededItemCount = 0;
  let seededModifierCount = 0;

  beforeAll(async () => {
    ({ businessId } = await createE2EBusiness());

    squareAdapter = new SquareAdapter();
    squareAdapter.setCredentials({
      accessToken: SQUARE_ACCESS_TOKEN!,
      refreshToken: '',
      merchantId: 'sandbox-merchant',
      expiresAt: new Date(Date.now() + 3600000),
    });

    mappedCatalogService = new MappedCatalogService(prisma, squareAdapter);

    // Import catalog to get real Square IDs
    const rawCatalog = await squareAdapter.importCatalog();

    // Seed ItemMappings for up to 3 items (simulates onboarding wizard)
    const itemsToMap = rawCatalog.items.slice(0, 3);
    for (let i = 0; i < itemsToMap.length; i++) {
      await prisma.itemMapping.create({
        data: {
          businessId,
          squareItemId: itemsToMap[i].id,
          itemType: 'BASE',
          displayName: itemsToMap[i].name,
          category: i % 2 === 0 ? 'coffee' : 'tea',
          displayOrder: i,
          temperatureOptions: ['HOT', 'ICED'],
        },
      });
    }
    seededItemCount = itemsToMap.length;

    // Seed ItemMappings for up to 2 modifiers
    const modsToMap = rawCatalog.modifiers.slice(0, 2);
    for (const mod of modsToMap) {
      await prisma.itemMapping.create({
        data: {
          businessId,
          squareItemId: mod.id,
          itemType: 'MODIFIER',
          displayName: mod.name,
          category: 'milk',
          displayOrder: 0,
        },
      });
    }
    seededModifierCount = modsToMap.length;

    console.log('[E2E] Seeded mappings:', seededItemCount, 'bases,', seededModifierCount, 'modifiers');
  }, 30000);

  afterAll(async () => {
    await deleteE2EBusiness(businessId);
  });

  it('ItemMapping records are persisted with correct fields', async () => {
    const mappings = await prisma.itemMapping.findMany({ where: { businessId } });
    expect(mappings.length).toBe(seededItemCount + seededModifierCount);

    const bases = mappings.filter(m => m.itemType === 'BASE');
    expect(bases.length).toBe(seededItemCount);
    for (const b of bases) {
      expect(b.squareItemId).toBeTruthy();
      expect(['coffee', 'tea']).toContain(b.category);
    }
  });

  it('MappedCatalogService.getCatalog returns structured catalog from Square', async () => {
    const catalog = await mappedCatalogService.getCatalog(businessId);

    expect(catalog).toBeDefined();
    expect(Array.isArray(catalog.bases)).toBe(true);
    expect(catalog.modifiers).toBeDefined();
    expect(Array.isArray(catalog.modifiers.milks)).toBe(true);
    expect(Array.isArray(catalog.modifiers.syrups)).toBe(true);
    expect(Array.isArray(catalog.modifiers.toppings)).toBe(true);

    // Only bases whose squareItemId matches an ItemMapping with itemType=BASE are included
    expect(catalog.bases.length).toBeLessThanOrEqual(seededItemCount);

    console.log('[E2E] MappedCatalog result:', {
      bases: catalog.bases.length,
      milks: catalog.modifiers.milks.length,
      syrups: catalog.modifiers.syrups.length,
      toppings: catalog.modifiers.toppings.length,
    });
  }, 20000);

  it('mapped bases have all required fields', async () => {
    const catalog = await mappedCatalogService.getCatalog(businessId);

    for (const base of catalog.bases) {
      expect(base.squareItemId).toBeTruthy();
      expect(base.name).toBeTruthy();
      expect(base.category).toBeTruthy();
      expect(Array.isArray(base.sizes)).toBe(true);
      expect(Array.isArray(base.temperatures)).toBe(true);
    }
  }, 20000);

  it('GET /api/catalog/:businessId/mapped returns 200 with correct structure', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/catalog', createMappedCatalogRouter(mappedCatalogService));

    const res = await request(app).get(`/api/catalog/${businessId}/mapped`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bases).toBeDefined();
    expect(res.body.data.modifiers).toBeDefined();

    console.log('[E2E] GET /api/catalog/mapped HTTP response: 200 OK');
  }, 20000);
});

// ============================================================================
// SUITE 4: Order submission to Square
// ============================================================================

describe_live('Square Sandbox — Order submission via SquareAdapter', () => {
  let adapter: SquareAdapter;
  let squareCatalogItemId: string | null = null;
  let squareCatalogVariationId: string | null = null;

  beforeAll(async () => {
    adapter = new SquareAdapter();
    adapter.setCredentials({
      accessToken: SQUARE_ACCESS_TOKEN!,
      refreshToken: '',
      merchantId: 'sandbox-merchant',
      expiresAt: new Date(Date.now() + 3600000),
    });

    try {
      const rawCatalog = await adapter.importCatalog();
      if (rawCatalog.items.length > 0) {
        squareCatalogItemId = rawCatalog.items[0].id;
        squareCatalogVariationId = rawCatalog.items[0].variations?.[0]?.id ?? null;
        console.log('[E2E] Using catalog item for order:', squareCatalogItemId);
      } else {
        console.log('[E2E] No catalog items found — will use ad-hoc item');
      }
    } catch {
      console.log('[E2E] Catalog fetch failed, using ad-hoc item');
    }
  }, 20000);

  it('createOrder submits to Square sandbox and returns an order ID string', async () => {
    const orderSubmission = {
      customerName: 'E2E Test Customer',
      items: [
        {
          posItemId: squareCatalogItemId ?? 'adhoc',
          quantity: 1,
          ...(squareCatalogVariationId && { variationId: squareCatalogVariationId }),
        },
      ],
    };

    const orderId = await adapter.createOrder(orderSubmission);

    expect(orderId).toBeTruthy();
    expect(typeof orderId).toBe('string');

    console.log('[E2E] Square sandbox order created, ID:', orderId);
  }, 20000);
});

// ============================================================================
// SUITE 5: Full pipeline via OrderService (legacy flow with Square posItemId)
// ============================================================================

describe_live('Square Sandbox — OrderService full pipeline', () => {
  let businessId: string;
  let orderService: OrderService;
  let squareAdapter: SquareAdapter;
  let seededBaseId: string;

  beforeAll(async () => {
    ({ businessId } = await createE2EBusiness());

    squareAdapter = new SquareAdapter();
    squareAdapter.setCredentials({
      accessToken: SQUARE_ACCESS_TOKEN!,
      refreshToken: '',
      merchantId: 'sandbox-merchant',
      expiresAt: new Date(Date.now() + 3600000),
    });

    orderService = new OrderService(prisma, squareAdapter);

    // Fetch a real Square item + variation ID for order submission
    const rawCatalog = await squareAdapter.importCatalog();
    const firstItem = rawCatalog.items[0];
    const posItemId = firstItem?.id ?? 'sandbox-item-1';
    const posVariationId = firstItem?.variations?.[0]?.id ?? null;

    const category = await prisma.category.create({
      data: { businessId, name: 'Espresso Drinks' },
    });

    const base = await prisma.base.create({
      data: {
        businessId,
        categoryId: category.id,
        name: 'Latte',
        basePrice: firstItem?.variations?.[0]?.price ? firstItem.variations[0].price / 100 : 450,
        posItemId,
        posVariationId, // Store variation ID so submitToPOS can use it
      },
    });
    seededBaseId = base.id;

    console.log('[E2E] Seeded base — posItemId:', posItemId, 'posVariationId:', posVariationId);
  }, 30000);

  afterAll(async () => {
    await deleteE2EBusiness(businessId);
  });

  it('OrderService.createOrder saves order to DB and submits to Square', async () => {
    const orderInput: CreateOrderInput = {
      businessId,
      customerName: 'E2E Test Customer',
      items: [
        {
          baseId: seededBaseId,
          quantity: 1,
          size: 'MEDIUM',
          temperature: 'HOT',
          modifiers: [],
        },
      ],
    };

    const order = await orderService.createOrder(orderInput);

    expect(order).toBeDefined();
    expect(order.id).toBeTruthy();
    expect(order.status).toBeTruthy();
    expect(order.orderNumber).toBeTruthy();
    expect(order.posOrderId).toBeTruthy(); // Must have Square order ID — proves order reached Square

    console.log('[E2E] OrderService result:', {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      posOrderId: order.posOrderId,
    });

    // Verify persisted to DB
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder).not.toBeNull();
    expect(dbOrder!.businessId).toBe(businessId);

    console.log('[E2E] Order persisted to DB. posOrderId (Square):', dbOrder!.posOrderId);
  }, 30000);
});

// ============================================================================
// SUITE 6: Credential-independent failure path tests (always run)
// ============================================================================

describe('Square Sandbox — Failure paths (no Square credentials needed)', () => {
  it('MappedCatalogService throws NO_POS_CREDENTIALS for business without token', async () => {
    const authService = new AuthService(prisma);
    const adapter = new SquareAdapter();
    const service = new MappedCatalogService(prisma, adapter);

    const { user, business } = await authService.signup({
      email: `no-creds-${Date.now()}@test.com`,
      password: 'TestPass123!',
      businessName: 'No Creds Business',
    });

    try {
      await expect(service.getCatalog(business.id)).rejects.toMatchObject({
        code: 'NO_POS_CREDENTIALS',
      });
    } finally {
      await prisma.business.delete({ where: { id: business.id } });
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
  });

  it('MappedCatalogService throws BUSINESS_NOT_FOUND for unknown businessId', async () => {
    const adapter = new SquareAdapter();
    const service = new MappedCatalogService(prisma, adapter);

    await expect(service.getCatalog('nonexistent-business-000')).rejects.toMatchObject({
      code: 'BUSINESS_NOT_FOUND',
    });
  });

  it('GET /api/catalog/:businessId/mapped returns 404 for unknown businessId', async () => {
    const adapter = new SquareAdapter();
    const service = new MappedCatalogService(prisma, adapter);
    const app = express();
    app.use(express.json());
    app.use('/api/catalog', createMappedCatalogRouter(service));

    const res = await request(app).get('/api/catalog/nonexistent-id/mapped');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
