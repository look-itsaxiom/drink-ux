import { PrismaClient, AccountState, SyncStatus } from '../../../generated/prisma';
import { AccountService, AccountError } from '../AccountService';
import { AuthService } from '../AuthService';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database before tests
  await prisma.$transaction([
    prisma.syncHistory.deleteMany(),
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
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AccountService', () => {
  let accountService: AccountService;
  let authService: AuthService;
  let testBusinessId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Clean database before each test
    await prisma.$transaction([
      prisma.syncHistory.deleteMany(),
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

    accountService = new AccountService(prisma);
    authService = new AuthService(prisma);

    // Create a test user and business
    const result = await authService.signup({
      email: 'test@example.com',
      password: 'SecureP@ss1',
      businessName: 'Test Coffee Shop',
    });

    testBusinessId = result.business.id;
    testUserId = result.user.id;

    // Update business to ACTIVE state for testing
    await prisma.business.update({
      where: { id: testBusinessId },
      data: { accountState: AccountState.ACTIVE },
    });
  });

  // ===========================================================================
  // PROFILE MANAGEMENT
  // ===========================================================================
  describe('getProfile', () => {
    it('returns business profile for valid business', async () => {
      const profile = await accountService.getProfile(testBusinessId);

      expect(profile).toBeDefined();
      expect(profile.name).toBe('Test Coffee Shop');
      expect(profile.slug).toBe('test-coffee-shop');
    });

    it('throws error for non-existent business', async () => {
      await expect(
        accountService.getProfile('non-existent-id')
      ).rejects.toThrow(AccountError);

      try {
        await accountService.getProfile('non-existent-id');
      } catch (error) {
        expect((error as AccountError).code).toBe('BUSINESS_NOT_FOUND');
      }
    });
  });

  describe('updateProfile', () => {
    it('updates business name', async () => {
      const result = await accountService.updateProfile(testBusinessId, {
        name: 'Updated Coffee Shop',
      });

      expect(result.name).toBe('Updated Coffee Shop');

      // Verify in database
      const business = await prisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(business?.name).toBe('Updated Coffee Shop');
    });

    it('updates contact email', async () => {
      const result = await accountService.updateProfile(testBusinessId, {
        contactEmail: 'contact@example.com',
      });

      expect(result.contactEmail).toBe('contact@example.com');
    });

    it('updates contact phone', async () => {
      const result = await accountService.updateProfile(testBusinessId, {
        contactPhone: '+1-555-123-4567',
      });

      expect(result.contactPhone).toBe('+1-555-123-4567');
    });

    it('updates multiple fields at once', async () => {
      const result = await accountService.updateProfile(testBusinessId, {
        name: 'New Name',
        contactEmail: 'new@example.com',
        contactPhone: '+1-555-999-8888',
      });

      expect(result.name).toBe('New Name');
      expect(result.contactEmail).toBe('new@example.com');
      expect(result.contactPhone).toBe('+1-555-999-8888');
    });

    it('validates email format', async () => {
      await expect(
        accountService.updateProfile(testBusinessId, {
          contactEmail: 'invalid-email',
        })
      ).rejects.toThrow(AccountError);

      try {
        await accountService.updateProfile(testBusinessId, {
          contactEmail: 'not-an-email',
        });
      } catch (error) {
        expect((error as AccountError).code).toBe('INVALID_EMAIL');
      }
    });

    it('accepts valid email formats', async () => {
      const result = await accountService.updateProfile(testBusinessId, {
        contactEmail: 'valid.email+tag@example.co.uk',
      });
      expect(result.contactEmail).toBe('valid.email+tag@example.co.uk');
    });

    it('validates phone format', async () => {
      await expect(
        accountService.updateProfile(testBusinessId, {
          contactPhone: 'not-a-phone',
        })
      ).rejects.toThrow(AccountError);

      try {
        await accountService.updateProfile(testBusinessId, {
          contactPhone: 'abc123',
        });
      } catch (error) {
        expect((error as AccountError).code).toBe('INVALID_PHONE');
      }
    });

    it('accepts valid phone formats', async () => {
      // Various valid phone formats
      const validPhones = [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555-123-4567',
        '5551234567',
        '+15551234567',
      ];

      for (const phone of validPhones) {
        const result = await accountService.updateProfile(testBusinessId, {
          contactPhone: phone,
        });
        expect(result.contactPhone).toBe(phone);
      }
    });

    it('rejects empty business name', async () => {
      await expect(
        accountService.updateProfile(testBusinessId, {
          name: '',
        })
      ).rejects.toThrow(AccountError);

      try {
        await accountService.updateProfile(testBusinessId, {
          name: '   ',
        });
      } catch (error) {
        expect((error as AccountError).code).toBe('INVALID_NAME');
      }
    });

    it('trims whitespace from name', async () => {
      const result = await accountService.updateProfile(testBusinessId, {
        name: '  Trimmed Name  ',
      });
      expect(result.name).toBe('Trimmed Name');
    });

    it('throws error for non-existent business', async () => {
      await expect(
        accountService.updateProfile('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow(AccountError);

      try {
        await accountService.updateProfile('non-existent-id', { name: 'New Name' });
      } catch (error) {
        expect((error as AccountError).code).toBe('BUSINESS_NOT_FOUND');
      }
    });

    it('allows clearing optional fields', async () => {
      // First set values
      await accountService.updateProfile(testBusinessId, {
        contactEmail: 'test@example.com',
        contactPhone: '+1-555-123-4567',
      });

      // Then clear them
      const result = await accountService.updateProfile(testBusinessId, {
        contactEmail: null,
        contactPhone: null,
      });

      expect(result.contactEmail).toBeNull();
      expect(result.contactPhone).toBeNull();
    });
  });

  // ===========================================================================
  // SLUG MANAGEMENT
  // ===========================================================================
  describe('updateSlug', () => {
    it('updates slug with valid value', async () => {
      const result = await accountService.updateSlug(testBusinessId, 'new-slug');

      expect(result.slug).toBe('new-slug');

      // Verify in database
      const business = await prisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(business?.slug).toBe('new-slug');
    });

    it('normalizes slug to lowercase', async () => {
      const result = await accountService.updateSlug(testBusinessId, 'My-New-SLUG');
      expect(result.slug).toBe('my-new-slug');
    });

    it('replaces invalid characters with hyphens', async () => {
      const result = await accountService.updateSlug(testBusinessId, 'My Coffee Shop!');
      expect(result.slug).toBe('my-coffee-shop');
    });

    it('collapses multiple hyphens', async () => {
      const result = await accountService.updateSlug(testBusinessId, 'my---slug');
      expect(result.slug).toBe('my-slug');
    });

    it('trims leading/trailing hyphens', async () => {
      const result = await accountService.updateSlug(testBusinessId, '-my-slug-');
      expect(result.slug).toBe('my-slug');
    });

    it('rejects duplicate slug', async () => {
      // Create another business with a specific slug
      const anotherUser = await prisma.user.create({
        data: {
          email: 'another@example.com',
          hashedPassword: 'hash',
          businesses: {
            create: {
              name: 'Another Shop',
              slug: 'taken-slug',
            },
          },
        },
      });

      await expect(
        accountService.updateSlug(testBusinessId, 'taken-slug')
      ).rejects.toThrow(AccountError);

      try {
        await accountService.updateSlug(testBusinessId, 'taken-slug');
      } catch (error) {
        expect((error as AccountError).code).toBe('SLUG_TAKEN');
      }
    });

    it('rejects reserved slugs', async () => {
      const reservedSlugs = ['admin', 'api', 'www', 'app', 'dashboard', 'login', 'signup'];

      for (const slug of reservedSlugs) {
        await expect(
          accountService.updateSlug(testBusinessId, slug)
        ).rejects.toThrow(AccountError);

        try {
          await accountService.updateSlug(testBusinessId, slug);
        } catch (error) {
          expect((error as AccountError).code).toBe('RESERVED_SLUG');
        }
      }
    });

    it('allows case variations of reserved slugs to be rejected', async () => {
      await expect(
        accountService.updateSlug(testBusinessId, 'ADMIN')
      ).rejects.toThrow(AccountError);

      await expect(
        accountService.updateSlug(testBusinessId, 'Admin')
      ).rejects.toThrow(AccountError);
    });

    it('rejects empty slug', async () => {
      await expect(
        accountService.updateSlug(testBusinessId, '')
      ).rejects.toThrow(AccountError);

      try {
        await accountService.updateSlug(testBusinessId, '');
      } catch (error) {
        expect((error as AccountError).code).toBe('INVALID_SLUG');
      }
    });

    it('rejects slug that is only special characters', async () => {
      await expect(
        accountService.updateSlug(testBusinessId, '!!!@@@###')
      ).rejects.toThrow(AccountError);
    });

    it('rejects slug shorter than minimum length', async () => {
      await expect(
        accountService.updateSlug(testBusinessId, 'ab')
      ).rejects.toThrow(AccountError);

      try {
        await accountService.updateSlug(testBusinessId, 'ab');
      } catch (error) {
        expect((error as AccountError).code).toBe('INVALID_SLUG');
      }
    });

    it('rejects slug longer than maximum length', async () => {
      const longSlug = 'a'.repeat(65); // 65 characters

      await expect(
        accountService.updateSlug(testBusinessId, longSlug)
      ).rejects.toThrow(AccountError);

      try {
        await accountService.updateSlug(testBusinessId, longSlug);
      } catch (error) {
        expect((error as AccountError).code).toBe('INVALID_SLUG');
      }
    });

    it('allows updating to same slug (no-op)', async () => {
      const result = await accountService.updateSlug(testBusinessId, 'test-coffee-shop');
      expect(result.slug).toBe('test-coffee-shop');
    });

    it('validates slug availability', async () => {
      const isAvailable = await accountService.isSlugAvailable('available-slug');
      expect(isAvailable).toBe(true);

      const isTaken = await accountService.isSlugAvailable('test-coffee-shop');
      expect(isTaken).toBe(false);
    });

    it('returns false for reserved slugs in availability check', async () => {
      const isAvailable = await accountService.isSlugAvailable('admin');
      expect(isAvailable).toBe(false);
    });
  });

  // ===========================================================================
  // THEME / BRANDING
  // ===========================================================================
  describe('updateBranding', () => {
    it('updates primary color', async () => {
      const result = await accountService.updateBranding(testBusinessId, {
        primaryColor: '#FF5733',
      });

      expect(result.theme?.primaryColor).toBe('#FF5733');
    });

    it('updates secondary color', async () => {
      const result = await accountService.updateBranding(testBusinessId, {
        secondaryColor: '#33FF57',
      });

      expect(result.theme?.secondaryColor).toBe('#33FF57');
    });

    it('updates logo URL', async () => {
      const result = await accountService.updateBranding(testBusinessId, {
        logoUrl: 'https://example.com/logo.png',
      });

      expect(result.theme?.logoUrl).toBe('https://example.com/logo.png');
    });

    it('updates multiple branding fields at once', async () => {
      const result = await accountService.updateBranding(testBusinessId, {
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
        logoUrl: 'https://example.com/logo.png',
      });

      expect(result.theme?.primaryColor).toBe('#FF5733');
      expect(result.theme?.secondaryColor).toBe('#33FF57');
      expect(result.theme?.logoUrl).toBe('https://example.com/logo.png');
    });

    it('validates hex color format - rejects invalid', async () => {
      const invalidColors = [
        'red',
        '#GGG',
        '#GGGGGG',
        '123456',
        '#12345',
        '#1234567',
        'rgb(255,0,0)',
      ];

      for (const color of invalidColors) {
        await expect(
          accountService.updateBranding(testBusinessId, {
            primaryColor: color,
          })
        ).rejects.toThrow(AccountError);
      }
    });

    it('validates hex color format - accepts valid', async () => {
      const validColors = [
        '#FFF',
        '#fff',
        '#FFFFFF',
        '#ffffff',
        '#AbCdEf',
        '#123456',
      ];

      for (const color of validColors) {
        const result = await accountService.updateBranding(testBusinessId, {
          primaryColor: color,
        });
        expect(result.theme?.primaryColor).toBe(color);
      }
    });

    it('validates logo URL format', async () => {
      await expect(
        accountService.updateBranding(testBusinessId, {
          logoUrl: 'not-a-url',
        })
      ).rejects.toThrow(AccountError);

      try {
        await accountService.updateBranding(testBusinessId, {
          logoUrl: 'ftp://invalid.com/logo.png',
        });
      } catch (error) {
        expect((error as AccountError).code).toBe('INVALID_LOGO_URL');
      }
    });

    it('accepts valid logo URL formats', async () => {
      const validUrls = [
        'https://example.com/logo.png',
        'http://example.com/logo.jpg',
        'https://cdn.example.com/images/logo-v2.svg',
      ];

      for (const url of validUrls) {
        const result = await accountService.updateBranding(testBusinessId, {
          logoUrl: url,
        });
        expect(result.theme?.logoUrl).toBe(url);
      }
    });

    it('preserves existing branding when updating partial fields', async () => {
      // Set initial branding
      await accountService.updateBranding(testBusinessId, {
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
        logoUrl: 'https://example.com/logo.png',
      });

      // Update only one field
      const result = await accountService.updateBranding(testBusinessId, {
        primaryColor: '#000000',
      });

      expect(result.theme?.primaryColor).toBe('#000000');
      expect(result.theme?.secondaryColor).toBe('#33FF57');
      expect(result.theme?.logoUrl).toBe('https://example.com/logo.png');
    });

    it('allows clearing logo URL', async () => {
      // Set initial branding
      await accountService.updateBranding(testBusinessId, {
        logoUrl: 'https://example.com/logo.png',
      });

      // Clear logo
      const result = await accountService.updateBranding(testBusinessId, {
        logoUrl: null,
      });

      expect(result.theme?.logoUrl).toBeUndefined();
    });

    it('throws error for non-existent business', async () => {
      await expect(
        accountService.updateBranding('non-existent-id', { primaryColor: '#FF5733' })
      ).rejects.toThrow(AccountError);
    });
  });

  describe('getBranding', () => {
    it('returns current branding', async () => {
      await accountService.updateBranding(testBusinessId, {
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
      });

      const branding = await accountService.getBranding(testBusinessId);

      expect(branding?.primaryColor).toBe('#FF5733');
      expect(branding?.secondaryColor).toBe('#33FF57');
    });

    it('returns null for business with no branding', async () => {
      const branding = await accountService.getBranding(testBusinessId);
      expect(branding).toBeNull();
    });

    it('throws error for non-existent business', async () => {
      await expect(
        accountService.getBranding('non-existent-id')
      ).rejects.toThrow(AccountError);
    });
  });

  // ===========================================================================
  // POS CONNECTION STATUS
  // ===========================================================================
  describe('getPOSStatus', () => {
    it('returns disconnected status for business without POS', async () => {
      const status = await accountService.getPOSStatus(testBusinessId);

      expect(status.connected).toBe(false);
      expect(status.provider).toBeUndefined();
      expect(status.lastSyncAt).toBeUndefined();
    });

    it('returns connected status for business with POS', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posMerchantId: 'merchant-123',
          posLocationId: 'location-456',
          posAccessToken: 'encrypted-token',
        },
      });

      const status = await accountService.getPOSStatus(testBusinessId);

      expect(status.connected).toBe(true);
      expect(status.provider).toBe('SQUARE');
      expect(status.merchantId).toBe('merchant-123');
      expect(status.locationId).toBe('location-456');
    });

    it('returns last sync time', async () => {
      const lastSync = new Date();
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posMerchantId: 'merchant-123',
          posLastSyncAt: lastSync,
          lastSyncedAt: lastSync,
        },
      });

      const status = await accountService.getPOSStatus(testBusinessId);

      expect(status.lastSyncAt).toEqual(lastSync);
    });

    it('returns sync status', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posMerchantId: 'merchant-123',
          syncStatus: SyncStatus.SUCCESS,
        },
      });

      const status = await accountService.getPOSStatus(testBusinessId);

      expect(status.syncStatus).toBe('SUCCESS');
    });

    it('returns last sync error if present', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posMerchantId: 'merchant-123',
          syncStatus: SyncStatus.ERROR,
          lastSyncError: 'Connection timeout',
        },
      });

      const status = await accountService.getPOSStatus(testBusinessId);

      expect(status.syncStatus).toBe('ERROR');
      expect(status.lastError).toBe('Connection timeout');
    });

    it('throws error for non-existent business', async () => {
      await expect(
        accountService.getPOSStatus('non-existent-id')
      ).rejects.toThrow(AccountError);

      try {
        await accountService.getPOSStatus('non-existent-id');
      } catch (error) {
        expect((error as AccountError).code).toBe('BUSINESS_NOT_FOUND');
      }
    });

    it('does not expose sensitive POS tokens', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posMerchantId: 'merchant-123',
          posAccessToken: 'secret-token',
          posRefreshToken: 'secret-refresh-token',
        },
      });

      const status = await accountService.getPOSStatus(testBusinessId);

      expect((status as any).accessToken).toBeUndefined();
      expect((status as any).refreshToken).toBeUndefined();
      expect((status as any).posAccessToken).toBeUndefined();
      expect((status as any).posRefreshToken).toBeUndefined();
    });
  });

  // ===========================================================================
  // GET BUSINESS FOR USER
  // ===========================================================================
  describe('getBusinessForUser', () => {
    it('returns business for valid user', async () => {
      const business = await accountService.getBusinessForUser(testUserId);

      expect(business).toBeDefined();
      expect(business?.id).toBe(testBusinessId);
      expect(business?.name).toBe('Test Coffee Shop');
    });

    it('returns null for user without business', async () => {
      // Create a user without a business
      const user = await prisma.user.create({
        data: {
          email: 'nobusiness@example.com',
          hashedPassword: 'hash',
        },
      });

      const business = await accountService.getBusinessForUser(user.id);
      expect(business).toBeNull();
    });

    it('returns null for non-existent user', async () => {
      const business = await accountService.getBusinessForUser('non-existent-id');
      expect(business).toBeNull();
    });
  });
});
