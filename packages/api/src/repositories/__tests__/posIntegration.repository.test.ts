import { describe, it, expect, beforeEach } from "@jest/globals";
import { prismaMock } from "../../__tests__/testUtils";
import { POSIntegrationRepository } from "../posIntegration.repository";

// Mock the database module
jest.mock("../../database", () => ({
  __esModule: true,
  default: prismaMock,
}));

describe("POSIntegrationRepository", () => {
  let repository: POSIntegrationRepository;

  beforeEach(() => {
    repository = new POSIntegrationRepository();
    jest.clearAllMocks();
  });

  describe("findByCompanyId", () => {
    it("should find POS integration by company ID", async () => {
      const mockIntegration = {
        id: "integration-1",
        companyId: "company-1",
        provider: "square",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.pOSIntegration.findFirst.mockResolvedValue(mockIntegration);

      const result = await repository.findByCompanyId("company-1");

      expect(prismaMock.pOSIntegration.findFirst).toHaveBeenCalledWith({
        where: { companyId: "company-1" },
      });
      expect(result).toEqual(mockIntegration);
    });

    it("should return null when integration not found", async () => {
      prismaMock.pOSIntegration.findFirst.mockResolvedValue(null);

      const result = await repository.findByCompanyId("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should find POS integration by ID", async () => {
      const mockIntegration = {
        id: "integration-1",
        companyId: "company-1",
        provider: "square",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.pOSIntegration.findUnique.mockResolvedValue(mockIntegration);

      const result = await repository.findById("integration-1");

      expect(prismaMock.pOSIntegration.findUnique).toHaveBeenCalledWith({
        where: { id: "integration-1" },
      });
      expect(result).toEqual(mockIntegration);
    });

    it("should return null when integration not found", async () => {
      prismaMock.pOSIntegration.findUnique.mockResolvedValue(null);

      const result = await repository.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create a new POS integration", async () => {
      const createData = {
        companyId: "company-1",
        provider: "square",
        isActive: true,
      };

      const mockCreatedIntegration = {
        id: "integration-1",
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.pOSIntegration.create.mockResolvedValue(mockCreatedIntegration);

      const result = await repository.create(createData);

      expect(prismaMock.pOSIntegration.create).toHaveBeenCalledWith({
        data: createData,
      });
      expect(result).toEqual(mockCreatedIntegration);
    });
  });

  describe("update", () => {
    it("should update a POS integration", async () => {
      const updateData = {
        provider: "toast",
        isActive: false,
      };

      const mockUpdatedIntegration = {
        id: "integration-1",
        companyId: "company-1",
        provider: "toast",
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.pOSIntegration.update.mockResolvedValue(mockUpdatedIntegration);

      const result = await repository.update("integration-1", updateData);

      expect(prismaMock.pOSIntegration.update).toHaveBeenCalledWith({
        where: { id: "integration-1" },
        data: updateData,
      });
      expect(result).toEqual(mockUpdatedIntegration);
    });

    it("should return null when updating non-existent integration", async () => {
      const updateData = { isActive: false };

      prismaMock.pOSIntegration.update.mockRejectedValue({ code: "P2025" });

      const result = await repository.update("non-existent", updateData);

      expect(result).toBeNull();
    });

    it("should throw error for other database errors", async () => {
      const updateData = { isActive: false };

      prismaMock.pOSIntegration.update.mockRejectedValue(new Error("Database error"));

      await expect(repository.update("integration-1", updateData)).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("updateLastSyncTime", () => {
    it("should update last sync time for a company", async () => {
      const mockIntegration = {
        id: "integration-1",
        companyId: "company-1",
        provider: "square",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedIntegration = {
        ...mockIntegration,
        updatedAt: new Date(),
      };

      prismaMock.pOSIntegration.findFirst.mockResolvedValue(mockIntegration);
      prismaMock.pOSIntegration.update.mockResolvedValue(mockUpdatedIntegration);

      const result = await repository.updateLastSyncTime("company-1");

      expect(prismaMock.pOSIntegration.findFirst).toHaveBeenCalledWith({
        where: { companyId: "company-1" },
      });
      expect(prismaMock.pOSIntegration.update).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedIntegration);
    });

    it("should return null when integration not found", async () => {
      prismaMock.pOSIntegration.findFirst.mockResolvedValue(null);

      const result = await repository.updateLastSyncTime("non-existent");

      expect(result).toBeNull();
      expect(prismaMock.pOSIntegration.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete a POS integration", async () => {
      prismaMock.pOSIntegration.delete.mockResolvedValue({
        id: "integration-1",
        companyId: "company-1",
        provider: "square",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.delete("integration-1");

      expect(prismaMock.pOSIntegration.delete).toHaveBeenCalledWith({
        where: { id: "integration-1" },
      });
      expect(result).toBe(true);
    });

    it("should return false when deleting non-existent integration", async () => {
      prismaMock.pOSIntegration.delete.mockRejectedValue({ code: "P2025" });

      const result = await repository.delete("non-existent");

      expect(result).toBe(false);
    });

    it("should throw error for other database errors", async () => {
      prismaMock.pOSIntegration.delete.mockRejectedValue(new Error("Database error"));

      await expect(repository.delete("integration-1")).rejects.toThrow("Database error");
    });
  });

  describe("existsByCompanyId", () => {
    it("should return true when integration exists", async () => {
      prismaMock.pOSIntegration.count.mockResolvedValue(1);

      const result = await repository.existsByCompanyId("company-1");

      expect(prismaMock.pOSIntegration.count).toHaveBeenCalledWith({
        where: { companyId: "company-1" },
      });
      expect(result).toBe(true);
    });

    it("should return false when integration does not exist", async () => {
      prismaMock.pOSIntegration.count.mockResolvedValue(0);

      const result = await repository.existsByCompanyId("non-existent");

      expect(result).toBe(false);
    });
  });
});
