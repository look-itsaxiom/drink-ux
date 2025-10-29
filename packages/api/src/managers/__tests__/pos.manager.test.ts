import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { POSProvider, POSCredentials, POSConfig } from "@drink-ux/shared";
import { POSManager } from "../pos.manager";

// Mock the repository module
jest.mock("../../repositories/posIntegration.repository", () => ({
  POSIntegrationRepository: jest.fn(),
  posIntegrationRepository: {
    findByPartnerId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateLastSyncTime: jest.fn(),
    delete: jest.fn(),
    existsByPartnerId: jest.fn(),
  },
}));

// Mock the POS provider factory
jest.mock("../../services/pos/POSProviderFactory", () => ({
  POSProviderFactory: {
    getProvider: jest.fn(),
    getSupportedProviders: jest.fn(() => ["square", "toast", "clover"]),
  },
}));

import { posIntegrationRepository } from "../../repositories/posIntegration.repository";
import { POSProviderFactory } from "../../services/pos/POSProviderFactory";

describe("POSManager", () => {
  let manager: POSManager;
  let mockRepository: jest.Mocked<typeof posIntegrationRepository>;
  let mockProviderFactory: jest.Mocked<typeof POSProviderFactory>;
  let mockProvider: any;

  beforeEach(() => {
    manager = new POSManager();
    mockRepository = posIntegrationRepository as jest.Mocked<typeof posIntegrationRepository>;
    mockProviderFactory = POSProviderFactory as jest.Mocked<typeof POSProviderFactory>;

    // Create a mock provider
    mockProvider = {
      testConnection: jest.fn(),
      fetchMenu: jest.fn(),
      submitOrder: jest.fn(),
      syncMenu: jest.fn(),
      getOrderStatus: jest.fn(),
    };

    mockProviderFactory.getProvider.mockReturnValue(mockProvider);

    jest.clearAllMocks();
  });

  describe("testConnection", () => {
    it("should test connection using the appropriate provider", async () => {
      const credentials: POSCredentials = { accessToken: "test-token" };
      const config: POSConfig = { locationId: "test-location" };
      const expectedStatus = {
        connected: true,
        provider: POSProvider.SQUARE,
        message: "Connected",
      };

      mockProvider.testConnection.mockResolvedValue(expectedStatus);

      const result = await manager.testConnection(POSProvider.SQUARE, credentials, config);

      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith(POSProvider.SQUARE);
      expect(mockProvider.testConnection).toHaveBeenCalledWith(credentials, config);
      expect(result).toEqual(expectedStatus);
    });
  });

  describe("fetchMenu", () => {
    it("should fetch menu using the appropriate provider", async () => {
      const credentials: POSCredentials = { accessToken: "test-token" };
      const config: POSConfig = { locationId: "test-location" };
      const expectedMenu = [{ id: "1", name: "Coffee", price: 3.5, available: true }];

      mockProvider.fetchMenu.mockResolvedValue(expectedMenu);

      const result = await manager.fetchMenu(POSProvider.SQUARE, credentials, config);

      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith(POSProvider.SQUARE);
      expect(mockProvider.fetchMenu).toHaveBeenCalledWith(credentials, config);
      expect(result).toEqual(expectedMenu);
    });
  });

  describe("submitOrder", () => {
    it("should submit order using the appropriate provider", async () => {
      const credentials: POSCredentials = { accessToken: "test-token" };
      const config: POSConfig = { locationId: "test-location" };
      const order = {
        id: "order-1",
        items: [],
        subtotal: 10,
        tax: 1,
        total: 11,
        status: "pending",
      };
      const expectedResult = { orderId: "pos-order-1", status: "PENDING" };

      mockProvider.submitOrder.mockResolvedValue(expectedResult);

      const result = await manager.submitOrder(POSProvider.SQUARE, order, credentials, config);

      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith(POSProvider.SQUARE);
      expect(mockProvider.submitOrder).toHaveBeenCalledWith(order, credentials, config);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("syncMenu", () => {
    it("should sync menu and update last sync time", async () => {
      const companyId = "company-1";
      const credentials: POSCredentials = { accessToken: "test-token" };
      const config: POSConfig = { locationId: "test-location" };
      const expectedSyncResult = {
        itemsSynced: 10,
        itemsAdded: 5,
        itemsUpdated: 3,
        itemsDeactivated: 2,
        errors: [],
      };

      mockProvider.syncMenu.mockResolvedValue(expectedSyncResult);
      mockRepository.updateLastSyncTime.mockResolvedValue({
        id: "integration-1",
        partnerId: companyId,
        provider: "square",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await manager.syncMenu(companyId, POSProvider.SQUARE, credentials, config);

      expect(mockProviderFactory.getProvider).toHaveBeenCalledWith(POSProvider.SQUARE);
      expect(mockProvider.syncMenu).toHaveBeenCalledWith(credentials, config);
      expect(mockRepository.updateLastSyncTime).toHaveBeenCalledWith(companyId);
      expect(result).toEqual(expectedSyncResult);
    });
  });

  describe("upsertIntegration", () => {
    it("should create new integration when none exists", async () => {
      const companyId = "company-1";
      const credentials: POSCredentials = { accessToken: "test-token" };
      const config: POSConfig = { locationId: "test-location" };
      const connectionStatus = {
        connected: true,
        provider: POSProvider.SQUARE,
        message: "Connected",
      };
      const newIntegration = {
        id: "integration-1",
        partnerId: companyId,
        provider: "square",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProvider.testConnection.mockResolvedValue(connectionStatus);
      mockRepository.findByPartnerId.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(newIntegration);

      const result = await manager.upsertIntegration(companyId, POSProvider.SQUARE, credentials, config);

      expect(mockProvider.testConnection).toHaveBeenCalledWith(credentials, config);
      expect(mockRepository.findByPartnerId).toHaveBeenCalledWith(companyId);
      expect(mockRepository.create).toHaveBeenCalledWith({
        partnerId: companyId,
        provider: "square",
        isActive: true,
      });
      expect(result).toEqual(newIntegration);
    });

    it("should update existing integration", async () => {
      const companyId = "company-1";
      const credentials: POSCredentials = { accessToken: "test-token" };
      const config: POSConfig = { locationId: "test-location" };
      const connectionStatus = {
        connected: true,
        provider: POSProvider.TOAST,
        message: "Connected",
      };
      const existingIntegration = {
        id: "integration-1",
        partnerId: companyId,
        provider: "square",
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedIntegration = {
        ...existingIntegration,
        provider: "toast",
        isActive: true,
      };

      mockProvider.testConnection.mockResolvedValue(connectionStatus);
      mockRepository.findByPartnerId.mockResolvedValue(existingIntegration);
      mockRepository.update.mockResolvedValue(updatedIntegration);

      const result = await manager.upsertIntegration(companyId, POSProvider.TOAST, credentials, config);

      expect(mockRepository.update).toHaveBeenCalledWith(existingIntegration.id, {
        provider: "toast",
        isActive: true,
      });
      expect(result).toEqual(updatedIntegration);
    });

    it("should throw error when connection test fails", async () => {
      const companyId = "company-1";
      const credentials: POSCredentials = { accessToken: "test-token" };
      const config: POSConfig = { locationId: "test-location" };
      const connectionStatus = {
        connected: false,
        provider: POSProvider.SQUARE,
        message: "Invalid credentials",
      };

      mockProvider.testConnection.mockResolvedValue(connectionStatus);

      await expect(manager.upsertIntegration(companyId, POSProvider.SQUARE, credentials, config)).rejects.toThrow("Failed to connect to square");
    });
  });

  describe("deactivateIntegration", () => {
    it("should deactivate integration", async () => {
      const companyId = "company-1";
      const integration = {
        id: "integration-1",
        partnerId: companyId,
        provider: "square",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const deactivatedIntegration = { ...integration, isActive: false };

      mockRepository.findByPartnerId.mockResolvedValue(integration);
      mockRepository.update.mockResolvedValue(deactivatedIntegration);

      const result = await manager.deactivateIntegration(companyId);

      expect(mockRepository.findByPartnerId).toHaveBeenCalledWith(companyId);
      expect(mockRepository.update).toHaveBeenCalledWith(integration.id, {
        isActive: false,
      });
      expect(result).toEqual(deactivatedIntegration);
    });

    it("should throw error when integration not found", async () => {
      const companyId = "company-1";

      mockRepository.findByPartnerId.mockResolvedValue(null);

      await expect(manager.deactivateIntegration(companyId)).rejects.toThrow("POS integration not found");
    });
  });

  describe("getSupportedProviders", () => {
    it("should return list of supported providers", () => {
      const providers = manager.getSupportedProviders();

      expect(mockProviderFactory.getSupportedProviders).toHaveBeenCalled();
      expect(Array.isArray(providers)).toBe(true);
    });
  });
});
