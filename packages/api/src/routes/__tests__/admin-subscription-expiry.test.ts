/**
 * Tests for POST /api/admin/subscription-expiry
 * Verifies auth protection and sweep trigger behavior.
 */

import request from 'supertest';
import express from 'express';

// Isolated mini-app that replicates the admin endpoint pattern from index.ts
function createTestApp(options: {
  adminApiKey?: string;
  sweepResult?: any;
  sweepError?: Error;
}) {
  const app = express();
  app.use(express.json());

  const mockSweep = options.sweepError
    ? jest.fn().mockRejectedValue(options.sweepError)
    : jest.fn().mockResolvedValue(options.sweepResult ?? { expiredTrials: [], expiredGracePeriods: [], errors: [] });

  // Replicate the guarded endpoint from index.ts
  app.post('/api/admin/subscription-expiry', (req, res, next) => {
    const adminKey = options.adminApiKey;
    if (!adminKey) {
      res.status(503).json({ success: false, error: { code: 'ADMIN_NOT_CONFIGURED', message: 'Admin API key not configured' } });
      return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Valid admin API key required' } });
      return;
    }
    next();
  }, async (_req, res) => {
    try {
      const result = await mockSweep();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: { code: 'EXPIRY_SWEEP_FAILED', message: 'Failed to run expiry sweep' } });
    }
  });

  return { app, mockSweep };
}

describe('POST /api/admin/subscription-expiry', () => {
  it('returns 401 when no authorization header is provided', async () => {
    const { app } = createTestApp({ adminApiKey: 'test-secret' });

    const res = await request(app)
      .post('/api/admin/subscription-expiry')
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when authorization header has wrong key', async () => {
    const { app } = createTestApp({ adminApiKey: 'test-secret' });

    const res = await request(app)
      .post('/api/admin/subscription-expiry')
      .set('Authorization', 'Bearer wrong-key')
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 503 when ADMIN_API_KEY is not configured', async () => {
    const { app } = createTestApp({ adminApiKey: undefined });

    const res = await request(app)
      .post('/api/admin/subscription-expiry')
      .send();

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('ADMIN_NOT_CONFIGURED');
  });

  it('returns 200 with sweep results when authorized', async () => {
    const sweepResult = {
      expiredTrials: ['biz-1'],
      expiredGracePeriods: ['biz-2'],
      errors: [],
    };
    const { app, mockSweep } = createTestApp({ adminApiKey: 'test-secret', sweepResult });

    const res = await request(app)
      .post('/api/admin/subscription-expiry')
      .set('Authorization', 'Bearer test-secret')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(sweepResult);
    expect(mockSweep).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when sweep throws an error', async () => {
    const { app } = createTestApp({
      adminApiKey: 'test-secret',
      sweepError: new Error('DB connection lost'),
    });

    const res = await request(app)
      .post('/api/admin/subscription-expiry')
      .set('Authorization', 'Bearer test-secret')
      .send();

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('EXPIRY_SWEEP_FAILED');
  });
});
