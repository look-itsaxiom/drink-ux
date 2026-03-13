import { SquareAdapter } from '../SquareAdapter';

// Mock environment variables
const mockEnv = {
  SQUARE_APP_ID: 'test-app-id',
  SQUARE_APP_SECRET: 'test-app-secret',
  SQUARE_ENVIRONMENT: 'sandbox',
  POS_OAUTH_CALLBACK_URL: 'http://localhost:3001/api/pos/oauth/callback',
};

describe('SquareAdapter push methods', () => {
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
    adapter.setCredentials({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      merchantId: 'test-merchant-id',
      locationId: 'test-location-id',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('pushItem', () => {
    // Happy path
    it('creates an item in Square catalog and returns posItemId', async () => {
      const mockResponse = {
        catalog_object: {
          type: 'ITEM',
          id: 'SQUARE_ITEM_123',
          item_data: {
            name: 'Latte',
            variations: [
              { id: 'VAR_123' },
            ],
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const posItemId = await adapter.pushItem({
        name: 'Latte',
        price: 500,
        description: 'Espresso with steamed milk',
      });

      expect(posItemId).toBe('SQUARE_ITEM_123');
    });

    it('sends correct request to Square Catalog API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          catalog_object: { id: 'ITEM_123' },
        }),
      });

      await adapter.pushItem({
        name: 'Cappuccino',
        price: 550,
        description: 'Equal parts espresso, steamed milk, and foam',
        categoryId: 'CAT_123',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.squareupsandbox.com/v2/catalog/object',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          }),
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.object.type).toBe('ITEM');
      expect(body.object.item_data.name).toBe('Cappuccino');
      expect(body.object.item_data.description).toBe('Equal parts espresso, steamed milk, and foam');
      expect(body.object.item_data.category_id).toBe('CAT_123');
    });

    it('creates item with variations from price', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          catalog_object: { id: 'ITEM_123' },
        }),
      });

      await adapter.pushItem({
        name: 'Mocha',
        price: 600,
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.object.item_data.variations).toBeDefined();
      expect(body.object.item_data.variations[0].item_variation_data.price_money.amount).toBe(600);
      expect(body.object.item_data.variations[0].item_variation_data.price_money.currency).toBe('USD');
    });

    // Success scenarios
    it('creates item with multiple variations', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          catalog_object: { id: 'ITEM_123' },
        }),
      });

      await adapter.pushItem({
        name: 'Latte',
        price: 500,
        variations: [
          { name: 'Small', price: 450 },
          { name: 'Medium', price: 500 },
          { name: 'Large', price: 550 },
        ],
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.object.item_data.variations).toHaveLength(3);
      expect(body.object.item_data.variations[0].item_variation_data.name).toBe('Small');
      expect(body.object.item_data.variations[2].item_variation_data.price_money.amount).toBe(550);
    });

    // Failure scenarios
    it('throws error when not authenticated', async () => {
      const unauthAdapter = new SquareAdapter();

      await expect(unauthAdapter.pushItem({ name: 'Test', price: 100 }))
        .rejects.toThrow('Not authenticated');
    });

    it('throws error on Square API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          errors: [
            { code: 'INVALID_VALUE', detail: 'Invalid item data' },
          ],
        }),
      });

      await expect(adapter.pushItem({ name: 'Test', price: 100 }))
        .rejects.toThrow('Invalid item data');
    });

    // Error scenarios
    it('throws error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.pushItem({ name: 'Test', price: 100 }))
        .rejects.toThrow('Network error');
    });
  });

  describe('pushModifier', () => {
    // Happy path
    it('creates a modifier in Square catalog and returns posModifierId', async () => {
      const mockResponse = {
        catalog_object: {
          type: 'MODIFIER_LIST',
          id: 'MOD_LIST_123',
          modifier_list_data: {
            modifiers: [
              { id: 'MOD_123' },
            ],
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const posModifierId = await adapter.pushModifier({
        name: 'Oat Milk',
        price: 75,
      });

      expect(posModifierId).toBe('MOD_LIST_123');
    });

    it('sends correct request for modifier creation', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          catalog_object: { id: 'MOD_LIST_123' },
        }),
      });

      await adapter.pushModifier({
        name: 'Vanilla Syrup',
        price: 75,
        modifierListName: 'Syrups',
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.object.type).toBe('MODIFIER_LIST');
      expect(body.object.modifier_list_data.name).toBe('Syrups');
      expect(body.object.modifier_list_data.modifiers[0].modifier_data.name).toBe('Vanilla Syrup');
      expect(body.object.modifier_list_data.modifiers[0].modifier_data.price_money.amount).toBe(75);
    });

    // Success scenarios
    it('uses modifier name as list name when not provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          catalog_object: { id: 'MOD_LIST_123' },
        }),
      });

      await adapter.pushModifier({
        name: 'Extra Shot',
        price: 100,
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.object.modifier_list_data.name).toBe('Extra Shot');
    });

    // Failure scenarios
    it('throws error when not authenticated', async () => {
      const unauthAdapter = new SquareAdapter();

      await expect(unauthAdapter.pushModifier({ name: 'Test', price: 50 }))
        .rejects.toThrow('Not authenticated');
    });

    it('throws error on Square API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          errors: [
            { code: 'INVALID_VALUE', detail: 'Invalid modifier data' },
          ],
        }),
      });

      await expect(adapter.pushModifier({ name: 'Test', price: 50 }))
        .rejects.toThrow('Invalid modifier data');
    });
  });

  describe('updateItem', () => {
    // Happy path
    it('updates an existing item in Square catalog', async () => {
      // First call to get current version
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          object: {
            id: 'ITEM_123',
            version: 1234567890,
            item_data: {
              name: 'Old Name',
            },
          },
        }),
      });

      // Second call to update
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          catalog_object: { id: 'ITEM_123' },
        }),
      });

      await expect(adapter.updateItem('ITEM_123', {
        name: 'Updated Latte',
        price: 550,
      })).resolves.not.toThrow();
    });

    it('fetches current version before updating', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            object: { id: 'ITEM_123', version: 123 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            catalog_object: { id: 'ITEM_123' },
          }),
        });

      await adapter.updateItem('ITEM_123', { name: 'Updated', price: 500 });

      // First call should be GET to fetch current version
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        'https://connect.squareupsandbox.com/v2/catalog/object/ITEM_123',
        expect.objectContaining({ method: 'GET' })
      );

      // Second call should be POST to update
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        'https://connect.squareupsandbox.com/v2/catalog/object',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('includes version in update request', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            object: { id: 'ITEM_123', version: 9999 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            catalog_object: { id: 'ITEM_123' },
          }),
        });

      await adapter.updateItem('ITEM_123', { name: 'Updated', price: 500 });

      const updateCall = (global.fetch as jest.Mock).mock.calls[1];
      const body = JSON.parse(updateCall[1].body);
      expect(body.object.version).toBe(9999);
    });

    // Failure scenarios
    it('throws error when not authenticated', async () => {
      const unauthAdapter = new SquareAdapter();

      await expect(unauthAdapter.updateItem('ITEM_123', { name: 'Test', price: 100 }))
        .rejects.toThrow('Not authenticated');
    });

    it('throws error when item not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          errors: [
            { code: 'NOT_FOUND', detail: 'Catalog object not found' },
          ],
        }),
      });

      await expect(adapter.updateItem('NONEXISTENT', { name: 'Test', price: 100 }))
        .rejects.toThrow('Catalog object not found');
    });

    // Edge cases
    it('handles version conflict (optimistic locking)', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            object: { id: 'ITEM_123', version: 123 },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: () => Promise.resolve({
            errors: [
              { code: 'VERSION_MISMATCH', detail: 'Object has been modified' },
            ],
          }),
        });

      await expect(adapter.updateItem('ITEM_123', { name: 'Test', price: 100 }))
        .rejects.toThrow('Object has been modified');
    });
  });
});
