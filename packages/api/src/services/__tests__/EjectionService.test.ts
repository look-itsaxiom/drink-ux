import { PrismaClient, AccountState } from '../../../generated/prisma';
import { EjectionService, EjectionError } from '../EjectionService';
import { AuthService } from '../AuthService';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database before tests
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
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('EjectionService', () => {
  let ejectionService: EjectionService;
  let authService: AuthService;

  beforeEach(async () => {
    // Clean database before each test
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
    ejectionService = new EjectionService(prisma);
    authService = new AuthService(prisma);
  });

  // Helper to create a test user and business
  async function createTestBusiness(
    email: string = 'owner@test.com',
    businessName: string = 'Test Coffee',
    accountState: AccountState = 'ACTIVE'
  ) {
    const signup = await authService.signup({
      email,
      password: 'SecureP@ss1',
      businessName,
    });

    // Update account state if needed
    if (accountState !== 'ONBOARDING') {
      await prisma.business.update({
        where: { id: signup.business.id },
        data: { accountState },
      });
    }

    return signup;
  }

  // Helper to add POS tokens to a business
  async function addPOSTokens(businessId: string) {
    await prisma.business.update({
      where: { id: businessId },
      data: {
        posProvider: 'SQUARE',
        posAccessToken: 'encrypted_access_token',
        posRefreshToken: 'encrypted_refresh_token',
        posMerchantId: 'merchant_123',
        posLocationId: 'location_456',
      },
    });
  }

  // Helper to add catalog items to a business
  async function addCatalogItems(businessId: string) {
    const category = await prisma.category.create({
      data: {
        businessId,
        name: 'Hot Drinks',
        displayOrder: 1,
      },
    });

    const base = await prisma.base.create({
      data: {
        businessId,
        categoryId: category.id,
        name: 'Latte',
        priceCents: 450,
      },
    });

    await prisma.modifier.create({
      data: {
        businessId,
        modifierGroupId: 'test-mg-milk',
        name: 'Oat Milk',
        priceCents: 75,
      },
    });

    return { category, base };
  }

  // Helper to add orders to a business
  async function addOrders(businessId: string, status: 'PENDING' | 'COMPLETED' = 'COMPLETED') {
    return prisma.order.create({
      data: {
        businessId,
        orderNumber: `T${Date.now()}`,
        pickupCode: `${Date.now()}`.slice(-4),
        customerName: 'Test Customer',
        customerEmail: 'customer@test.com',
        status,
        subtotalCents: 450,
        taxCents: 37,
        totalCents: 487,
        items: {
          create: {
            baseId: 'test-base-id',
            name: 'Latte',
            quantity: 1,
            size: 'MEDIUM',
            temperature: 'HOT',
            unitPriceCents: 450,
            totalPriceCents: 450,
            modifiers: '[]',
          },
        },
      },
    });
  }

  // ===========================================================================
  // EJECTION FLOW
  // ===========================================================================
  describe('eject', () => {
    // Happy path
    describe('Happy path: Eject business - set state to EJECTED', () => {
      it('updates account state from ACTIVE to EJECTED', async () => {
        const { business } = await createTestBusiness('owner@active.com', 'Active Coffee', 'ACTIVE');

        const result = await ejectionService.eject(business.id, { confirmed: true });

        expect(result.success).toBe(true);
        expect(result.previousState).toBe('ACTIVE');
        expect(result.newState).toBe('EJECTED');

        // Verify in database
        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.accountState).toBe('EJECTED');
      });

      it('updates account state from PAUSED to EJECTED', async () => {
        const { business } = await createTestBusiness('owner@paused.com', 'Paused Coffee', 'PAUSED');

        const result = await ejectionService.eject(business.id, { confirmed: true });

        expect(result.success).toBe(true);
        expect(result.previousState).toBe('PAUSED');
        expect(result.newState).toBe('EJECTED');
      });

      it('updates account state from SETUP_COMPLETE to EJECTED', async () => {
        const { business } = await createTestBusiness('owner@setup.com', 'Setup Coffee', 'SETUP_COMPLETE');

        const result = await ejectionService.eject(business.id, { confirmed: true });

        expect(result.success).toBe(true);
        expect(result.previousState).toBe('SETUP_COMPLETE');
        expect(result.newState).toBe('EJECTED');
      });

      it('updates account state from ONBOARDING to EJECTED', async () => {
        const { business } = await createTestBusiness('owner@onboard.com', 'Onboarding Coffee', 'ONBOARDING');

        const result = await ejectionService.eject(business.id, { confirmed: true });

        expect(result.success).toBe(true);
        expect(result.previousState).toBe('ONBOARDING');
        expect(result.newState).toBe('EJECTED');
      });
    });

    // Success cases
    describe('Success cases', () => {
      it('clears POS access tokens on ejection (security)', async () => {
        const { business } = await createTestBusiness('owner@pos.com', 'POS Coffee', 'ACTIVE');
        await addPOSTokens(business.id);

        // Verify tokens exist
        const before = await prisma.business.findUnique({ where: { id: business.id } });
        expect(before?.posAccessToken).toBe('encrypted_access_token');
        expect(before?.posRefreshToken).toBe('encrypted_refresh_token');

        await ejectionService.eject(business.id, { confirmed: true });

        // Verify tokens are cleared
        const after = await prisma.business.findUnique({ where: { id: business.id } });
        expect(after?.posAccessToken).toBeNull();
        expect(after?.posRefreshToken).toBeNull();
        // Keep merchant and location IDs for potential reconnection
        expect(after?.posMerchantId).toBe('merchant_123');
        expect(after?.posLocationId).toBe('location_456');
      });

      it('records ejection timestamp', async () => {
        const { business } = await createTestBusiness('owner@timestamp.com', 'Timestamp Coffee', 'ACTIVE');
        const beforeEject = new Date();

        const result = await ejectionService.eject(business.id, { confirmed: true });

        expect(result.ejectedAt).toBeDefined();
        expect(new Date(result.ejectedAt).getTime()).toBeGreaterThanOrEqual(beforeEject.getTime());

        // Verify updatedAt was modified
        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeEject.getTime());
      });

      it('returns ejection confirmation', async () => {
        const { business } = await createTestBusiness('owner@confirm.com', 'Confirm Coffee', 'ACTIVE');

        const result = await ejectionService.eject(business.id, { confirmed: true });

        expect(result).toMatchObject({
          success: true,
          businessId: business.id,
          previousState: 'ACTIVE',
          newState: 'EJECTED',
          dataPreserved: true,
          canStartOver: true,
        });
      });

      it('logs ejection reason if provided', async () => {
        const { business } = await createTestBusiness('owner@reason.com', 'Reason Coffee', 'ACTIVE');

        const result = await ejectionService.eject(business.id, {
          confirmed: true,
          reason: 'Closing the business',
        });

        expect(result.reason).toBe('Closing the business');

        // In a real implementation, this would be stored in an audit log
        // For now, we just verify it's returned
      });
    });

    // Failure cases
    describe('Failure cases', () => {
      it('cannot eject already ejected business', async () => {
        const { business } = await createTestBusiness('owner@ejected.com', 'Ejected Coffee', 'EJECTED');

        await expect(
          ejectionService.eject(business.id, { confirmed: true })
        ).rejects.toThrow(EjectionError);

        try {
          await ejectionService.eject(business.id, { confirmed: true });
        } catch (error) {
          expect(error).toBeInstanceOf(EjectionError);
          expect((error as EjectionError).code).toBe('ALREADY_EJECTED');
        }
      });

      it('cannot eject without confirmation flag', async () => {
        const { business } = await createTestBusiness('owner@noconfirm.com', 'NoConfirm Coffee', 'ACTIVE');

        await expect(
          ejectionService.eject(business.id, { confirmed: false })
        ).rejects.toThrow(EjectionError);

        try {
          await ejectionService.eject(business.id, { confirmed: false });
        } catch (error) {
          expect((error as EjectionError).code).toBe('CONFIRMATION_REQUIRED');
        }
      });

      it('throws error for non-existent business', async () => {
        await expect(
          ejectionService.eject('non-existent-id', { confirmed: true })
        ).rejects.toThrow(EjectionError);

        try {
          await ejectionService.eject('non-existent-id', { confirmed: true });
        } catch (error) {
          expect((error as EjectionError).code).toBe('BUSINESS_NOT_FOUND');
        }
      });
    });

    // Error cases
    describe('Error cases', () => {
      it('handles database errors gracefully', async () => {
        // Create a service with a disconnected client to simulate error
        const disconnectedPrisma = new PrismaClient();
        await disconnectedPrisma.$disconnect();

        const errorService = new EjectionService(disconnectedPrisma);

        await expect(
          errorService.eject('some-id', { confirmed: true })
        ).rejects.toThrow();
      });
    });

    // Edge cases
    describe('Edge cases', () => {
      it('preserves all catalog data (non-destructive)', async () => {
        const { business } = await createTestBusiness('owner@catalog.com', 'Catalog Coffee', 'ACTIVE');
        await addCatalogItems(business.id);

        // Count items before ejection
        const categoriesBefore = await prisma.category.count({ where: { businessId: business.id } });
        const basesBefore = await prisma.base.count({ where: { businessId: business.id } });
        const modifiersBefore = await prisma.modifier.count({ where: { businessId: business.id } });

        await ejectionService.eject(business.id, { confirmed: true });

        // Count items after ejection
        const categoriesAfter = await prisma.category.count({ where: { businessId: business.id } });
        const basesAfter = await prisma.base.count({ where: { businessId: business.id } });
        const modifiersAfter = await prisma.modifier.count({ where: { businessId: business.id } });

        expect(categoriesAfter).toBe(categoriesBefore);
        expect(basesAfter).toBe(basesBefore);
        expect(modifiersAfter).toBe(modifiersBefore);
      });

      it('preserves order history', async () => {
        const { business } = await createTestBusiness('owner@orders.com', 'Orders Coffee', 'ACTIVE');
        await addOrders(business.id, 'COMPLETED');
        await addOrders(business.id, 'COMPLETED');

        const ordersBefore = await prisma.order.count({ where: { businessId: business.id } });

        await ejectionService.eject(business.id, { confirmed: true });

        const ordersAfter = await prisma.order.count({ where: { businessId: business.id } });
        expect(ordersAfter).toBe(ordersBefore);
      });

      it('clears sync status on ejection', async () => {
        const { business } = await createTestBusiness('owner@sync.com', 'Sync Coffee', 'ACTIVE');

        // Set sync status
        await prisma.business.update({
          where: { id: business.id },
          data: {
            syncStatus: 'SUCCESS',
            lastSyncedAt: new Date(),
          },
        });

        await ejectionService.eject(business.id, { confirmed: true });

        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.syncStatus).toBe('IDLE');
      });
    });
  });

  // ===========================================================================
  // STOREFRONT DISABLE
  // ===========================================================================
  describe('isStorefrontAvailable', () => {
    it('returns false for EJECTED business', async () => {
      const { business } = await createTestBusiness('owner@ejected2.com', 'Ejected Coffee 2', 'EJECTED');

      const result = await ejectionService.isStorefrontAvailable(business.id);

      expect(result.available).toBe(false);
      expect(result.reason).toContain('no longer available');
      expect(result.businessName).toBe('Ejected Coffee 2');
    });

    it('returns true for ACTIVE business', async () => {
      const { business } = await createTestBusiness('owner@active2.com', 'Active Coffee 2', 'ACTIVE');

      const result = await ejectionService.isStorefrontAvailable(business.id);

      expect(result.available).toBe(true);
    });

    it('returns false for PAUSED business', async () => {
      const { business } = await createTestBusiness('owner@paused2.com', 'Paused Coffee 2', 'PAUSED');

      const result = await ejectionService.isStorefrontAvailable(business.id);

      expect(result.available).toBe(false);
      expect(result.reason).toContain('temporarily unavailable');
    });

    it('returns false for non-existent business', async () => {
      const result = await ejectionService.isStorefrontAvailable('non-existent-id');

      expect(result.available).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('includes business name in response for context', async () => {
      const { business } = await createTestBusiness('owner@name.com', 'Named Coffee Shop', 'EJECTED');

      const result = await ejectionService.isStorefrontAvailable(business.id);

      expect(result.businessName).toBe('Named Coffee Shop');
    });
  });

  // ===========================================================================
  // START OVER FLOW
  // ===========================================================================
  describe('startOver', () => {
    // Happy path
    describe('Happy path: Reset ejected business to onboarding state', () => {
      it('updates state from EJECTED to ONBOARDING', async () => {
        const { business } = await createTestBusiness('owner@startover.com', 'StartOver Coffee', 'ACTIVE');
        await ejectionService.eject(business.id, { confirmed: true });

        const result = await ejectionService.startOver(business.id, { confirmed: true });

        expect(result.success).toBe(true);
        expect(result.previousState).toBe('EJECTED');
        expect(result.newState).toBe('ONBOARDING');

        // Verify in database
        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.accountState).toBe('ONBOARDING');
      });
    });

    // Success cases
    describe('Success cases', () => {
      it('preserves existing catalog data by default', async () => {
        const { business } = await createTestBusiness('owner@preserve.com', 'Preserve Coffee', 'ACTIVE');
        await addCatalogItems(business.id);
        await ejectionService.eject(business.id, { confirmed: true });

        const categoriesBefore = await prisma.category.count({ where: { businessId: business.id } });

        await ejectionService.startOver(business.id, { confirmed: true });

        const categoriesAfter = await prisma.category.count({ where: { businessId: business.id } });
        expect(categoriesAfter).toBe(categoriesBefore);
      });

      it('clears sync status (will need fresh sync)', async () => {
        const { business } = await createTestBusiness('owner@clearsync.com', 'ClearSync Coffee', 'ACTIVE');
        await prisma.business.update({
          where: { id: business.id },
          data: {
            syncStatus: 'SUCCESS',
            lastSyncedAt: new Date(),
            lastSyncError: null,
          },
        });
        await ejectionService.eject(business.id, { confirmed: true });

        await ejectionService.startOver(business.id, { confirmed: true });

        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.syncStatus).toBe('IDLE');
        expect(updated?.lastSyncedAt).toBeNull();
      });

      it('returns success with redirect to onboarding', async () => {
        const { business } = await createTestBusiness('owner@redirect.com', 'Redirect Coffee', 'ACTIVE');
        await ejectionService.eject(business.id, { confirmed: true });

        const result = await ejectionService.startOver(business.id, { confirmed: true });

        expect(result.success).toBe(true);
        expect(result.redirectTo).toBe('/onboarding');
      });

      it('clears POS connection when clearPOSConnection option is true', async () => {
        const { business } = await createTestBusiness('owner@clearpos.com', 'ClearPOS Coffee', 'ACTIVE');
        await addPOSTokens(business.id);
        await ejectionService.eject(business.id, { confirmed: true });

        await ejectionService.startOver(business.id, {
          confirmed: true,
          clearPOSConnection: true,
        });

        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        expect(updated?.posProvider).toBeNull();
        expect(updated?.posMerchantId).toBeNull();
        expect(updated?.posLocationId).toBeNull();
      });

      it('preserves POS connection info by default', async () => {
        const { business } = await createTestBusiness('owner@keeppos.com', 'KeepPOS Coffee', 'ACTIVE');
        await addPOSTokens(business.id);
        await ejectionService.eject(business.id, { confirmed: true });

        await ejectionService.startOver(business.id, { confirmed: true });

        const updated = await prisma.business.findUnique({ where: { id: business.id } });
        // Merchant/location IDs preserved, but tokens were cleared on ejection
        expect(updated?.posMerchantId).toBe('merchant_123');
        expect(updated?.posLocationId).toBe('location_456');
      });
    });

    // Failure cases
    describe('Failure cases', () => {
      it('cannot start over if not ejected', async () => {
        const { business } = await createTestBusiness('owner@notejected.com', 'NotEjected Coffee', 'ACTIVE');

        await expect(
          ejectionService.startOver(business.id, { confirmed: true })
        ).rejects.toThrow(EjectionError);

        try {
          await ejectionService.startOver(business.id, { confirmed: true });
        } catch (error) {
          expect((error as EjectionError).code).toBe('NOT_EJECTED');
        }
      });

      it('cannot start over without confirmation', async () => {
        const { business } = await createTestBusiness('owner@noconfirm2.com', 'NoConfirm2 Coffee', 'ACTIVE');
        await ejectionService.eject(business.id, { confirmed: true });

        await expect(
          ejectionService.startOver(business.id, { confirmed: false })
        ).rejects.toThrow(EjectionError);

        try {
          await ejectionService.startOver(business.id, { confirmed: false });
        } catch (error) {
          expect((error as EjectionError).code).toBe('CONFIRMATION_REQUIRED');
        }
      });

      it('throws error for non-existent business', async () => {
        await expect(
          ejectionService.startOver('non-existent-id', { confirmed: true })
        ).rejects.toThrow(EjectionError);

        try {
          await ejectionService.startOver('non-existent-id', { confirmed: true });
        } catch (error) {
          expect((error as EjectionError).code).toBe('BUSINESS_NOT_FOUND');
        }
      });
    });

    // Edge cases
    describe('Edge cases', () => {
      it('option to clear catalog data on start over', async () => {
        const { business } = await createTestBusiness('owner@clearcatalog.com', 'ClearCatalog Coffee', 'ACTIVE');
        await addCatalogItems(business.id);
        await ejectionService.eject(business.id, { confirmed: true });

        await ejectionService.startOver(business.id, {
          confirmed: true,
          clearCatalog: true,
        });

        const categories = await prisma.category.count({ where: { businessId: business.id } });
        const bases = await prisma.base.count({ where: { businessId: business.id } });
        const modifiers = await prisma.modifier.count({ where: { businessId: business.id } });

        expect(categories).toBe(0);
        expect(bases).toBe(0);
        expect(modifiers).toBe(0);
      });

      it('handles start over when business has no catalog', async () => {
        const { business } = await createTestBusiness('owner@nocatalog.com', 'NoCatalog Coffee', 'ACTIVE');
        await ejectionService.eject(business.id, { confirmed: true });

        // Should not throw
        const result = await ejectionService.startOver(business.id, { confirmed: true });

        expect(result.success).toBe(true);
      });
    });
  });

  // ===========================================================================
  // PRE-EJECTION CHECK
  // ===========================================================================
  describe('checkEjectionConsequences', () => {
    // Happy path
    describe('Happy path: Return ejection consequences summary', () => {
      it('returns comprehensive consequences summary', async () => {
        const { business } = await createTestBusiness('owner@check.com', 'Check Coffee', 'ACTIVE');
        await addCatalogItems(business.id);
        await addOrders(business.id, 'COMPLETED');

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result).toMatchObject({
          businessId: business.id,
          businessName: 'Check Coffee',
          currentState: 'ACTIVE',
          canEject: true,
          canStartOver: true,
        });
      });
    });

    // Success cases
    describe('Success cases', () => {
      it('returns number of catalog items that will be hidden', async () => {
        const { business } = await createTestBusiness('owner@items.com', 'Items Coffee', 'ACTIVE');
        await addCatalogItems(business.id);

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.catalogItemCount).toBe(1); // 1 base
        expect(result.categoryCount).toBe(1);
        expect(result.modifierCount).toBe(1);
      });

      it('returns number of pending orders (warn if any)', async () => {
        const { business } = await createTestBusiness('owner@pending.com', 'Pending Coffee', 'ACTIVE');
        await addOrders(business.id, 'PENDING');
        await addOrders(business.id, 'PENDING');
        await addOrders(business.id, 'COMPLETED');

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.pendingOrderCount).toBe(2);
        expect(result.hasPendingOrders).toBe(true);
        expect(result.warnings).toContain('You have 2 pending orders that should be resolved before ejecting');
      });

      it('returns subscription status', async () => {
        const { business } = await createTestBusiness('owner@sub.com', 'Sub Coffee', 'ACTIVE');
        await prisma.business.update({
          where: { id: business.id },
          data: { subscriptionStatus: 'sub_12345' },
        });

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.hasActiveSubscription).toBe(true);
        expect(result.warnings).toContain('You have an active subscription that will need to be cancelled');
      });

      it('returns can start over flag', async () => {
        const { business } = await createTestBusiness('owner@canstart.com', 'CanStart Coffee', 'ACTIVE');

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.canStartOver).toBe(true);
      });

      it('returns total order count (history preserved)', async () => {
        const { business } = await createTestBusiness('owner@total.com', 'Total Coffee', 'ACTIVE');
        await addOrders(business.id, 'COMPLETED');
        await addOrders(business.id, 'COMPLETED');
        await addOrders(business.id, 'COMPLETED');

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.totalOrderCount).toBe(3);
      });
    });

    // Edge cases
    describe('Edge cases', () => {
      it('handles business with no catalog', async () => {
        const { business } = await createTestBusiness('owner@nocatalog2.com', 'NoCatalog2 Coffee', 'ACTIVE');

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.catalogItemCount).toBe(0);
        expect(result.categoryCount).toBe(0);
        expect(result.modifierCount).toBe(0);
      });

      it('handles business with no orders', async () => {
        const { business } = await createTestBusiness('owner@noorders.com', 'NoOrders Coffee', 'ACTIVE');

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.totalOrderCount).toBe(0);
        expect(result.pendingOrderCount).toBe(0);
        expect(result.hasPendingOrders).toBe(false);
      });

      it('handles business with active subscription', async () => {
        const { business } = await createTestBusiness('owner@activesub.com', 'ActiveSub Coffee', 'ACTIVE');
        await prisma.business.update({
          where: { id: business.id },
          data: { subscriptionStatus: 'active_subscription_id' },
        });

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.hasActiveSubscription).toBe(true);
      });

      it('returns canEject false for already ejected business', async () => {
        const { business } = await createTestBusiness('owner@alreadyejected.com', 'Already Coffee', 'EJECTED');

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.canEject).toBe(false);
        expect(result.canStartOver).toBe(true);
      });

      it('throws error for non-existent business', async () => {
        await expect(
          ejectionService.checkEjectionConsequences('non-existent-id')
        ).rejects.toThrow(EjectionError);

        try {
          await ejectionService.checkEjectionConsequences('non-existent-id');
        } catch (error) {
          expect((error as EjectionError).code).toBe('BUSINESS_NOT_FOUND');
        }
      });

      it('indicates POS connection will be cleared', async () => {
        const { business } = await createTestBusiness('owner@hapos.com', 'HasPOS Coffee', 'ACTIVE');
        await addPOSTokens(business.id);

        const result = await ejectionService.checkEjectionConsequences(business.id);

        expect(result.hasPOSConnection).toBe(true);
        expect(result.warnings).toContain('Your POS connection tokens will be cleared for security');
      });
    });
  });
});
