import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3001';

test.describe('API smoke tests', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeTruthy();
  });

  test('example endpoint returns success response', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/example`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
