import { describe, it, expect } from "@jest/globals";
import { POSProvider, POSCredentials, POSConfig } from "@drink-ux/shared";
import { SquarePOSProvider } from "../providers/SquarePOSProvider";

describe("SquarePOSProvider", () => {
  let provider: SquarePOSProvider;

  beforeEach(() => {
    provider = new SquarePOSProvider();
  });

  describe("testConnection", () => {
    it("should return success when credentials are valid", async () => {
      const credentials: POSCredentials = {
        accessToken: "test-token",
      };
      const config: POSConfig = {
        locationId: "test-location",
      };

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

      const result = await provider.submitOrder(order, credentials, config);

      expect(result).toHaveProperty("orderId");
      expect(result).toHaveProperty("status");
      expect(result.orderId).toContain("square-order-");
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

      const result = await provider.getOrderStatus("order-1", credentials, config);

      expect(result).toHaveProperty("status");
      expect(typeof result.status).toBe("string");
    });
  });
});
