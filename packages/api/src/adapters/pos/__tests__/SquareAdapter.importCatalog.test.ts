import { SquareAdapter } from '../SquareAdapter';

// Mock environment variables
const mockEnv = {
  SQUARE_APP_ID: 'test-app-id',
  SQUARE_APP_SECRET: 'test-app-secret',
  SQUARE_ENVIRONMENT: 'sandbox',
  POS_OAUTH_CALLBACK_URL: 'http://localhost:3001/api/pos/oauth/callback',
};

describe('SquareAdapter importCatalog', () => {
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Happy path', () => {
    it('imports catalog with items, modifiers, and categories', async () => {
      const mockSquareResponse = {
        objects: [
          {
            type: 'CATEGORY',
            id: 'CAT_123',
            category_data: {
              name: 'Coffee',
              ordinal: 1,
            },
          },
          {
            type: 'ITEM',
            id: 'ITEM_456',
            item_data: {
              name: 'Latte',
              description: 'Espresso with steamed milk',
              category_id: 'CAT_123',
              variations: [
                {
                  id: 'VAR_789',
                  item_variation_data: {
                    name: 'Small',
                    price_money: { amount: 450, currency: 'USD' },
                  },
                },
                {
                  id: 'VAR_790',
                  item_variation_data: {
                    name: 'Large',
                    price_money: { amount: 550, currency: 'USD' },
                  },
                },
              ],
              modifier_list_info: [
                { modifier_list_id: 'MOD_LIST_1' },
              ],
            },
          },
          {
            type: 'MODIFIER_LIST',
            id: 'MOD_LIST_1',
            modifier_list_data: {
              name: 'Milk Options',
              modifiers: [
                {
                  id: 'MOD_1',
                  modifier_data: {
                    name: 'Oat Milk',
                    price_money: { amount: 75, currency: 'USD' },
                  },
                },
                {
                  id: 'MOD_2',
                  modifier_data: {
                    name: 'Almond Milk',
                    price_money: { amount: 75, currency: 'USD' },
                  },
                },
              ],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSquareResponse),
      });

      const result = await adapter.importCatalog();

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0]).toEqual({
        id: 'CAT_123',
        name: 'Coffee',
        ordinal: 1,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'ITEM_456',
        name: 'Latte',
        description: 'Espresso with steamed milk',
        categoryId: 'CAT_123',
      });
      expect(result.items[0].variations).toHaveLength(2);
      expect(result.items[0].variations![0]).toEqual({
        id: 'VAR_789',
        name: 'Small',
        price: 450,
      });

      expect(result.modifiers).toHaveLength(2);
      expect(result.modifiers[0]).toMatchObject({
        id: 'MOD_1',
        name: 'Oat Milk',
        price: 75,
        modifierListId: 'MOD_LIST_1',
      });
    });

    it('sends correct request to Square Catalog API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ objects: [] }),
      });

      await adapter.importCatalog();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://connect.squareupsandbox.com/v2/catalog/list',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
            'Square-Version': expect.any(String),
          }),
        })
      );
    });
  });

  describe('Success scenarios', () => {
    it('handles empty catalog', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ objects: [] }),
      });

      const result = await adapter.importCatalog();

      expect(result.items).toEqual([]);
      expect(result.modifiers).toEqual([]);
      expect(result.categories).toEqual([]);
    });

    it('handles catalog with no objects field', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await adapter.importCatalog();

      expect(result.items).toEqual([]);
      expect(result.modifiers).toEqual([]);
      expect(result.categories).toEqual([]);
    });

    it('handles items without variations', async () => {
      const mockResponse = {
        objects: [
          {
            type: 'ITEM',
            id: 'ITEM_1',
            item_data: {
              name: 'Simple Item',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.importCatalog();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].variations).toEqual([]);
    });

    it('handles items without prices', async () => {
      const mockResponse = {
        objects: [
          {
            type: 'ITEM',
            id: 'ITEM_1',
            item_data: {
              name: 'No Price Item',
              variations: [
                {
                  id: 'VAR_1',
                  item_variation_data: {
                    name: 'Default',
                    // No price_money
                  },
                },
              ],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.importCatalog();

      expect(result.items[0].variations![0].price).toBe(0);
    });

    it('handles pagination with cursor', async () => {
      const firstPage = {
        objects: [
          { type: 'ITEM', id: 'ITEM_1', item_data: { name: 'Item 1' } },
        ],
        cursor: 'next_page_cursor',
      };
      const secondPage = {
        objects: [
          { type: 'ITEM', id: 'ITEM_2', item_data: { name: 'Item 2' } },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstPage),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondPage),
        });

      const result = await adapter.importCatalog();

      expect(result.items).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Second call should include cursor
      const secondCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(secondCall[0]).toContain('cursor=next_page_cursor');
    });
  });

  describe('Failure scenarios', () => {
    it('throws error when not authenticated', async () => {
      const unauthAdapter = new SquareAdapter();
      // Don't set credentials

      await expect(unauthAdapter.importCatalog()).rejects.toThrow('Not authenticated');
    });

    it('throws error on Square API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          errors: [
            { code: 'UNAUTHORIZED', detail: 'Access token has expired' },
          ],
        }),
      });

      await expect(adapter.importCatalog()).rejects.toThrow('Access token has expired');
    });
  });

  describe('Error scenarios', () => {
    it('throws error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.importCatalog()).rejects.toThrow('Network error');
    });

    it('throws error on rate limit (429)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          errors: [
            { code: 'RATE_LIMITED', detail: 'Too many requests' },
          ],
        }),
      });

      await expect(adapter.importCatalog()).rejects.toThrow('Too many requests');
    });
  });

  describe('Edge cases', () => {
    it('ignores unknown object types', async () => {
      const mockResponse = {
        objects: [
          { type: 'UNKNOWN_TYPE', id: 'UNK_1', unknown_data: {} },
          { type: 'ITEM', id: 'ITEM_1', item_data: { name: 'Real Item' } },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.importCatalog();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Real Item');
    });

    it('handles modifiers without price', async () => {
      const mockResponse = {
        objects: [
          {
            type: 'MODIFIER_LIST',
            id: 'MOD_LIST_1',
            modifier_list_data: {
              name: 'Free Options',
              modifiers: [
                {
                  id: 'MOD_1',
                  modifier_data: {
                    name: 'No Whip',
                    // No price_money - it's free
                  },
                },
              ],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await adapter.importCatalog();

      expect(result.modifiers).toHaveLength(1);
      expect(result.modifiers[0].price).toBe(0);
    });
  });
});
