import request from 'supertest';
import express, { Express } from 'express';
import { posRouter } from '../pos';

// Mock environment variables
const mockEnv = {
  SQUARE_APP_ID: 'test-app-id',
  SQUARE_APP_SECRET: 'test-app-secret',
  SQUARE_ENVIRONMENT: 'sandbox',
  POS_OAUTH_CALLBACK_URL: 'http://localhost:3001/api/pos/oauth/callback',
};

describe('POS Routes', () => {
  let app: Express;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
    Object.assign(process.env, mockEnv);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/pos', posRouter);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/pos/oauth/authorize', () => {
    // Happy path
    it('returns authorization URL with state parameter', async () => {
      const response = await request(app)
        .get('/api/pos/oauth/authorize')
        .query({ businessId: 'biz-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authorizationUrl).toContain('https://connect.squareupsandbox.com/oauth2/authorize');
      expect(response.body.data.authorizationUrl).toContain('client_id=test-app-id');
      expect(response.body.data.state).toBeDefined();
    });

    it('includes businessId in state for later retrieval', async () => {
      const response = await request(app)
        .get('/api/pos/oauth/authorize')
        .query({ businessId: 'biz-456' });

      expect(response.status).toBe(200);
      // State should encode the businessId
      const state = response.body.data.state;
      expect(state).toContain('biz-456');
    });

    // Failure scenarios
    it('returns error when businessId is missing', async () => {
      const response = await request(app)
        .get('/api/pos/oauth/authorize');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('businessId');
    });
  });

  describe('GET /api/pos/oauth/callback', () => {
    // OAuth callback now redirects to admin frontend instead of returning JSON

    // Happy path - token exchange succeeds but business lookup fails since no real business exists
    // This tests the redirect behavior on token exchange errors (business not found in DB)
    it('exchanges code for tokens and redirects with error when business not found', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: '2026-02-13T00:00:00Z',
        merchant_id: 'merchant-123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const response = await request(app)
        .get('/api/pos/oauth/callback')
        .query({
          code: 'auth-code-123',
          state: 'biz-123',
        });

      // Redirects with error because 'biz-123' doesn't exist in test DB
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('pos_error=');
    });

    it('calls Square token endpoint with correct parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: '2026-02-13T00:00:00Z',
          merchant_id: 'merchant',
        }),
      });

      await request(app)
        .get('/api/pos/oauth/callback')
        .query({
          code: 'test-code',
          state: 'biz-123',
        });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.squareupsandbox.com/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test-code'),
        })
      );
    });

    // Failure scenarios - all redirect with pos_error query param
    it('redirects with error when code is missing', async () => {
      const response = await request(app)
        .get('/api/pos/oauth/callback')
        .query({ state: 'biz-123' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('pos_error=missing_code');
    });

    it('redirects with error when state is missing', async () => {
      const response = await request(app)
        .get('/api/pos/oauth/callback')
        .query({ code: 'auth-code' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('pos_error=missing_state');
    });

    it('redirects with error when Square OAuth fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'The authorization code has expired',
        }),
      });

      const response = await request(app)
        .get('/api/pos/oauth/callback')
        .query({
          code: 'expired-code',
          state: 'biz-123',
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('pos_error=');
    });

    // Error handling
    it('redirects with error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .get('/api/pos/oauth/callback')
        .query({
          code: 'code',
          state: 'biz-123',
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('pos_error=');
    });

    // Edge cases
    it('redirects with error when Square user denies access', async () => {
      const response = await request(app)
        .get('/api/pos/oauth/callback')
        .query({
          error: 'access_denied',
          error_description: 'The user denied the request',
          state: 'biz-123',
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('pos_error=');
      expect(response.headers.location).toContain('denied');
    });
  });

  describe('GET /api/pos/providers', () => {
    it('returns list of supported POS providers', async () => {
      const response = await request(app)
        .get('/api/pos/providers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.providers).toContain('SQUARE');
    });
  });
});
