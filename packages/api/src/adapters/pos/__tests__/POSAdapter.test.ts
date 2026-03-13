import { getAdapter, POSAdapter } from '../index';
import { POSProvider } from '@drink-ux/shared';

describe('POSAdapter Factory', () => {
  describe('getAdapter', () => {
    // Happy path
    it('returns an adapter instance for SQUARE provider', () => {
      const adapter = getAdapter(POSProvider.SQUARE);

      expect(adapter).toBeDefined();
      expect(typeof adapter.getAuthorizationUrl).toBe('function');
      expect(typeof adapter.exchangeCodeForTokens).toBe('function');
      expect(typeof adapter.refreshTokens).toBe('function');
      expect(typeof adapter.importCatalog).toBe('function');
      expect(typeof adapter.pushItem).toBe('function');
      expect(typeof adapter.pushModifier).toBe('function');
      expect(typeof adapter.updateItem).toBe('function');
      expect(typeof adapter.createOrder).toBe('function');
      expect(typeof adapter.getOrderStatus).toBe('function');
      expect(typeof adapter.getPaymentLink).toBe('function');
    });

    // Error scenarios
    it('throws error for unsupported provider', () => {
      expect(() => getAdapter('UNKNOWN' as POSProvider)).toThrow('Unsupported POS provider');
    });

    it('throws error for TOAST provider (not yet implemented)', () => {
      expect(() => getAdapter(POSProvider.TOAST)).toThrow('TOAST adapter not yet implemented');
    });

    it('throws error for CLOVER provider (not yet implemented)', () => {
      expect(() => getAdapter(POSProvider.CLOVER)).toThrow('CLOVER adapter not yet implemented');
    });
  });
});

describe('POSAdapter Interface Contract', () => {
  let adapter: POSAdapter;

  beforeEach(() => {
    adapter = getAdapter(POSProvider.SQUARE);
  });

  // Verify interface methods exist and are callable
  it('has getAuthorizationUrl method that accepts state string', () => {
    const url = adapter.getAuthorizationUrl('test-state');
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });

  it('has setCredentials method for setting access tokens', () => {
    expect(typeof adapter.setCredentials).toBe('function');
    // Should not throw
    adapter.setCredentials({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      merchantId: 'test-merchant',
      locationId: 'test-location',
      expiresAt: new Date(),
    });
  });
});
