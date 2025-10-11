/**
 * POS Adapter Factory Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { POSAdapterFactory, posAdapterFactory } from '../factory';
import { SquareAdapter } from '../square.adapter';
import { POSCredentials, POSConfig, BasePOSAdapter, IPOSAdapter } from '@drink-ux/shared';

// Mock test adapter for testing registration
class MockTestAdapter extends BasePOSAdapter {
  readonly provider = 'test';

  async testConnection(): Promise<boolean> {
    return true;
  }

  async fetchMenu(): Promise<any[]> {
    return [];
  }

  async submitOrder(): Promise<any> {
    return { success: true };
  }

  async getLocation(): Promise<any> {
    return { id: 'test', name: 'Test', status: 'active' };
  }

  async validateCredentials(): Promise<boolean> {
    return true;
  }
}

describe('POSAdapterFactory', () => {
  let factory: POSAdapterFactory;
  let mockCredentials: POSCredentials;
  let mockConfig: POSConfig;

  beforeEach(() => {
    factory = new POSAdapterFactory();
    mockCredentials = {
      accessToken: 'test-token',
    };
    mockConfig = {
      locationId: 'test-location',
    };
  });

  afterEach(() => {
    // Clean up any test adapters registered during tests
    POSAdapterFactory.unregisterAdapter('test');
  });

  describe('createAdapter', () => {
    it('should create Square adapter', () => {
      const adapter = factory.createAdapter('square', mockCredentials, mockConfig);

      expect(adapter).toBeInstanceOf(SquareAdapter);
      expect(adapter.provider).toBe('square');
    });

    it('should create adapter with case-insensitive provider name', () => {
      const adapter = factory.createAdapter('SQUARE', mockCredentials, mockConfig);

      expect(adapter).toBeInstanceOf(SquareAdapter);
      expect(adapter.provider).toBe('square');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        factory.createAdapter('unsupported', mockCredentials, mockConfig);
      }).toThrow('Unsupported POS provider');
    });

    it('should include supported providers list in error message', () => {
      expect(() => {
        factory.createAdapter('invalid', mockCredentials, mockConfig);
      }).toThrow('Supported providers');
    });
  });

  describe('registerAdapter', () => {
    it('should register a new adapter', () => {
      POSAdapterFactory.registerAdapter('test', MockTestAdapter);

      const adapter = factory.createAdapter('test', mockCredentials, mockConfig);
      expect(adapter).toBeInstanceOf(MockTestAdapter);
      expect(adapter.provider).toBe('test');
    });

    it('should allow overriding existing adapter', () => {
      // Register test adapter
      POSAdapterFactory.registerAdapter('test', MockTestAdapter);
      
      // Create a different implementation
      class AlternativeTestAdapter extends BasePOSAdapter {
        readonly provider = 'test-alternative';
        
        async testConnection(): Promise<boolean> { return false; }
        async fetchMenu(): Promise<any[]> { return []; }
        async submitOrder(): Promise<any> { return { success: false }; }
        async getLocation(): Promise<any> { return { id: 'alt', name: 'Alt', status: 'inactive' }; }
        async validateCredentials(): Promise<boolean> { return false; }
      }

      // Override with alternative
      POSAdapterFactory.registerAdapter('test', AlternativeTestAdapter);

      const adapter = factory.createAdapter('test', mockCredentials, mockConfig);
      expect(adapter).toBeInstanceOf(AlternativeTestAdapter);
    });
  });

  describe('unregisterAdapter', () => {
    it('should unregister an adapter', () => {
      POSAdapterFactory.registerAdapter('test', MockTestAdapter);
      POSAdapterFactory.unregisterAdapter('test');

      expect(() => {
        factory.createAdapter('test', mockCredentials, mockConfig);
      }).toThrow('Unsupported POS provider');
    });

    it('should not throw error when unregistering non-existent adapter', () => {
      expect(() => {
        POSAdapterFactory.unregisterAdapter('non-existent');
      }).not.toThrow();
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = POSAdapterFactory.getSupportedProviders();

      expect(providers).toContain('square');
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should include newly registered providers', () => {
      POSAdapterFactory.registerAdapter('test', MockTestAdapter);

      const providers = POSAdapterFactory.getSupportedProviders();
      expect(providers).toContain('test');
      expect(providers).toContain('square');
    });
  });

  describe('isProviderSupported', () => {
    it('should return true for supported provider', () => {
      expect(POSAdapterFactory.isProviderSupported('square')).toBe(true);
    });

    it('should return false for unsupported provider', () => {
      expect(POSAdapterFactory.isProviderSupported('unsupported')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(POSAdapterFactory.isProviderSupported('SQUARE')).toBe(true);
      expect(POSAdapterFactory.isProviderSupported('Square')).toBe(true);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(posAdapterFactory).toBeInstanceOf(POSAdapterFactory);
    });

    it('should create adapters using singleton', () => {
      const adapter = posAdapterFactory.createAdapter('square', mockCredentials, mockConfig);
      expect(adapter).toBeInstanceOf(SquareAdapter);
    });
  });
});
