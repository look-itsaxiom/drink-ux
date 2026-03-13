import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient, AccountState, SyncStatus } from '../../../generated/prisma';
import { createAccountRouter } from '../account';
import { createAuthRouter } from '../auth';
import { AuthService } from '../../services/AuthService';
import { AccountService } from '../../services/AccountService';
import { SESSION_COOKIE_NAME } from '../../middleware/session';

const prisma = new PrismaClient();
let authService: AuthService;
let accountService: AccountService;

beforeAll(async () => {
  authService = new AuthService(prisma);
  accountService = new AccountService(prisma);
});

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
});

afterAll(async () => {
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
  await prisma.$disconnect();
});

describe('Account Routes', () => {
  let app: Express;
  let sessionToken: string;
  let testBusinessId: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Create auth routes for session middleware
    app.use('/api/auth', createAuthRouter(authService, { disableRateLimit: true }));
    app.use('/api/account', createAccountRouter(authService, accountService));

    // Create test user and get session
    const signup = await authService.signup({
      email: 'test@example.com',
      password: 'SecureP@ss1',
      businessName: 'Test Coffee Shop',
    });

    testBusinessId = signup.business.id;

    // Update business to ACTIVE state
    await prisma.business.update({
      where: { id: testBusinessId },
      data: { accountState: AccountState.ACTIVE },
    });

    const login = await authService.login({
      email: 'test@example.com',
      password: 'SecureP@ss1',
    });

    sessionToken = login.sessionToken;
  });

  // ===========================================================================
  // GET /api/account/profile
  // ===========================================================================
  describe('GET /api/account/profile', () => {
    it('returns profile for authenticated user', async () => {
      const response = await request(app)
        .get('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.profile.name).toBe('Test Coffee Shop');
      expect(response.body.data.profile.slug).toBe('test-coffee-shop');
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/account/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for invalid session token', async () => {
      const response = await request(app)
        .get('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=invalid-token`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('does not expose sensitive fields', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posAccessToken: 'secret-token',
          posRefreshToken: 'secret-refresh',
        },
      });

      const response = await request(app)
        .get('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.body.data.profile.posAccessToken).toBeUndefined();
      expect(response.body.data.profile.posRefreshToken).toBeUndefined();
    });
  });

  // ===========================================================================
  // PUT /api/account/profile
  // ===========================================================================
  describe('PUT /api/account/profile', () => {
    it('updates business name', async () => {
      const response = await request(app)
        .put('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ name: 'Updated Coffee Shop' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.name).toBe('Updated Coffee Shop');
    });

    it('updates contact email', async () => {
      const response = await request(app)
        .put('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ contactEmail: 'contact@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.data.profile.contactEmail).toBe('contact@example.com');
    });

    it('updates contact phone', async () => {
      const response = await request(app)
        .put('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ contactPhone: '+1-555-123-4567' });

      expect(response.status).toBe(200);
      expect(response.body.data.profile.contactPhone).toBe('+1-555-123-4567');
    });

    it('updates multiple fields at once', async () => {
      const response = await request(app)
        .put('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({
          name: 'New Name',
          contactEmail: 'new@example.com',
          contactPhone: '+1-555-999-8888',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.profile.name).toBe('New Name');
      expect(response.body.data.profile.contactEmail).toBe('new@example.com');
      expect(response.body.data.profile.contactPhone).toBe('+1-555-999-8888');
    });

    it('returns 400 for invalid email format', async () => {
      const response = await request(app)
        .put('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ contactEmail: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_EMAIL');
    });

    it('returns 400 for invalid phone format', async () => {
      const response = await request(app)
        .put('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ contactPhone: 'not-a-phone' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PHONE');
    });

    it('returns 400 for empty business name', async () => {
      const response = await request(app)
        .put('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/account/profile')
        .send({ name: 'New Name' });

      expect(response.status).toBe(401);
    });
  });

  // ===========================================================================
  // PUT /api/account/slug
  // ===========================================================================
  describe('PUT /api/account/slug', () => {
    it('updates slug with valid value', async () => {
      const response = await request(app)
        .put('/api/account/slug')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ slug: 'new-slug' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.slug).toBe('new-slug');
    });

    it('normalizes slug to lowercase', async () => {
      const response = await request(app)
        .put('/api/account/slug')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ slug: 'My-NEW-Slug' });

      expect(response.status).toBe(200);
      expect(response.body.data.profile.slug).toBe('my-new-slug');
    });

    it('returns 400 for reserved slug', async () => {
      const response = await request(app)
        .put('/api/account/slug')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ slug: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RESERVED_SLUG');
    });

    it('returns 400 for duplicate slug', async () => {
      // Create another business with a specific slug
      await prisma.user.create({
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

      const response = await request(app)
        .put('/api/account/slug')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ slug: 'taken-slug' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SLUG_TAKEN');
    });

    it('returns 400 for missing slug', async () => {
      const response = await request(app)
        .put('/api/account/slug')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 400 for empty slug', async () => {
      const response = await request(app)
        .put('/api/account/slug')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ slug: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/account/slug')
        .send({ slug: 'new-slug' });

      expect(response.status).toBe(401);
    });
  });

  // ===========================================================================
  // GET /api/account/slug/available
  // ===========================================================================
  describe('GET /api/account/slug/available', () => {
    it('returns available for unique slug', async () => {
      const response = await request(app)
        .get('/api/account/slug/available')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .query({ slug: 'unique-new-slug' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(true);
    });

    it('returns not available for taken slug', async () => {
      const response = await request(app)
        .get('/api/account/slug/available')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .query({ slug: 'test-coffee-shop' }); // Own slug

      expect(response.status).toBe(200);
      expect(response.body.data.available).toBe(false);
    });

    it('returns not available for reserved slug', async () => {
      const response = await request(app)
        .get('/api/account/slug/available')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .query({ slug: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.data.available).toBe(false);
    });

    it('returns 400 for missing slug query', async () => {
      const response = await request(app)
        .get('/api/account/slug/available')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/account/slug/available')
        .query({ slug: 'test-slug' });

      expect(response.status).toBe(401);
    });
  });

  // ===========================================================================
  // GET /api/account/branding
  // ===========================================================================
  describe('GET /api/account/branding', () => {
    it('returns branding for business with theme', async () => {
      // Set up branding first
      await accountService.updateBranding(testBusinessId, {
        primaryColor: '#FF5733',
        secondaryColor: '#33FF57',
        logoUrl: 'https://example.com/logo.png',
      });

      const response = await request(app)
        .get('/api/account/branding')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.branding.primaryColor).toBe('#FF5733');
      expect(response.body.data.branding.secondaryColor).toBe('#33FF57');
      expect(response.body.data.branding.logoUrl).toBe('https://example.com/logo.png');
    });

    it('returns null for business without branding', async () => {
      const response = await request(app)
        .get('/api/account/branding')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.branding).toBeNull();
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/account/branding');

      expect(response.status).toBe(401);
    });
  });

  // ===========================================================================
  // PUT /api/account/branding
  // ===========================================================================
  describe('PUT /api/account/branding', () => {
    it('updates primary color', async () => {
      const response = await request(app)
        .put('/api/account/branding')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ primaryColor: '#FF5733' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.branding.primaryColor).toBe('#FF5733');
    });

    it('updates secondary color', async () => {
      const response = await request(app)
        .put('/api/account/branding')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ secondaryColor: '#33FF57' });

      expect(response.status).toBe(200);
      expect(response.body.data.branding.secondaryColor).toBe('#33FF57');
    });

    it('updates logo URL', async () => {
      const response = await request(app)
        .put('/api/account/branding')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ logoUrl: 'https://example.com/logo.png' });

      expect(response.status).toBe(200);
      expect(response.body.data.branding.logoUrl).toBe('https://example.com/logo.png');
    });

    it('updates multiple fields at once', async () => {
      const response = await request(app)
        .put('/api/account/branding')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({
          primaryColor: '#FF5733',
          secondaryColor: '#33FF57',
          logoUrl: 'https://example.com/logo.png',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.branding.primaryColor).toBe('#FF5733');
      expect(response.body.data.branding.secondaryColor).toBe('#33FF57');
      expect(response.body.data.branding.logoUrl).toBe('https://example.com/logo.png');
    });

    it('returns 400 for invalid hex color', async () => {
      const response = await request(app)
        .put('/api/account/branding')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ primaryColor: 'not-a-color' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_COLOR');
    });

    it('returns 400 for invalid logo URL', async () => {
      const response = await request(app)
        .put('/api/account/branding')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ logoUrl: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_LOGO_URL');
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/account/branding')
        .send({ primaryColor: '#FF5733' });

      expect(response.status).toBe(401);
    });
  });

  // ===========================================================================
  // GET /api/account/pos-status
  // ===========================================================================
  describe('GET /api/account/pos-status', () => {
    it('returns disconnected status for business without POS', async () => {
      const response = await request(app)
        .get('/api/account/pos-status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.posStatus.connected).toBe(false);
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

      const response = await request(app)
        .get('/api/account/pos-status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.posStatus.connected).toBe(true);
      expect(response.body.data.posStatus.provider).toBe('SQUARE');
      expect(response.body.data.posStatus.merchantId).toBe('merchant-123');
      expect(response.body.data.posStatus.locationId).toBe('location-456');
    });

    it('returns sync status information', async () => {
      const lastSync = new Date();
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posMerchantId: 'merchant-123',
          syncStatus: SyncStatus.SUCCESS,
          lastSyncedAt: lastSync,
        },
      });

      const response = await request(app)
        .get('/api/account/pos-status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.posStatus.syncStatus).toBe('SUCCESS');
      expect(new Date(response.body.data.posStatus.lastSyncAt)).toEqual(lastSync);
    });

    it('returns error information for failed sync', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posMerchantId: 'merchant-123',
          syncStatus: SyncStatus.ERROR,
          lastSyncError: 'Connection timeout',
        },
      });

      const response = await request(app)
        .get('/api/account/pos-status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.posStatus.syncStatus).toBe('ERROR');
      expect(response.body.data.posStatus.lastError).toBe('Connection timeout');
    });

    it('does not expose sensitive tokens', async () => {
      await prisma.business.update({
        where: { id: testBusinessId },
        data: {
          posProvider: 'SQUARE',
          posMerchantId: 'merchant-123',
          posAccessToken: 'secret-token',
          posRefreshToken: 'secret-refresh',
        },
      });

      const response = await request(app)
        .get('/api/account/pos-status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.body.data.posStatus.accessToken).toBeUndefined();
      expect(response.body.data.posStatus.refreshToken).toBeUndefined();
      expect(response.body.data.posStatus.posAccessToken).toBeUndefined();
      expect(response.body.data.posStatus.posRefreshToken).toBeUndefined();
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/account/pos-status');

      expect(response.status).toBe(401);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================
  describe('edge cases', () => {
    it('handles user without business gracefully', async () => {
      // Create a user without a business
      const userWithoutBusiness = await prisma.user.create({
        data: {
          email: 'nobusiness@example.com',
          hashedPassword: 'hash',
        },
      });

      // Create a session for this user
      const session = await prisma.session.create({
        data: {
          userId: userWithoutBusiness.id,
          token: 'no-business-token',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const response = await request(app)
        .get('/api/account/profile')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${session.token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_BUSINESS');
    });
  });
});
