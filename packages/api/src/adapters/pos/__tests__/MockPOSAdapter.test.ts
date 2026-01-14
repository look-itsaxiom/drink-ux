import { OrderStatus } from '@drink-ux/shared';
import { MockPOSAdapter } from '../MockPOSAdapter';
import { RawCatalogData, TokenResult } from '../POSAdapter';

describe('MockPOSAdapter', () => {
  let adapter: MockPOSAdapter;

  beforeEach(() => {
    adapter = new MockPOSAdapter();
  });

  describe('OAuth methods', () => {
    // Happy path
    it('returns a mock authorization URL', () => {
      const url = adapter.getAuthorizationUrl('test-state');

      expect(url).toContain('mock://oauth');
      expect(url).toContain('state=test-state');
    });

    it('exchanges code for mock tokens', async () => {
      const result = await adapter.exchangeCodeForTokens('test-code');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.merchantId).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('refreshes tokens', async () => {
      const result = await adapter.refreshTokens('old-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    // Configurable responses
    it('allows configuring token exchange response', async () => {
      const customTokens: TokenResult = {
        accessToken: 'custom-access',
        refreshToken: 'custom-refresh',
        merchantId: 'custom-merchant',
        expiresAt: new Date('2030-01-01'),
      };
      adapter.setTokenResponse(customTokens);

      const result = await adapter.exchangeCodeForTokens('any-code');

      expect(result).toEqual(customTokens);
    });

    // Error simulation
    it('can simulate OAuth errors', async () => {
      adapter.setError('exchangeCodeForTokens', new Error('OAuth failed'));

      await expect(adapter.exchangeCodeForTokens('code')).rejects.toThrow('OAuth failed');
    });
  });

  describe('Catalog methods', () => {
    // Happy path
    it('imports mock catalog data', async () => {
      const catalog = await adapter.importCatalog();

      expect(catalog.items).toBeInstanceOf(Array);
      expect(catalog.modifiers).toBeInstanceOf(Array);
      expect(catalog.categories).toBeInstanceOf(Array);
    });

    it('pushes item and returns mock ID', async () => {
      const posItemId = await adapter.pushItem({
        name: 'Latte',
        price: 500,
      });

      expect(posItemId).toBeDefined();
      expect(typeof posItemId).toBe('string');
    });

    it('pushes modifier and returns mock ID', async () => {
      const posModifierId = await adapter.pushModifier({
        name: 'Vanilla Syrup',
        price: 75,
      });

      expect(posModifierId).toBeDefined();
      expect(typeof posModifierId).toBe('string');
    });

    it('updates item without error', async () => {
      await expect(
        adapter.updateItem('pos-item-123', { name: 'Updated Latte', price: 550 })
      ).resolves.not.toThrow();
    });

    // Configurable responses
    it('allows configuring catalog response', async () => {
      const customCatalog: RawCatalogData = {
        items: [{ id: 'custom-1', name: 'Custom Item' }],
        modifiers: [],
        categories: [{ id: 'cat-1', name: 'Custom Category' }],
      };
      adapter.setCatalogResponse(customCatalog);

      const result = await adapter.importCatalog();

      expect(result).toEqual(customCatalog);
    });

    it('allows configuring push item response', async () => {
      adapter.setPushItemResponse('custom-pos-id-123');

      const result = await adapter.pushItem({ name: 'Test', price: 100 });

      expect(result).toBe('custom-pos-id-123');
    });

    // Error simulation
    it('can simulate catalog import errors', async () => {
      adapter.setError('importCatalog', new Error('Rate limit exceeded'));

      await expect(adapter.importCatalog()).rejects.toThrow('Rate limit exceeded');
    });

    it('can simulate push item errors', async () => {
      adapter.setError('pushItem', new Error('Invalid item data'));

      await expect(adapter.pushItem({ name: 'Test', price: 100 })).rejects.toThrow('Invalid item data');
    });
  });

  describe('Call tracking', () => {
    it('tracks method calls', async () => {
      adapter.getAuthorizationUrl('state-1');
      adapter.getAuthorizationUrl('state-2');
      await adapter.exchangeCodeForTokens('code-1');

      expect(adapter.getCalls('getAuthorizationUrl')).toHaveLength(2);
      expect(adapter.getCalls('getAuthorizationUrl')[0]).toEqual(['state-1']);
      expect(adapter.getCalls('exchangeCodeForTokens')).toHaveLength(1);
    });

    it('can verify specific calls were made', () => {
      adapter.getAuthorizationUrl('expected-state');

      expect(adapter.wasCalledWith('getAuthorizationUrl', 'expected-state')).toBe(true);
      expect(adapter.wasCalledWith('getAuthorizationUrl', 'different-state')).toBe(false);
    });

    it('can reset call history', async () => {
      await adapter.importCatalog();
      adapter.reset();

      expect(adapter.getCalls('importCatalog')).toHaveLength(0);
    });
  });

  describe('Stubbed methods', () => {
    it('createOrder throws not implemented', async () => {
      await expect(adapter.createOrder({
        items: [],
        customerName: 'Test',
      })).rejects.toThrow('Not yet implemented');
    });

    it('getOrderStatus throws not implemented', async () => {
      await expect(adapter.getOrderStatus('order-123')).rejects.toThrow('Not yet implemented');
    });

    it('getPaymentLink throws not implemented', async () => {
      await expect(adapter.getPaymentLink('order-123')).rejects.toThrow('Not yet implemented');
    });
  });
});
