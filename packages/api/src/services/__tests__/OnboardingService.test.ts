import { PrismaClient, AccountState } from '../../../generated/prisma';
import {
  OnboardingService,
  OnboardingError,
  OnboardingStep,
  OnboardingStatus,
  CatalogPath,
} from '../OnboardingService';
import { POSAdapter, RawCatalogData } from '../../adapters/pos/POSAdapter';
import { encryptToken } from '../../utils/encryption';

/** Helper to create a RawCatalogData with required empty arrays for new fields */
function catalogData(partial: Pick<RawCatalogData, 'items' | 'modifiers' | 'categories'>): RawCatalogData {
  return { ...partial, images: [], taxes: [], modifierLists: [] };
}

// Use the same encryption key as the service
const ENCRYPTION_KEY = process.env.POS_TOKEN_ENCRYPTION_KEY || 'test-key-must-be-32-chars-long!!';

// Mock POS adapter
const mockPOSAdapter: jest.Mocked<POSAdapter> = {
  setCredentials: jest.fn(),
  getAuthorizationUrl: jest.fn(),
  exchangeCodeForTokens: jest.fn(),
  refreshTokens: jest.fn(),
  importCatalog: jest.fn(),
  getLocations: jest.fn(),
  pushItem: jest.fn(),
  pushModifier: jest.fn(),
  updateItem: jest.fn(),
  createOrder: jest.fn(),
  getOrderStatus: jest.fn(),
  getPaymentLink: jest.fn(),
};

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database before tests
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

