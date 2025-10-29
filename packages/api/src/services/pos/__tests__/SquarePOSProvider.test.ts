import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { POSProvider, POSCredentials, POSConfig } from "@drink-ux/shared";
import { SquarePOSProvider } from "../providers/SquarePOSProvider";
import { SquareClient } from "../clients/SquareClient";

// Mock the SquareClient
jest.mock("../clients/SquareClient");

describe("SquarePOSProvider", () => {
  let provider: SquarePOSProvider;
  let mockSquareClient: any;

  beforeEach(() => {
    provider = new SquarePOSProvider();
    
    // Setup mock Square client
    mockSquareClient = {
      locations: {
        get: jest.fn(),
      },
      catalog: {
        list: jest.fn(),
      },
      orders: {
        create: jest.fn(),
        get: jest.fn(),
      },
    };

    (SquareClient.createClient as jest.MockedFunction<typeof SquareClient.createClient>).mockReturnValue(mockSquareClient);
  });

  describe("testConnection", () => {
    it("should return success when credentials are valid", async () => {
      const credentials: POSCredentials = {
        accessToken: "test-token",
      };
      const config: POSConfig = {
        locationId: "test-location",
      };

      // Mock successful location retrieval
      mockSquareClient.locations.get.mockResolvedValue({
        location: {
          id: "test-location",
          name: "Test Location",
        },
      });

      const result = await provider.testConnection(credentials, config);

      expect(result.connected).toBe(true);
      expect(result.provider).toBe(POSProvider.SQUARE);
      expect(result.message).toContain("Successfully connected");
    });

    it("should return failure when accessToken is missing", async () => {
      const credentials: POSCredentials = {};
      const config: POSConfig = {
        locationId: "test-location",
      };

      const result = await provider.testConnection(credentials, config);

      expect(result.connected).toBe(false);
      expect(result.message).toContain("Access token is required");
    });

    it("should return failure when locationId is missing", async () => {
      const credentials: POSCredentials = {
        accessToken: "test-token",
      };
      const config: POSConfig = {};

      const result = await provider.testConnection(credentials, config);

      expect(result.connected).toBe(false);
      expect(result.message).toContain("Location ID is required");
    });
  });

  describe("fetchMenu", () => {
    it("should return menu items", async () => {
      const credentials: POSCredentials = {
        accessToken: "test-token",
      };
      const config: POSConfig = {
        locationId: "test-location",
      };

      // Mock catalog list response
      mockSquareClient.catalog.list.mockResolvedValue({
        data: [
          {
            type: "ITEM",
            id: "item-1",
            itemData: {
              name: "Espresso",
              description: "Bold espresso",
              categoryId: "coffee",
              variations: [
                {
                  type: "ITEM_VARIATION",
                  id: "var-1",
                  itemVariationData: {
                    priceMoney: {
                      amount: BigInt(350),
                      currency: "USD",
                    },
                  },
                },
              ],
            },
          },
        ],
      });

      const menuItems = await provider.fetchMenu(credentials, config);

      expect(Array.isArray(menuItems)).toBe(true);
      expect(menuItems.length).toBeGreaterThan(0);
      expect(menuItems[0]).toHaveProperty("id");
      expect(menuItems[0]).toHaveProperty("name");
      expect(menuItems[0]).toHaveProperty("price");
      expect(menuItems[0]).toHaveProperty("available");
    });
  });

  describe("submitOrder", () => {
    it("should submit order and return order ID", async () => {
      const credentials: POSCredentials = {
        accessToken: "test-token",
      };
      const config: POSConfig = {
        locationId: "test-location",
      };
      const order = {
        id: "order-1",
        items: [],
        subtotal: 10,
        tax: 1,
        total: 11,
        status: "pending",
      };

      // Mock order creation response
      mockSquareClient.orders.create.mockResolvedValue({
        order: {
          id: "square-order-123",
          state: "OPEN",
        },
      });

      const result = await provider.submitOrder(order, credentials, config);

      expect(result).toHaveProperty("orderId");
      expect(result).toHaveProperty("status");
      expect(result.orderId).toBe("square-order-123");
      expect(result.status).toBe("OPEN");
    });
  });

  describe("syncMenu", () => {
    it("should return sync results", async () => {
      const credentials: POSCredentials = {
        accessToken: "test-token",
      };
      const config: POSConfig = {
        locationId: "test-location",
      };

      // Mock catalog list response for syncMenu
      mockSquareClient.catalog.list.mockResolvedValue({
        data: [
          {
            type: "ITEM",
            id: "item-1",
            itemData: {
              name: "Espresso",
              variations: [
                {
                  type: "ITEM_VARIATION",
                  id: "var-1",
                  itemVariationData: {
                    priceMoney: {
                      amount: BigInt(350),
                      currency: "USD",
                    },
                  },
                },
              ],
            },
          },
        ],
      });

      const syncResult = await provider.syncMenu(credentials, config);

      expect(syncResult).toHaveProperty("itemsSynced");
      expect(syncResult).toHaveProperty("itemsAdded");
      expect(syncResult).toHaveProperty("itemsUpdated");
      expect(syncResult).toHaveProperty("itemsDeactivated");
      expect(syncResult).toHaveProperty("errors");
      expect(Array.isArray(syncResult.errors)).toBe(true);
    });
  });

  describe("getOrderStatus", () => {
    it("should return order status", async () => {
      const credentials: POSCredentials = {
        accessToken: "test-token",
      };
      const config: POSConfig = {
        locationId: "test-location",
      };

      // Mock order retrieval response
      mockSquareClient.orders.get.mockResolvedValue({
        order: {
          id: "order-1",
          state: "COMPLETED",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:10:00Z",
          totalMoney: {
            amount: BigInt(1100),
            currency: "USD",
          },
          lineItems: [],
        },
      });

      const result = await provider.getOrderStatus("order-1", credentials, config);

      expect(result).toHaveProperty("status");
      expect(typeof result.status).toBe("string");
      expect(result.status).toBe("COMPLETED");
    });
  });
});
