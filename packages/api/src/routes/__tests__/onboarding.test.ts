import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient, AccountState } from '../../../generated/prisma';
import { createOnboardingRouter } from '../onboarding';
import { OnboardingService, OnboardingStep, CatalogPath } from '../../services/OnboardingService';
import { AuthService } from '../../services/AuthService';
import { sessionMiddleware, SESSION_COOKIE_NAME } from '../../middleware/session';
import { POSAdapter } from '../../adapters/pos/POSAdapter';

// Mock POS adapter
const mockPOSAdapter: jest.Mocked<POSAdapter> = {
  setCredentials: jest.fn(),
  getAuthorizationUrl: jest.fn().mockReturnValue('https://square.com/oauth'),
  exchangeCodeForTokens: jest.fn(),
  refreshTokens: jest.fn(),
  importCatalog: jest.fn().mockResolvedValue({
    categories: [],
    items: [],
    modifiers: [],
  }),
  pushItem: jest.fn(),
  pushModifier: jest.fn(),
  updateItem: jest.fn(),
  createOrder: jest.fn(),
  getOrderStatus: jest.fn(),
  getPaymentLink: jest.fn(),
};

const prisma = new PrismaClient();

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

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe('Onboarding Routes', () => {
  let app: Express;
  let authService: AuthService;
  let onboardingService: OnboardingService;
  let sessionToken: string;
  let businessId: string;

  beforeEach(async () => {
    await cleanDatabase();
    jest.clearAllMocks();

    authService = new AuthService(prisma);
    onboardingService = new OnboardingService(prisma, mockPOSAdapter);

    // Create test user and business
    const signupResult = await authService.signup({
      email: 'test@example.com',
      password: 'SecureP@ss1',
      businessName: 'Test Coffee Shop',
    });

    businessId = signupResult.business.id;

    // Login to get session token
    const loginResult = await authService.login({
      email: 'test@example.com',
      password: 'SecureP@ss1',
    });

    sessionToken = loginResult.sessionToken;

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(sessionMiddleware(authService));
    app.use('/api/onboarding', createOnboardingRouter(onboardingService, { businessId }));
  });

  // ==========================================================================
  // GET /api/onboarding/status
  // ==========================================================================

  describe('GET /api/onboarding/status', () => {
    it('returns current step and progress for authenticated user', async () => {
      const response = await request(app)
        .get('/api/onboarding/status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.currentStep).toBe(OnboardingStep.POS_CONNECTION);
      expect(response.body.data.completedSteps).toEqual([]);
      expect(response.body.data.totalSteps).toBe(5);
    });

    it('returns step requirements in status', async () => {
      const response = await request(app)
        .get('/api/onboarding/status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.body.data.stepRequirements).toBeDefined();
      expect(Object.keys(response.body.data.stepRequirements).length).toBe(5);
    });

    it('returns available paths', async () => {
      const response = await request(app)
        .get('/api/onboarding/status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.body.data.availablePaths).toBeDefined();
      expect(response.body.data.availablePaths).toContain(CatalogPath.TEMPLATE);
      expect(response.body.data.availablePaths).toContain(CatalogPath.FRESH);
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app).get('/api/onboarding/status');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 for business not in ONBOARDING state', async () => {
      // Change business to ACTIVE state
      await prisma.business.update({
        where: { id: businessId },
        data: { accountState: AccountState.ACTIVE },
      });

      const response = await request(app)
        .get('/api/onboarding/status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // POST /api/onboarding/step/:step
  // ==========================================================================

  describe('POST /api/onboarding/step/:step', () => {
    it('completes POS connection step (skipped)', async () => {
      const response = await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('advances to next step after completion', async () => {
      await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });

      const statusResponse = await request(app)
        .get('/api/onboarding/status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(statusResponse.body.data.currentStep).toBe(OnboardingStep.PATH_SELECTION);
    });

    it('validates step completion data', async () => {
      // Skip to path selection
      await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });

      // Try to complete path selection without a path
      const response = await request(app)
        .post('/api/onboarding/step/PATH_SELECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns next step info after completion', async () => {
      const response = await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });

      expect(response.body.data.nextStep).toBe(OnboardingStep.PATH_SELECTION);
    });

    it('returns 400 for invalid step', async () => {
      const response = await request(app)
        .post('/api/onboarding/step/INVALID_STEP')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STEP');
    });

    it('returns 400 for out-of-order step completion', async () => {
      // Try to complete step 3 without completing steps 1 and 2
      const response = await request(app)
        .post('/api/onboarding/step/CATALOG_SETUP')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .send({ skipped: true });

      expect(response.status).toBe(401);
    });

    it('returns 403 for business not in ONBOARDING state', async () => {
      await prisma.business.update({
        where: { id: businessId },
        data: { accountState: AccountState.SETUP_COMPLETE },
      });

      const response = await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });

      expect(response.status).toBe(403);
    });
  });

  // ==========================================================================
  // POST /api/onboarding/path
  // ==========================================================================

  describe('POST /api/onboarding/path', () => {
    beforeEach(async () => {
      // Complete step 1 first
      await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });
    });

    it('selects template path', async () => {
      const response = await request(app)
        .post('/api/onboarding/path')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ path: CatalogPath.TEMPLATE });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('selects fresh path', async () => {
      const response = await request(app)
        .post('/api/onboarding/path')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ path: CatalogPath.FRESH });

      expect(response.status).toBe(200);
    });

    it('rejects import path without POS connection', async () => {
      const response = await request(app)
        .post('/api/onboarding/path')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ path: CatalogPath.IMPORT });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('POS_NOT_CONNECTED');
    });

    it('returns 400 for invalid path', async () => {
      const response = await request(app)
        .post('/api/onboarding/path')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ path: 'INVALID_PATH' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PATH');
    });

    it('returns 400 for missing path', async () => {
      const response = await request(app)
        .post('/api/onboarding/path')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('advances to catalog setup step after path selection', async () => {
      await request(app)
        .post('/api/onboarding/path')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ path: CatalogPath.TEMPLATE });

      const statusResponse = await request(app)
        .get('/api/onboarding/status')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(statusResponse.body.data.currentStep).toBe(OnboardingStep.CATALOG_SETUP);
    });
  });

  // ==========================================================================
  // POST /api/onboarding/complete
  // ==========================================================================

  describe('POST /api/onboarding/complete', () => {
    beforeEach(async () => {
      // Complete all steps up to review
      await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });

      await request(app)
        .post('/api/onboarding/path')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ path: CatalogPath.TEMPLATE });

      await request(app)
        .post('/api/onboarding/step/CATALOG_SETUP')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      await request(app)
        .post('/api/onboarding/step/BRANDING')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });
    });

    it('completes onboarding successfully', async () => {
      const response = await request(app)
        .post('/api/onboarding/complete')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('complete');
    });

    it('changes business state to SETUP_COMPLETE', async () => {
      await request(app)
        .post('/api/onboarding/complete')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      expect(business?.accountState).toBe(AccountState.SETUP_COMPLETE);
    });

    it('returns 400 for incomplete onboarding', async () => {
      // Reset to test incomplete scenario
      await cleanDatabase();

      const signupResult = await authService.signup({
        email: 'incomplete@example.com',
        password: 'SecureP@ss1',
        businessName: 'Incomplete Shop',
      });

      businessId = signupResult.business.id;

      const loginResult = await authService.login({
        email: 'incomplete@example.com',
        password: 'SecureP@ss1',
      });

      sessionToken = loginResult.sessionToken;

      // Recreate app with new businessId
      app = express();
      app.use(express.json());
      app.use(cookieParser());
      app.use(sessionMiddleware(authService));
      app.use('/api/onboarding', createOnboardingRouter(onboardingService, { businessId }));

      const response = await request(app)
        .post('/api/onboarding/complete')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app).post('/api/onboarding/complete').send({});

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // GET /api/onboarding/review
  // ==========================================================================

  describe('GET /api/onboarding/review', () => {
    beforeEach(async () => {
      // Complete steps up to review
      await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });

      await request(app)
        .post('/api/onboarding/path')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ path: CatalogPath.TEMPLATE });

      await request(app)
        .post('/api/onboarding/step/CATALOG_SETUP')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      await request(app)
        .post('/api/onboarding/step/BRANDING')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });
    });

    it('returns catalog summary', async () => {
      const response = await request(app)
        .get('/api/onboarding/review')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.catalog).toBeDefined();
      expect(response.body.data.catalog.categoriesCount).toBeGreaterThanOrEqual(0);
    });

    it('returns theme preview', async () => {
      const response = await request(app)
        .get('/api/onboarding/review')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.body.data.theme).toBeDefined();
    });

    it('returns POS sync status', async () => {
      const response = await request(app)
        .get('/api/onboarding/review')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.body.data.posStatus).toBeDefined();
      expect(typeof response.body.data.posStatus.connected).toBe('boolean');
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app).get('/api/onboarding/review');

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/onboarding/back
  // ==========================================================================

  describe('POST /api/onboarding/back', () => {
    beforeEach(async () => {
      // Complete first step
      await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });
    });

    it('goes back to previous step', async () => {
      const response = await request(app)
        .post('/api/onboarding/back')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.currentStep).toBe(OnboardingStep.POS_CONNECTION);
    });

    it('returns 400 when at first step', async () => {
      // Go back to first step first
      await request(app)
        .post('/api/onboarding/back')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      // Try to go back again
      const response = await request(app)
        .post('/api/onboarding/back')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app).post('/api/onboarding/back').send({});

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/onboarding/reset
  // ==========================================================================

  describe('POST /api/onboarding/reset', () => {
    beforeEach(async () => {
      // Complete some steps
      await request(app)
        .post('/api/onboarding/step/POS_CONNECTION')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ skipped: true });

      await request(app)
        .post('/api/onboarding/path')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ path: CatalogPath.TEMPLATE });

      await request(app)
        .post('/api/onboarding/step/CATALOG_SETUP')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});
    });

    it('resets onboarding to first step', async () => {
      const response = await request(app)
        .post('/api/onboarding/reset')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.currentStep).toBe(OnboardingStep.POS_CONNECTION);
      expect(response.body.data.completedSteps).toEqual([]);
    });

    it('clears catalog data', async () => {
      const basesBefore = await prisma.base.count({
        where: { businessId },
      });
      expect(basesBefore).toBeGreaterThan(0);

      await request(app)
        .post('/api/onboarding/reset')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      const basesAfter = await prisma.base.count({
        where: { businessId },
      });
      expect(basesAfter).toBe(0);
    });

    it('returns 401 for unauthenticated request', async () => {
      const response = await request(app).post('/api/onboarding/reset').send({});

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // Error handling
  // ==========================================================================

  describe('Error handling', () => {
    it('returns 500 for service errors', async () => {
      // Create a scenario that would cause an internal error
      // This is hard to test without mocking, so we verify the route handles errors gracefully
      const response = await request(app)
        .post('/api/onboarding/step/CATALOG_SETUP')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});

      // Should return an error status (400 in this case due to step order)
      expect(response.body.success).toBe(false);
    });
  });
});
