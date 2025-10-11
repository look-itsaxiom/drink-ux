/**
 * POS Integration Manager Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { POSIntegrationManager, posIntegrationManager } from '../posIntegration.manager';
import { POSIntegration, POSProvider, POSOrder } from '@drink-ux/shared';
import { POSAdapterFactory } from '../../pos-adapters/factory';

// Mock the adapter factory
jest.mock('../../pos-adapters/factory', () => {
  let mockAdapterInstance: any;
  
  return {
    POSAdapterFactory: {
      getSupportedProviders: jest.fn(() => ['square', 'toast', 'clover']),
      isProviderSupported: jest.fn((provider: string) => ['square', 'toast', 'clover'].includes(provider)),
    },
    posAdapterFactory: {
      createAdapter: jest.fn(() => {
        if (!mockAdapterInstance) {
          mockAdapterInstance = {
            provider: 'square',
            testConnection: jest.fn(),
            fetchMenu: jest.fn(),
            submitOrder: jest.fn(),
            getLocation: jest.fn(),
            validateCredentials: jest.fn(),
          };
        }
        return mockAdapterInstance;
      }),
    },
    __getMockAdapter: () => mockAdapterInstance,
    __resetMockAdapter: () => { mockAdapterInstance = null; },
  };
});

import { posAdapterFactory } from '../../pos-adapters/factory';

describe('POSIntegrationManager', () => {
  let manager: POSIntegrationManager;
  let mockIntegration: POSIntegration;
  let mockAdapter: any;

  beforeEach(() => {
    manager = new POSIntegrationManager();
    
    mockIntegration = {
      id: 'test-integration-1',
      businessId: 'business-1',
      provider: POSProvider.SQUARE,
      credentials: {
        accessToken: 'test-token',
      },
      config: {
        locationId: 'test-location',
        autoSyncMenu: true,
        syncInterval: 60,
      },
      isActive: true,
    };

    // Get the mock adapter instance
    const mockModule = require('../../pos-adapters/factory');
    mockModule.__resetMockAdapter();
    mockAdapter = (posAdapterFactory.createAdapter as jest.MockedFunction<any>)();
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockAdapter.testConnection.mockResolvedValue(true);
      mockAdapter.getLocation.mockResolvedValue({
        id: 'test-location',
        name: 'Test Coffee Shop',
        status: 'active',
      });

      const result = await manager.testConnection(mockIntegration);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('square');
      expect(result.locationName).toBe('Test Coffee Shop');
      expect(posAdapterFactory.createAdapter).toHaveBeenCalledWith(
        'square',
        mockIntegration.credentials,
        mockIntegration.config
      );
    });

    it('should handle connection failure', async () => {
      mockAdapter.testConnection.mockResolvedValue(false);

      const result = await manager.testConnection(mockIntegration);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle adapter creation errors', async () => {
      const originalImpl = (posAdapterFactory.createAdapter as jest.MockedFunction<any>).getMockImplementation();
      
      (posAdapterFactory.createAdapter as jest.MockedFunction<any>).mockImplementation(() => {
        throw new Error('Invalid provider');
      });

      const result = await manager.testConnection(mockIntegration);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid provider');

      // Restore original implementation
      if (originalImpl) {
        (posAdapterFactory.createAdapter as jest.MockedFunction<any>).mockImplementation(originalImpl);
      }
    });

    it('should handle missing location ID gracefully', async () => {
      mockAdapter.testConnection.mockResolvedValue(true);
      const integrationWithoutLocation = {
        ...mockIntegration,
        config: { ...mockIntegration.config, locationId: undefined },
      };

      const result = await manager.testConnection(integrationWithoutLocation);

      expect(result.success).toBe(true);
      expect(result.locationId).toBeUndefined();
    });
  });

  describe('validateCredentials', () => {
    it('should validate credentials successfully', async () => {
      mockAdapter.validateCredentials.mockResolvedValue(true);

      const result = await manager.validateCredentials(
        'square',
        mockIntegration.credentials,
        mockIntegration.config
      );

      expect(result).toBe(true);
      expect(mockAdapter.validateCredentials).toHaveBeenCalled();
    });

    it('should return false for invalid credentials', async () => {
      mockAdapter.validateCredentials.mockResolvedValue(false);

      const result = await manager.validateCredentials(
        'square',
        mockIntegration.credentials,
        mockIntegration.config
      );

      expect(result).toBe(false);
    });

    it('should handle validation errors', async () => {
      mockAdapter.validateCredentials.mockRejectedValue(new Error('Network error'));

      const result = await manager.validateCredentials(
        'square',
        mockIntegration.credentials,
        mockIntegration.config
      );

      expect(result).toBe(false);
    });
  });

  describe('syncMenu', () => {
    it('should sync menu successfully', async () => {
      const mockProducts = [
        {
          id: 'item-1',
          name: 'Latte',
          basePrice: 4.5,
          available: true,
        },
        {
          id: 'item-2',
          name: 'Cappuccino',
          basePrice: 4.25,
          available: true,
        },
      ];

      mockAdapter.fetchMenu.mockResolvedValue(mockProducts);

      const result = await manager.syncMenu(mockIntegration);

      expect(result.success).toBe(true);
      expect(result.productsCount).toBe(2);
      expect(result.products).toEqual(mockProducts);
      expect(mockAdapter.fetchMenu).toHaveBeenCalled();
    });

    it('should fail when integration is not active', async () => {
      const inactiveIntegration = { ...mockIntegration, isActive: false };

      const result = await manager.syncMenu(inactiveIntegration);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
      expect(mockAdapter.fetchMenu).not.toHaveBeenCalled();
    });

    it('should handle menu fetch errors', async () => {
      mockAdapter.fetchMenu.mockRejectedValue(new Error('API error'));

      const result = await manager.syncMenu(mockIntegration);

      expect(result.success).toBe(false);
      expect(result.productsCount).toBe(0);
      expect(result.error).toContain('API error');
    });

    it('should handle empty menu', async () => {
      mockAdapter.fetchMenu.mockResolvedValue([]);

      const result = await manager.syncMenu(mockIntegration);

      expect(result.success).toBe(true);
      expect(result.productsCount).toBe(0);
      expect(result.products).toEqual([]);
    });
  });

  describe('submitOrder', () => {
    it('should submit order successfully', async () => {
      const mockOrder: POSOrder = {
        locationId: 'test-location',
        lineItems: [
          {
            catalogItemId: 'item-1',
            quantity: 2,
          },
        ],
      };

      mockAdapter.submitOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      const result = await manager.submitOrder(mockIntegration, mockOrder);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(mockAdapter.submitOrder).toHaveBeenCalledWith(mockOrder);
    });

    it('should fail when integration is not active', async () => {
      const inactiveIntegration = { ...mockIntegration, isActive: false };
      const mockOrder: POSOrder = {
        locationId: 'test-location',
        lineItems: [],
      };

      const result = await manager.submitOrder(inactiveIntegration, mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
      expect(mockAdapter.submitOrder).not.toHaveBeenCalled();
    });

    it('should use integration location ID when order location is missing', async () => {
      const mockOrder: POSOrder = {
        locationId: '',
        lineItems: [
          {
            catalogItemId: 'item-1',
            quantity: 1,
          },
        ],
      };

      mockAdapter.submitOrder.mockResolvedValue({
        success: true,
        orderId: 'order-123',
      });

      await manager.submitOrder(mockIntegration, mockOrder);

      expect(mockOrder.locationId).toBe('test-location');
    });

    it('should fail when no location ID is available', async () => {
      const integrationWithoutLocation = {
        ...mockIntegration,
        config: { ...mockIntegration.config, locationId: undefined },
      };
      const mockOrder: POSOrder = {
        locationId: '',
        lineItems: [],
      };

      const result = await manager.submitOrder(integrationWithoutLocation, mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Location ID is required');
    });

    it('should handle order submission errors', async () => {
      const mockOrder: POSOrder = {
        locationId: 'test-location',
        lineItems: [],
      };

      mockAdapter.submitOrder.mockRejectedValue(new Error('Submission failed'));

      const result = await manager.submitOrder(mockIntegration, mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Submission failed');
    });
  });

  describe('getLocationInfo', () => {
    it('should get location information', async () => {
      const mockLocation = {
        id: 'test-location',
        name: 'Test Coffee Shop',
        address: '123 Main St',
        timezone: 'America/Chicago',
        status: 'active' as const,
      };

      mockAdapter.getLocation.mockResolvedValue(mockLocation);

      const result = await manager.getLocationInfo(mockIntegration);

      expect(result).toEqual(mockLocation);
      expect(mockAdapter.getLocation).toHaveBeenCalledWith('test-location');
    });

    it('should use provided location ID', async () => {
      const mockLocation = {
        id: 'other-location',
        name: 'Other Location',
        status: 'active' as const,
      };

      mockAdapter.getLocation.mockResolvedValue(mockLocation);

      await manager.getLocationInfo(mockIntegration, 'other-location');

      expect(mockAdapter.getLocation).toHaveBeenCalledWith('other-location');
    });

    it('should throw error when no location ID is available', async () => {
      const integrationWithoutLocation = {
        ...mockIntegration,
        config: { ...mockIntegration.config, locationId: undefined },
      };

      await expect(
        manager.getLocationInfo(integrationWithoutLocation)
      ).rejects.toThrow('Location ID is required');
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = manager.getSupportedProviders();

      expect(providers).toContain('square');
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('isProviderSupported', () => {
    it('should return true for supported provider', () => {
      expect(manager.isProviderSupported('square')).toBe(true);
    });

    it('should return false for unsupported provider', () => {
      expect(manager.isProviderSupported('unsupported')).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(posIntegrationManager).toBeInstanceOf(POSIntegrationManager);
    });
  });
});