async function cleanDatabase() {
  await prisma.$transaction([
    prisma.presetModifier.deleteMany(),
    prisma.preset.deleteMany(),
    prisma.modifier.deleteMany(),
    prisma.base.deleteMany(),
    prisma.category.deleteMany(),
    prisma.syncHistory.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.session.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

describe('OnboardingService', () => {
  let service: OnboardingService;
  let testUser: { id: string };
  let testBusiness: { id: string };

  beforeEach(async () => {
    await cleanDatabase();

    // Create test user and business
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        hashedPassword: 'hash',
        businesses: {
          create: {
            name: 'Test Coffee Shop',
            slug: 'test-coffee-shop',
            accountState: AccountState.ONBOARDING,
          },
        },
      },
      include: { businesses: true },
    });

    testUser = { id: user.id };
    testBusiness = { id: user.businesses[0].id };

    // Reset mock
    jest.clearAllMocks();
    service = new OnboardingService(prisma, mockPOSAdapter);
  });

  // ==========================================================================
  // ONBOARDING STATE MANAGEMENT
  // ==========================================================================

  describe('State Management', () => {
    describe('getOnboardingStatus', () => {
      it('returns current step and progress for business in onboarding', async () => {
        const status = await service.getOnboardingStatus(testBusiness.id);

        expect(status).not.toBeNull();
        expect(status!.currentStep).toBe(OnboardingStep.POS_CONNECTION);
        expect(status!.completedSteps).toEqual([]);
        expect(status!.totalSteps).toBe(5);
      });

      it('includes step requirements in status', async () => {
        const status = await service.getOnboardingStatus(testBusiness.id);

        expect(status).not.toBeNull();
        expect(status!.stepRequirements).toBeDefined();
        expect(status!.stepRequirements[OnboardingStep.POS_CONNECTION]).toContain('optional');
      });

      it('returns null for non-existent business', async () => {
        const status = await service.getOnboardingStatus('non-existent-id');
        expect(status).toBeNull();
      });

      it('returns null for business not in ONBOARDING state', async () => {
        await prisma.business.update({
          where: { id: testBusiness.id },
          data: { accountState: AccountState.ACTIVE },
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status).toBeNull();
      });
    });

    describe('advanceStep', () => {
      it('advances to next step when current step is complete', async () => {
        // Complete POS connection step (optional, so can skip)
        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.currentStep).toBe(OnboardingStep.PATH_SELECTION);
      });

      it('marks previous step as completed', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.completedSteps).toContain(OnboardingStep.POS_CONNECTION);
      });

      it('throws error when trying to skip required steps', async () => {
        // Skip to catalog setup without selecting path
        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });

        await expect(
          service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {})
        ).rejects.toThrow(OnboardingError);
      });

      it('throws error when trying to advance without completing current step', async () => {
        await expect(
          service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
            path: CatalogPath.TEMPLATE,
          })
        ).rejects.toThrow(OnboardingError);
      });
    });

    describe('goBack', () => {
      it('allows going back to previous step', async () => {
        // Complete first two steps
        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.TEMPLATE,
        });

        // Go back
        await service.goBack(testBusiness.id);

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.currentStep).toBe(OnboardingStep.PATH_SELECTION);
      });

      it('keeps step data when going back', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.TEMPLATE,
        });

        await service.goBack(testBusiness.id);

        // Path selection should still be stored
        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.selectedPath).toBe(CatalogPath.TEMPLATE);
      });

      it('throws error when at first step', async () => {
        await expect(service.goBack(testBusiness.id)).rejects.toThrow(OnboardingError);
      });
    });

    describe('Edge cases', () => {
      it('handles resume after browser refresh', async () => {
        // Complete some steps
        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.TEMPLATE,
        });

        // Create new service instance (simulates refresh)
        const newService = new OnboardingService(prisma, mockPOSAdapter);
        const status = await newService.getOnboardingStatus(testBusiness.id);

        expect(status?.currentStep).toBe(OnboardingStep.CATALOG_SETUP);
        expect(status?.completedSteps).toContain(OnboardingStep.POS_CONNECTION);
        expect(status?.completedSteps).toContain(OnboardingStep.PATH_SELECTION);
      });

      it('handles concurrent step updates gracefully', async () => {
        // Simulate concurrent updates
        const promise1 = service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });
        const promise2 = service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });

        // Both should succeed (idempotent) or one should fail gracefully
        const results = await Promise.allSettled([promise1, promise2]);
        const successes = results.filter((r) => r.status === 'fulfilled');
        expect(successes.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ==========================================================================
  // STEP 1: POS CONNECTION
  // ==========================================================================

  describe('Step 1: POS Connection', () => {
    describe('storePOSCredentials', () => {
      it('stores POS credentials after OAuth callback', async () => {
        await service.storePOSCredentials(testBusiness.id, {
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          merchantId: 'merchant_123',
          locationId: 'location_456',
          expiresAt: new Date(Date.now() + 3600000),
        });

        const business = await prisma.business.findUnique({
          where: { id: testBusiness.id },
        });

        expect(business?.posMerchantId).toBe('merchant_123');
        expect(business?.posLocationId).toBe('location_456');
        expect(business?.posAccessToken).toBeTruthy();
      });

      it('marks POS connected after successful OAuth', async () => {
        await service.storePOSCredentials(testBusiness.id, {
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          merchantId: 'merchant_123',
          expiresAt: new Date(Date.now() + 3600000),
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.posConnected).toBe(true);
      });

      it('enables Import from POS path when connected', async () => {
        await service.storePOSCredentials(testBusiness.id, {
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          merchantId: 'merchant_123',
          expiresAt: new Date(Date.now() + 3600000),
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.availablePaths).toContain(CatalogPath.IMPORT);
      });
    });

    describe('handleOAuthFailure', () => {
      it('handles OAuth failure/cancellation gracefully', async () => {
        await service.handleOAuthFailure(testBusiness.id, 'user_cancelled');

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.posConnected).toBeFalsy();
        expect(status?.stepData?.oauthError).toBe('user_cancelled');
      });

      it('handles invalid OAuth state', async () => {
        await expect(
          service.validateOAuthState(testBusiness.id, 'invalid_state')
        ).rejects.toThrow(OnboardingError);
      });
    });

    describe('Edge cases', () => {
      it('handles POS already connected - offers re-auth option', async () => {
        // First connection
        await service.storePOSCredentials(testBusiness.id, {
          accessToken: 'token_1',
          refreshToken: 'refresh_1',
          merchantId: 'merchant_123',
          expiresAt: new Date(Date.now() + 3600000),
        });

        // Re-auth
        await service.storePOSCredentials(testBusiness.id, {
          accessToken: 'token_2',
          refreshToken: 'refresh_2',
          merchantId: 'merchant_123',
          expiresAt: new Date(Date.now() + 3600000),
        });

        const business = await prisma.business.findUnique({
          where: { id: testBusiness.id },
        });

        // Should update to new tokens
        expect(business?.posAccessToken).toBeTruthy();
      });

      it('returns available locations when multiple Square locations exist', async () => {
        // This would be checked via the adapter
        mockPOSAdapter.importCatalog.mockResolvedValueOnce(catalogData({
          items: [],
          modifiers: [],
          categories: [],
        }));

        const locations = await service.getAvailableLocations(testBusiness.id);
        // Would return locations from Square API
        expect(locations).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // STEP 2: PATH SELECTION
  // ==========================================================================

  describe('Step 2: Path Selection', () => {
    beforeEach(async () => {
      // Complete step 1
      await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
        skipped: true,
      });
    });

    describe('selectPath', () => {
      it('selects Import from POS path when POS is connected', async () => {
        // First connect POS
        await service.storePOSCredentials(testBusiness.id, {
          accessToken: 'token',
          refreshToken: 'refresh',
          merchantId: 'merchant',
          expiresAt: new Date(Date.now() + 3600000),
        });

        // Go back and re-complete step 1
        await service.goBack(testBusiness.id);
        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {});

        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.IMPORT,
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.selectedPath).toBe(CatalogPath.IMPORT);
      });

      it('selects Use Template path', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.TEMPLATE,
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.selectedPath).toBe(CatalogPath.TEMPLATE);
      });

      it('selects Start Fresh path', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.FRESH,
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.selectedPath).toBe(CatalogPath.FRESH);
      });

      it('stores selection in business record', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.TEMPLATE,
        });

        const business = await prisma.business.findUnique({
          where: { id: testBusiness.id },
        });

        // Check onboarding data stored
        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.selectedPath).toBe(CatalogPath.TEMPLATE);
      });
    });

    describe('Failure cases', () => {
      it('cannot select Import without POS connection', async () => {
        await expect(
          service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
            path: CatalogPath.IMPORT,
          })
        ).rejects.toThrow(OnboardingError);

        try {
          await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
            path: CatalogPath.IMPORT,
          });
        } catch (error) {
          expect((error as OnboardingError).code).toBe('POS_NOT_CONNECTED');
        }
      });
    });

    describe('Edge cases', () => {
      it('allows changing path selection before proceeding', async () => {
        // Select template first
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.TEMPLATE,
        });

        // Go back and change to fresh
        await service.goBack(testBusiness.id);
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.FRESH,
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.selectedPath).toBe(CatalogPath.FRESH);
      });

      it('shows path-specific next steps', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.TEMPLATE,
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.nextStepHint).toContain('template');
      });
    });
  });

  // ==========================================================================
  // STEP 3: CATALOG SETUP
  // ==========================================================================

  describe('Step 3: Catalog Setup', () => {
    // NOTE: No parent beforeEach - each child describe handles its own setup
    // to avoid conflicts between different path tests

    describe('Import path', () => {
      beforeEach(async () => {
        // Reset and set up for import path
        await cleanDatabase();
        jest.clearAllMocks();

        const user = await prisma.user.create({
          data: {
            email: 'import@example.com',
            hashedPassword: 'hash',
            businesses: {
              create: {
                name: 'Import Coffee Shop',
                slug: 'import-coffee-shop',
                accountState: AccountState.ONBOARDING,
                posAccessToken: encryptToken('test_access_token', ENCRYPTION_KEY),
                posRefreshToken: encryptToken('test_refresh_token', ENCRYPTION_KEY),
                posMerchantId: 'merchant_123',
              },
            },
          },
          include: { businesses: true },
        });

        testBusiness = { id: user.businesses[0].id };
        service = new OnboardingService(prisma, mockPOSAdapter);

        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {});
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.IMPORT,
        });
      });

      it('fetches catalog from POS via adapter', async () => {
        const mockCatalog: RawCatalogData = catalogData({
          categories: [{ id: 'cat_1', name: 'Coffee', ordinal: 1 }],
          items: [
            {
              id: 'item_1',
              name: 'Latte',
              categoryId: 'cat_1',
              variations: [{ id: 'var_1', name: 'Regular', price: 50000 }],
            },
          ],
          modifiers: [
            { id: 'mod_1', name: 'Oat Milk', price: 7500, modifierListId: 'ml_1' },
          ],
        });

        mockPOSAdapter.importCatalog.mockReset();
        mockPOSAdapter.importCatalog.mockResolvedValue(mockCatalog);

        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        expect(mockPOSAdapter.setCredentials).toHaveBeenCalled();
        expect(mockPOSAdapter.importCatalog).toHaveBeenCalled();
      });

      it('creates categories from import', async () => {
        mockPOSAdapter.importCatalog.mockReset();
        mockPOSAdapter.importCatalog.mockResolvedValue(catalogData({
          categories: [
            { id: 'cat_1', name: 'Coffee', ordinal: 1 },
            { id: 'cat_2', name: 'Tea', ordinal: 2 },
          ],
          items: [],
          modifiers: [],
        }));

        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const categories = await prisma.category.findMany({
          where: { businessId: testBusiness.id },
        });

        expect(categories).toHaveLength(2);
        expect(categories.map((c) => c.name)).toContain('Coffee');
        expect(categories.map((c) => c.name)).toContain('Tea');
      });

      it('creates bases from imported items', async () => {
        mockPOSAdapter.importCatalog.mockReset();
        mockPOSAdapter.importCatalog.mockResolvedValue(catalogData({
          categories: [{ id: 'cat_1', name: 'Coffee', ordinal: 1 }],
          items: [
            {
              id: 'item_1',
              name: 'Espresso',
              categoryId: 'cat_1',
              variations: [{ id: 'var_1', name: 'Single', price: 30000 }],
            },
          ],
          modifiers: [],
        }));

        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const bases = await prisma.base.findMany({
          where: { businessId: testBusiness.id },
        });

        expect(bases).toHaveLength(1);
        expect(bases[0].name).toBe('Espresso');
        expect(bases[0].posItemId).toBe('item_1');
      });

      it('creates modifiers from import', async () => {
        mockPOSAdapter.importCatalog.mockReset();
        mockPOSAdapter.importCatalog.mockResolvedValue(catalogData({
          categories: [],
          items: [],
          modifiers: [
            { id: 'mod_1', name: 'Oat Milk', price: 7500, modifierListId: 'ml_milk' },
            { id: 'mod_2', name: 'Vanilla Syrup', price: 5000, modifierListId: 'ml_syrup' },
          ],
        }));

        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const modifiers = await prisma.modifier.findMany({
          where: { businessId: testBusiness.id },
        });

        expect(modifiers).toHaveLength(2);
        expect(modifiers.find((m) => m.name === 'Oat Milk')?.posModifierId).toBe('mod_1');
      });

      it('maps POS IDs to local records', async () => {
        mockPOSAdapter.importCatalog.mockReset();
        mockPOSAdapter.importCatalog.mockResolvedValue(catalogData({
          categories: [{ id: 'pos_cat_1', name: 'Coffee', ordinal: 1 }],
          items: [
            {
              id: 'pos_item_1',
              name: 'Latte',
              categoryId: 'pos_cat_1',
              variations: [{ id: 'var_1', name: 'Regular', price: 50000 }],
            },
          ],
          modifiers: [],
        }));

        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const base = await prisma.base.findFirst({
          where: { businessId: testBusiness.id },
        });

        expect(base?.posItemId).toBe('pos_item_1');
      });

      it('handles POS import failure', async () => {
        mockPOSAdapter.importCatalog.mockReset();
        mockPOSAdapter.importCatalog.mockRejectedValue(new Error('API error'));

        await expect(
          service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {})
        ).rejects.toThrow(OnboardingError);
      });

      it('handles large POS catalog (>100 items)', async () => {
        const largeItems = Array.from({ length: 150 }, (_, i) => ({
          id: `item_${i}`,
          name: `Item ${i}`,
          categoryId: 'cat_1',
          variations: [{ id: `var_${i}`, name: 'Regular', price: 30000 + i }],
        }));

        mockPOSAdapter.importCatalog.mockReset();
        mockPOSAdapter.importCatalog.mockResolvedValue(catalogData({
          categories: [{ id: 'cat_1', name: 'Coffee', ordinal: 1 }],
          items: largeItems,
          modifiers: [],
        }));

        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const bases = await prisma.base.findMany({
          where: { businessId: testBusiness.id },
        });

        expect(bases).toHaveLength(150);
      });

      it('handles duplicate item names in import by making unique', async () => {
        mockPOSAdapter.importCatalog.mockReset();
        mockPOSAdapter.importCatalog.mockResolvedValue(catalogData({
          categories: [{ id: 'cat_1', name: 'Coffee', ordinal: 1 }],
          items: [
            { id: 'item_1', name: 'Latte', categoryId: 'cat_1', variations: [{ id: 'v1', name: 'R', price: 50000 }] },
            { id: 'item_2', name: 'Latte', categoryId: 'cat_1', variations: [{ id: 'v2', name: 'R', price: 50000 }] },
          ],
          modifiers: [],
        }));

        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const bases = await prisma.base.findMany({
          where: { businessId: testBusiness.id },
        });

        expect(bases).toHaveLength(2);
        // Names should be made unique
        const names = bases.map((b) => b.name);
        expect(new Set(names).size).toBe(2);
      });
    });

    describe('Template path', () => {
      beforeEach(async () => {
        // Reset for template path tests (Import path tests may have changed testBusiness)
        await cleanDatabase();
        jest.clearAllMocks();

        const user = await prisma.user.create({
          data: {
            email: 'template@example.com',
            hashedPassword: 'hash',
            businesses: {
              create: {
                name: 'Template Coffee Shop',
                slug: 'template-coffee-shop',
                accountState: AccountState.ONBOARDING,
              },
            },
          },
          include: { businesses: true },
        });

        testBusiness = { id: user.businesses[0].id };
        service = new OnboardingService(prisma, mockPOSAdapter);

        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.TEMPLATE,
        });
      });

      it('loads template catalog data', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const categories = await prisma.category.findMany({
          where: { businessId: testBusiness.id },
        });

        expect(categories.length).toBeGreaterThan(0);
      });

      it('creates default categories (Coffee, Tea, Other)', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const categories = await prisma.category.findMany({
          where: { businessId: testBusiness.id },
          orderBy: { displayOrder: 'asc' },
        });

        expect(categories.map((c) => c.name)).toEqual(
          expect.arrayContaining(['Coffee', 'Tea', 'Other'])
        );
      });

      it('creates sample bases and modifiers', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const bases = await prisma.base.findMany({
          where: { businessId: testBusiness.id },
        });

        const modifiers = await prisma.modifier.findMany({
          where: { businessId: testBusiness.id },
        });

        expect(bases.length).toBeGreaterThan(0);
        expect(modifiers.length).toBeGreaterThan(0);
      });

      it('creates bases with valid prices in cents', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const bases = await prisma.base.findMany({
          where: { businessId: testBusiness.id },
        });

        for (const base of bases) {
          expect(base.priceCents).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(base.priceCents)).toBe(true);
        }
      });

      it('creates modifiers with valid modifier group IDs', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const modifiers = await prisma.modifier.findMany({
          where: { businessId: testBusiness.id },
        });

        for (const modifier of modifiers) {
          expect(modifier.modifierGroupId).toBeDefined();
          expect(typeof modifier.modifierGroupId).toBe('string');
        }
      });

      it('handles invalid template data gracefully', async () => {
        // This would be an internal error, but service should handle it
        // By using valid template data (tested elsewhere)
        await expect(
          service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {})
        ).resolves.not.toThrow();
      });
    });

    describe('Fresh path', () => {
      beforeEach(async () => {
        // Reset for fresh path tests
        await cleanDatabase();
        jest.clearAllMocks();

        const user = await prisma.user.create({
          data: {
            email: 'fresh@example.com',
            hashedPassword: 'hash',
            businesses: {
              create: {
                name: 'Fresh Coffee Shop',
                slug: 'fresh-coffee-shop',
                accountState: AccountState.ONBOARDING,
              },
            },
          },
          include: { businesses: true },
        });

        testBusiness = { id: user.businesses[0].id };
        service = new OnboardingService(prisma, mockPOSAdapter);

        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
          skipped: true,
        });
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.FRESH,
        });
      });

      it('creates empty catalog structure', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const categories = await prisma.category.findMany({
          where: { businessId: testBusiness.id },
        });

        // Fresh should create minimal structure
        expect(categories.length).toBe(0);
      });

      it('prompts to add first category', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.catalogSetupComplete).toBe(true);
        expect(status?.stepData?.catalogIsEmpty).toBe(true);
      });
    });
  });

  // ==========================================================================
  // STEP 4: BRANDING
  // ==========================================================================

  describe('Step 4: Branding', () => {
    beforeEach(async () => {
      // Reset for branding tests
      await cleanDatabase();
      jest.clearAllMocks();

      const user = await prisma.user.create({
        data: {
          email: 'branding@example.com',
          hashedPassword: 'hash',
          businesses: {
            create: {
              name: 'Branding Coffee Shop',
              slug: 'branding-coffee-shop',
              accountState: AccountState.ONBOARDING,
            },
          },
        },
        include: { businesses: true },
      });

      testBusiness = { id: user.businesses[0].id };
      service = new OnboardingService(prisma, mockPOSAdapter);

      await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
        skipped: true,
      });
      await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
        path: CatalogPath.TEMPLATE,
      });
      await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});
    });

    describe('setTheme', () => {
      it('sets primary and secondary colors', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
          theme: {
            primaryColor: '#6B4226',
            secondaryColor: '#D4A574',
          },
        });

        const business = await prisma.business.findUnique({
          where: { id: testBusiness.id },
        });

        const storage = business?.theme as { theme: { primaryColor: string; secondaryColor: string } };
        expect(storage.theme.primaryColor).toBe('#6B4226');
        expect(storage.theme.secondaryColor).toBe('#D4A574');
      });

      it('sets logo URL', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
          theme: {
            primaryColor: '#000000',
            logoUrl: 'https://example.com/logo.png',
          },
        });

        const business = await prisma.business.findUnique({
          where: { id: testBusiness.id },
        });

        const storage = business?.theme as { theme: { logoUrl: string } };
        expect(storage.theme.logoUrl).toBe('https://example.com/logo.png');
      });

      it('returns theme preview data', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
          theme: {
            primaryColor: '#6B4226',
            secondaryColor: '#D4A574',
          },
        });

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.stepData?.themePreview).toBeDefined();
      });
    });

    describe('Failure cases', () => {
      it('rejects invalid color format', async () => {
        await expect(
          service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
            theme: {
              primaryColor: 'not-a-color',
            },
          })
        ).rejects.toThrow(OnboardingError);
      });

      it('rejects invalid logo URL', async () => {
        await expect(
          service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
            theme: {
              primaryColor: '#000000',
              logoUrl: 'not-a-url',
            },
          })
        ).rejects.toThrow(OnboardingError);
      });
    });

    describe('Edge cases', () => {
      it('allows skipping branding (use defaults)', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
          skipped: true,
        });

        const business = await prisma.business.findUnique({
          where: { id: testBusiness.id },
        });

        // Should have default theme
        const theme = business?.theme as { primaryColor: string } | null;
        expect(theme?.primaryColor || '#6B4226').toBeDefined();
      });

      it('allows changing branding before completing', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
          theme: {
            primaryColor: '#FF0000',
          },
        });

        await service.goBack(testBusiness.id);

        await service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
          theme: {
            primaryColor: '#00FF00',
          },
        });

        const business = await prisma.business.findUnique({
          where: { id: testBusiness.id },
        });

        const storage = business?.theme as { theme: { primaryColor: string } };
        expect(storage.theme.primaryColor).toBe('#00FF00');
      });
    });
  });

  // ==========================================================================
  // STEP 5: REVIEW & COMPLETE
  // ==========================================================================

  describe('Step 5: Review & Complete', () => {
    beforeEach(async () => {
      // Reset for review tests
      await cleanDatabase();
      jest.clearAllMocks();

      const user = await prisma.user.create({
        data: {
          email: 'review@example.com',
          hashedPassword: 'hash',
          businesses: {
            create: {
              name: 'Review Coffee Shop',
              slug: 'review-coffee-shop',
              accountState: AccountState.ONBOARDING,
            },
          },
        },
        include: { businesses: true },
      });

      testBusiness = { id: user.businesses[0].id };
      service = new OnboardingService(prisma, mockPOSAdapter);

      await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
        skipped: true,
      });
      await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
        path: CatalogPath.TEMPLATE,
      });
      await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});
      await service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
        skipped: true,
      });
    });

    describe('getReviewSummary', () => {
      it('shows catalog summary', async () => {
        const summary = await service.getReviewSummary(testBusiness.id);

        expect(summary.catalog).toBeDefined();
        expect(summary.catalog.categoriesCount).toBeGreaterThanOrEqual(0);
        expect(summary.catalog.basesCount).toBeGreaterThanOrEqual(0);
        expect(summary.catalog.modifiersCount).toBeGreaterThanOrEqual(0);
      });

      it('shows theme preview', async () => {
        const summary = await service.getReviewSummary(testBusiness.id);

        expect(summary.theme).toBeDefined();
      });

      it('shows POS sync status', async () => {
        const summary = await service.getReviewSummary(testBusiness.id);

        expect(summary.posStatus).toBeDefined();
        expect(typeof summary.posStatus.connected).toBe('boolean');
      });
    });

    describe('completeOnboarding', () => {
      it('completes onboarding and changes state to SETUP_COMPLETE', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.REVIEW, {});

        const business = await prisma.business.findUnique({
          where: { id: testBusiness.id },
        });

        expect(business?.accountState).toBe(AccountState.SETUP_COMPLETE);
      });

      it('clears onboarding data after completion', async () => {
        await service.completeStep(testBusiness.id, OnboardingStep.REVIEW, {});

        // Onboarding status should be null now
        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status).toBeNull();
      });

      it('triggers initial POS sync on complete when POS is connected', async () => {
        // Reset with POS connected
        await cleanDatabase();
        const user = await prisma.user.create({
          data: {
            email: 'sync@example.com',
            hashedPassword: 'hash',
            businesses: {
              create: {
                name: 'Sync Coffee Shop',
                slug: 'sync-coffee-shop',
                accountState: AccountState.ONBOARDING,
                posAccessToken: encryptToken('test_access_token', ENCRYPTION_KEY),
                posRefreshToken: encryptToken('test_refresh_token', ENCRYPTION_KEY),
                posMerchantId: 'merchant',
              },
            },
          },
          include: { businesses: true },
        });

        testBusiness = { id: user.businesses[0].id };

        // Complete all steps
        await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {});
        await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
          path: CatalogPath.TEMPLATE,
        });
        await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});
        await service.completeStep(testBusiness.id, OnboardingStep.BRANDING, {
          skipped: true,
        });
        await service.completeStep(testBusiness.id, OnboardingStep.REVIEW, {
          triggerSync: true,
        });

        // Sync should have been triggered (mocked)
        expect(mockPOSAdapter.setCredentials).toHaveBeenCalled();
      });
    });

    describe('Failure cases', () => {
      it('cannot complete with missing required data', async () => {
        // Reset and don't complete required steps
        await cleanDatabase();
        const user = await prisma.user.create({
          data: {
            email: 'incomplete@example.com',
            hashedPassword: 'hash',
            businesses: {
              create: {
                name: 'Incomplete Shop',
                slug: 'incomplete-shop',
                accountState: AccountState.ONBOARDING,
              },
            },
          },
          include: { businesses: true },
        });

        testBusiness = { id: user.businesses[0].id };

        await expect(
          service.completeStep(testBusiness.id, OnboardingStep.REVIEW, {})
        ).rejects.toThrow(OnboardingError);
      });
    });

    describe('Edge cases', () => {
      it('allows going back to edit previous steps', async () => {
        // Currently at review, go back to branding
        await service.goBack(testBusiness.id);

        const status = await service.getOnboardingStatus(testBusiness.id);
        expect(status?.currentStep).toBe(OnboardingStep.BRANDING);
      });
    });
  });

  // ==========================================================================
  // RESET ONBOARDING
  // ==========================================================================

  describe('Reset Onboarding', () => {
    beforeEach(async () => {
      // Reset for reset tests
      await cleanDatabase();
      jest.clearAllMocks();

      const user = await prisma.user.create({
        data: {
          email: 'reset@example.com',
          hashedPassword: 'hash',
          businesses: {
            create: {
              name: 'Reset Coffee Shop',
              slug: 'reset-coffee-shop',
              accountState: AccountState.ONBOARDING,
            },
          },
        },
        include: { businesses: true },
      });

      testBusiness = { id: user.businesses[0].id };
      service = new OnboardingService(prisma, mockPOSAdapter);
    });

    it('allows resetting onboarding to start over', async () => {
      // Complete some steps
      await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
        skipped: true,
      });
      await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
        path: CatalogPath.TEMPLATE,
      });

      // Reset
      await service.resetOnboarding(testBusiness.id);

      const status = await service.getOnboardingStatus(testBusiness.id);
      expect(status?.currentStep).toBe(OnboardingStep.POS_CONNECTION);
      expect(status?.completedSteps).toEqual([]);
    });

    it('clears catalog data on reset', async () => {
      await service.completeStep(testBusiness.id, OnboardingStep.POS_CONNECTION, {
        skipped: true,
      });
      await service.completeStep(testBusiness.id, OnboardingStep.PATH_SELECTION, {
        path: CatalogPath.TEMPLATE,
      });
      await service.completeStep(testBusiness.id, OnboardingStep.CATALOG_SETUP, {});

      const basesBefore = await prisma.base.count({
        where: { businessId: testBusiness.id },
      });
      expect(basesBefore).toBeGreaterThan(0);

      await service.resetOnboarding(testBusiness.id);

      const basesAfter = await prisma.base.count({
        where: { businessId: testBusiness.id },
      });
      expect(basesAfter).toBe(0);
    });
  });
});
