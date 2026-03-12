import { SquareAdapter } from '../SquareAdapter';

// Mock environment variables
const mockEnv = {
  SQUARE_APP_ID: 'test-app-id',
  SQUARE_APPLICATION_ID: 'test-app-id',
  SQUARE_APP_SECRET: 'test-app-secret',
  SQUARE_APPLICATION_SECRET: 'test-app-secret',
  SQUARE_ENVIRONMENT: 'sandbox',
  POS_OAUTH_CALLBACK_URL: 'http://localhost:3001/api/pos/oauth/callback',
};

describe('SquareAdapter OAuth', () => {
  let adapter: SquareAdapter;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
    Object.assign(process.env, mockEnv);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    adapter = new SquareAdapter();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    // Happy path
    it('returns a valid Square OAuth URL for sandbox', () => {
      const url = adapter.getAuthorizationUrl('test-state-123');

      expect(url).toContain('https://connect.squareupsandbox.com/oauth2/authorize');
      expect(url).toContain('client_id=test-app-id');
      expect(url).toContain('state=test-state-123');
    });

    it('includes required OAuth scopes', () => {
      const url = adapter.getAuthorizationUrl('test-state');

      expect(url).toContain('MERCHANT_PROFILE_READ');
      expect(url).toContain('ITEMS_READ');
      expect(url).toContain('ITEMS_WRITE');
      expect(url).toContain('ORDERS_READ');
      expect(url).toContain('ORDERS_WRITE');
    });

    // Success scenarios
    it('encodes state parameter correctly', () => {
      const url = adapter.getAuthorizationUrl('state with spaces & symbols');

      expect(url).toContain('state=state+with+spaces+%26+symbols');
    });

    // Edge cases
    it('handles empty state string', () => {
      const url = adapter.getAuthorizationUrl('');

      expect(url).toContain('state=');
      expect(url).toContain('client_id=test-app-id');
    });
  });

  describe('exchangeCodeForTokens', () => {
    // Happy path
    it('exchanges authorization code for tokens', async () => {
      const mockResponse = {
        access_token: 'EAAAl2SyjUquuXyK9JWaLePixqriPqqo38Y1d6Zepaeusi3rndKQBZxeC1cCt4Ab',
        refresh_token: 'REFRESH_TOKEN_123',
        expires_at: '2026-02-13T00:00:00Z',
        merchant_id: 'MERCHANT_ID_456',
        token_type: 'bearer',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.exchangeCodeForTokens('AUTH_CODE_789');

      expect(result.accessToken).toBe(mockResponse.access_token);
      expect(result.refreshToken).toBe(mockResponse.refresh_token);
      expect(result.merchantId).toBe(mockResponse.merchant_id);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('sends correct request to Square API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: '2026-02-13T00:00:00Z',
          merchant_id: 'merchant',
        }),
      });

      await adapter.exchangeCodeForTokens('AUTH_CODE');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.squareupsandbox.com/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('AUTH_CODE'),
        })
      );

      // Verify body contains required fields
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.client_id).toBe('test-app-id');
      expect(body.client_secret).toBe('test-app-secret');
      expect(body.code).toBe('AUTH_CODE');
      expect(body.grant_type).toBe('authorization_code');
    });

    // Failure scenarios
    it('throws error when Square returns error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'The authorization code has expired',
        }),
      });

      await expect(adapter.exchangeCodeForTokens('EXPIRED_CODE'))
        .rejects.toThrow('The authorization code has expired');
    });

    it('throws error when Square returns invalid response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // Missing required fields
      });

      await expect(adapter.exchangeCodeForTokens('CODE'))
        .rejects.toThrow('Invalid token response from Square');
    });

    // Error scenarios
    it('throws error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.exchangeCodeForTokens('CODE'))
        .rejects.toThrow('Network error');
    });

    // Edge cases
    it('handles tokens with special characters', async () => {
      const mockResponse = {
        access_token: 'token/with+special=chars',
        refresh_token: 'refresh/token+special',
        expires_at: '2026-02-13T00:00:00Z',
        merchant_id: 'merchant',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.exchangeCodeForTokens('CODE');

      expect(result.accessToken).toBe('token/with+special=chars');
    });
  });

  describe('refreshTokens', () => {
    // Happy path
    it('refreshes tokens using refresh token', async () => {
      const mockResponse = {
        access_token: 'NEW_ACCESS_TOKEN',
        refresh_token: 'NEW_REFRESH_TOKEN',
        expires_at: '2026-03-13T00:00:00Z',
        merchant_id: 'MERCHANT_ID',
        token_type: 'bearer',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.refreshTokens('OLD_REFRESH_TOKEN');

      expect(result.accessToken).toBe('NEW_ACCESS_TOKEN');
      expect(result.refreshToken).toBe('NEW_REFRESH_TOKEN');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('sends correct refresh request to Square API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: '2026-02-13T00:00:00Z',
          merchant_id: 'merchant',
        }),
      });

      await adapter.refreshTokens('REFRESH_TOKEN');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.squareupsandbox.com/oauth2/token',
        expect.objectContaining({
          method: 'POST',
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.client_id).toBe('test-app-id');
      expect(body.refresh_token).toBe('REFRESH_TOKEN');
      expect(body.grant_type).toBe('refresh_token');
    });

    // Failure scenarios
    it('throws error when refresh token is invalid', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'The refresh token is invalid or expired',
        }),
      });

      await expect(adapter.refreshTokens('INVALID_TOKEN'))
        .rejects.toThrow('The refresh token is invalid or expired');
    });

    // Error scenarios
    it('throws error on rate limit', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: 'rate_limited',
          error_description: 'Too many requests',
        }),
      });

      await expect(adapter.refreshTokens('TOKEN'))
        .rejects.toThrow('Too many requests');
    });
  });
});
