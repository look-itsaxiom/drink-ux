/**
 * Square Adapter Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SquareAdapter } from '../square.adapter';
import { POSCredentials, POSConfig } from '@drink-ux/shared';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('SquareAdapter', () => {
  let adapter: SquareAdapter;
  let mockCredentials: POSCredentials;
  let mockConfig: POSConfig;

  beforeEach(() => {
    mockCredentials = {
      accessToken: 'EAAA_test_sandbox_token',
    };

    mockConfig = {
      locationId: 'test-location-123',
      autoSyncMenu: true,
      syncInterval: 60,
    };

    adapter = new SquareAdapter(mockCredentials, mockConfig);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct provider name', () => {
      expect(adapter.provider).toBe('square');
    });

    it('should use sandbox URL for sandbox tokens', () => {
      const sandboxAdapter = new SquareAdapter(
        { accessToken: 'EAAA_sandbox' },
        mockConfig
      );
      expect(sandboxAdapter.provider).toBe('square');
    });

    it('should use production URL for production tokens', () => {
      const prodAdapter = new SquareAdapter(
        { accessToken: 'sq0atp-production' },
        mockConfig
      );
      expect(prodAdapter.provider).toBe('square');
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ locations: [{ id: '1', name: 'Test Location' }] }),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.testConnection();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/locations'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer EAAA_test_sandbox_token',
          }),
        })
      );
    });

    it('should return false when connection fails', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({ errors: [{ code: 'UNAUTHORIZED' }] }),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when no locations are returned', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ locations: [] }),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('validateCredentials', () => {
    it('should return false when access token is missing', async () => {
      const noTokenAdapter = new SquareAdapter({}, mockConfig);
      const result = await noTokenAdapter.validateCredentials();

      expect(result).toBe(false);
    });

    it('should return true when credentials are valid', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ locations: [{ id: '1', name: 'Test Location' }] }),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.validateCredentials();

      expect(result).toBe(true);
    });
  });

  describe('getLocation', () => {
    it('should fetch and return location information', async () => {
      const mockLocation = {
        id: 'test-location-123',
        name: 'Test Coffee Shop',
        address: {
          address_line_1: '123 Main St',
          locality: 'Springfield',
          administrative_district_level_1: 'IL',
        },
        timezone: 'America/Chicago',
        status: 'ACTIVE',
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ location: mockLocation }),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.getLocation('test-location-123');

      expect(result).toEqual({
        id: 'test-location-123',
        name: 'Test Coffee Shop',
        address: '123 Main St, Springfield, IL',
        timezone: 'America/Chicago',
        status: 'active',
      });
    });

    it('should handle location with inactive status', async () => {
      const mockLocation = {
        id: 'test-location-123',
        name: 'Inactive Location',
        status: 'INACTIVE',
      };

      const mockResponse = {
        ok: true,
        json: async () => ({ location: mockLocation }),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.getLocation('test-location-123');

      expect(result.status).toBe('inactive');
    });
  });

  describe('fetchMenu', () => {
    it('should fetch and convert Square catalog to POSProducts', async () => {
      const mockCatalogResponse = {
        objects: [
          {
            id: 'item-1',
            type: 'ITEM',
            item_data: {
              name: 'Latte',
              description: 'Classic espresso with milk',
              category_id: 'cat-1',
              variations: [
                {
                  id: 'var-1',
                  item_variation_data: {
                    name: 'Small',
                    price_money: { amount: 450, currency: 'USD' },
                    item_id: 'item-1',
                  },
                },
                {
                  id: 'var-2',
                  item_variation_data: {
                    name: 'Large',
                    price_money: { amount: 550, currency: 'USD' },
                    item_id: 'item-1',
                  },
                },
              ],
              modifier_list_info: [
                {
                  modifier_list_id: 'mod-list-1',
                  enabled: true,
                },
              ],
            },
          },
          {
            id: 'cat-1',
            type: 'CATEGORY',
            category_data: {
              name: 'Espresso Drinks',
            },
          },
          {
            id: 'mod-list-1',
            type: 'MODIFIER_LIST',
            modifier_list_data: {
              name: 'Milk Options',
              selection_type: 'SINGLE',
              modifiers: [
                {
                  id: 'mod-1',
                  modifier_data: {
                    name: 'Whole Milk',
                    price_money: { amount: 0, currency: 'USD' },
                  },
                },
              ],
            },
          },
          {
            id: 'mod-1',
            type: 'MODIFIER',
            modifier_data: {
              name: 'Whole Milk',
              price_money: { amount: 0, currency: 'USD' },
            },
          },
        ],
      };

      const mockResponse = {
        ok: true,
        json: async () => mockCatalogResponse,
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.fetchMenu();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'item-1',
        name: 'Latte',
        description: 'Classic espresso with milk',
        category: 'Espresso Drinks',
        basePrice: 4.5,
        available: true,
        variations: [
          { id: 'var-1', name: 'Small', price: 4.5, available: true },
          { id: 'var-2', name: 'Large', price: 5.5, available: true },
        ],
        modifiers: [
          {
            id: 'mod-list-1',
            name: 'Milk Options',
            selectionType: 'single',
            modifiers: [
              { id: 'mod-1', name: 'Whole Milk', price: 0, available: true },
            ],
          },
        ],
      });
    });

    it('should handle empty catalog', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({}),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.fetchMenu();

      expect(result).toEqual([]);
    });

    it('should handle items without modifiers', async () => {
      const mockCatalogResponse = {
        objects: [
          {
            id: 'item-1',
            type: 'ITEM',
            item_data: {
              name: 'Simple Coffee',
              variations: [
                {
                  id: 'var-1',
                  item_variation_data: {
                    name: 'Regular',
                    price_money: { amount: 300, currency: 'USD' },
                    item_id: 'item-1',
                  },
                },
              ],
            },
          },
        ],
      };

      const mockResponse = {
        ok: true,
        json: async () => mockCatalogResponse,
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.fetchMenu();

      expect(result).toHaveLength(1);
      expect(result[0].modifiers).toBeUndefined();
    });
  });

  describe('submitOrder', () => {
    it('should submit order to Square Orders API', async () => {
      const mockOrder = {
        locationId: 'test-location-123',
        lineItems: [
          {
            catalogItemId: 'item-1',
            quantity: 2,
            variationId: 'var-1',
            modifiers: [
              {
                catalogItemId: 'mod-1',
                quantity: 1,
              },
            ],
          },
        ],
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          order: {
            id: 'order-123',
          },
        }),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.submitOrder(mockOrder);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v2/orders'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test-location-123'),
        })
      );
    });

    it('should handle order submission failure', async () => {
      const mockOrder = {
        locationId: 'test-location-123',
        lineItems: [
          {
            catalogItemId: 'item-1',
            quantity: 1,
          },
        ],
      };

      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({ errors: [{ code: 'INVALID_REQUEST' }] }),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      const result = await adapter.submitOrder(mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use config location ID when order location is not provided', async () => {
      const mockOrder = {
        locationId: '', // Empty location ID
        lineItems: [
          {
            catalogItemId: 'item-1',
            quantity: 1,
          },
        ],
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          order: {
            id: 'order-123',
          },
        }),
      };
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as Response);

      await adapter.submitOrder(mockOrder);

      const callBody = JSON.parse((global.fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as string);
      expect(callBody.order.location_id).toBe('test-location-123');
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const config = adapter.getConfig();

      expect(config).toEqual(mockConfig);
      expect(config).not.toBe(mockConfig); // Should be a copy
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      adapter.updateConfig({ syncInterval: 120 });

      const config = adapter.getConfig();
      expect(config.syncInterval).toBe(120);
      expect(config.locationId).toBe('test-location-123'); // Other fields preserved
    });
  });
});
