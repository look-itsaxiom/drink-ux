import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ClientCompanyManager } from "../clientCompany.manager";
import { TestDataFactory } from "../../__tests__/testUtils";

// Mock the repository module
jest.mock("../../repositories/clientCompany.repository", () => ({
  ClientCompanyRepository: jest.fn(),
  clientCompanyRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    existsById: jest.fn(),
    existsByName: jest.fn(),
    count: jest.fn(),
  },
}));

import { clientCompanyRepository } from "../../repositories/clientCompany.repository";

describe("ClientCompanyManager", () => {
  let manager: ClientCompanyManager;
  let mockRepository: jest.Mocked<typeof clientCompanyRepository>;

  beforeEach(() => {
    manager = new ClientCompanyManager();
    mockRepository = clientCompanyRepository as jest.Mocked<typeof clientCompanyRepository>;
    jest.clearAllMocks();
  });

  describe("getAllClientCompanies", () => {
    it("should return all companies with transformed data", async () => {
      // Arrange
      const mockCompanies = [
        TestDataFactory.createMockClientCompanyWithRelations(),
        TestDataFactory.createMockClientCompanyWithRelations({ id: "company-2", name: "Company 2" }),
      ];
      mockRepository.findAll.mockResolvedValue(mockCompanies);

      // Act
      const result = await manager.getAllClientCompanies();

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", "test-company-id");
      expect(result[0]).toHaveProperty("name", "Test Company");
      expect(result[0]).toHaveProperty("theme");
      expect(result[0]).toHaveProperty("posIntegration");
    });

    it("should call repository with correct includeRelations parameter", async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      await manager.getAllClientCompanies({ includeRelations: false });

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe("getClientCompanyById", () => {
    it("should return a company when found", async () => {
      // Arrange
      const mockCompany = TestDataFactory.createMockClientCompanyWithRelations();
      mockRepository.findById.mockResolvedValue(mockCompany);

      // Act
      const result = await manager.getClientCompanyById("test-company-id");

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith("test-company-id", true);
      expect(result).not.toBeNull();
      expect(result?.id).toBe("test-company-id");
    });

    it("should return null when company not found", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act
      const result = await manager.getClientCompanyById("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });

    it("should throw error for invalid ID", async () => {
      // Act & Assert
      await expect(manager.getClientCompanyById("")).rejects.toThrow("Valid client company ID is required");
      await expect(manager.getClientCompanyById(null as any)).rejects.toThrow("Valid client company ID is required");
    });
  });

  describe("createClientCompany", () => {
    const validInput = {
      name: "New Company",
      pointOfContact: "John Doe",
    };

    it("should create a company successfully", async () => {
      // Arrange
      const mockCreatedCompany = TestDataFactory.createMockClientCompany(validInput);
      const mockCompanyWithRelations = TestDataFactory.createMockClientCompanyWithRelations(validInput);

      mockRepository.findByName.mockResolvedValue(null); // No existing company
      mockRepository.create.mockResolvedValue(mockCreatedCompany);
      mockRepository.findById.mockResolvedValue(mockCompanyWithRelations);

      // Act
      const result = await manager.createClientCompany(validInput);

      // Assert
      expect(mockRepository.findByName).toHaveBeenCalledWith("New Company");
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: "New Company",
        pointOfContact: "John Doe",
      });
      expect(result.name).toBe("New Company");
    });

    it("should throw error if company name already exists", async () => {
      // Arrange
      const existingCompany = TestDataFactory.createMockClientCompany({ name: "New Company" });
      mockRepository.findByName.mockResolvedValue(existingCompany);

      // Act & Assert
      await expect(manager.createClientCompany(validInput)).rejects.toThrow('A client company with the name "New Company" already exists');
    });

    it("should validate required fields", async () => {
      // Act & Assert
      await expect(manager.createClientCompany({ name: "", pointOfContact: "John" })).rejects.toThrow(
        "Company name is required and must be a non-empty string"
      );

      await expect(manager.createClientCompany({ name: "Test", pointOfContact: "" })).rejects.toThrow(
        "Point of contact is required and must be a non-empty string"
      );
    });

    it("should validate field lengths", async () => {
      const longString = "a".repeat(256);

      // Act & Assert
      await expect(manager.createClientCompany({ name: longString, pointOfContact: "John" })).rejects.toThrow("Company name must be 255 characters or less");

      await expect(manager.createClientCompany({ name: "Test", pointOfContact: longString })).rejects.toThrow(
        "Point of contact must be 255 characters or less"
      );
    });
  });

  describe("updateClientCompany", () => {
    const validInput = {
      name: "Updated Company",
    };

    it("should update a company successfully", async () => {
      // Arrange
      const existingCompany = TestDataFactory.createMockClientCompany();
      const updatedCompany = TestDataFactory.createMockClientCompanyWithRelations({ name: "Updated Company" });

      mockRepository.findById.mockResolvedValueOnce(existingCompany); // For existence check
      mockRepository.findByName.mockResolvedValue(null); // No name conflict
      mockRepository.updateById.mockResolvedValue(updatedCompany);
      mockRepository.findById.mockResolvedValueOnce(updatedCompany); // For final result

      // Act
      const result = await manager.updateClientCompany("test-company-id", validInput);

      // Assert
      expect(mockRepository.updateById).toHaveBeenCalledWith("test-company-id", { name: "Updated Company" });
      expect(result?.name).toBe("Updated Company");
    });

    it("should return null when company not found", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act
      const result = await manager.updateClientCompany("non-existent-id", validInput);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw error for name conflicts", async () => {
      // Arrange
      const existingCompany = TestDataFactory.createMockClientCompany({ id: "company-1" });
      const conflictCompany = TestDataFactory.createMockClientCompany({ id: "company-2", name: "Updated Company" });

      mockRepository.findById.mockResolvedValue(existingCompany);
      mockRepository.findByName.mockResolvedValue(conflictCompany);

      // Act & Assert
      await expect(manager.updateClientCompany("company-1", validInput)).rejects.toThrow('A client company with the name "Updated Company" already exists');
    });

    it("should validate empty update input", async () => {
      // Act & Assert
      await expect(manager.updateClientCompany("test-id", {})).rejects.toThrow("At least one field must be provided for update");
    });
  });

  describe("deleteClientCompany", () => {
    it("should delete a company successfully", async () => {
      // Arrange
      mockRepository.deleteById.mockResolvedValue(true);

      // Act
      const result = await manager.deleteClientCompany("test-company-id");

      // Assert
      expect(mockRepository.deleteById).toHaveBeenCalledWith("test-company-id");
      expect(result).toBe(true);
    });

    it("should return false when company not found", async () => {
      // Arrange
      mockRepository.deleteById.mockResolvedValue(false);

      // Act
      const result = await manager.deleteClientCompany("non-existent-id");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("clientCompanyExists", () => {
    it("should return true when company exists", async () => {
      // Arrange
      mockRepository.existsById.mockResolvedValue(true);

      // Act
      const result = await manager.clientCompanyExists("test-company-id");

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for invalid ID", async () => {
      // Act
      const result = await manager.clientCompanyExists("");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getClientCompanyStats", () => {
    it("should return correct statistics", async () => {
      // Arrange
      const companies = [
        TestDataFactory.createMockClientCompanyWithRelations(),
        TestDataFactory.createMockClientCompanyWithRelations({ id: "company-2" }, null, {}),
        TestDataFactory.createMockClientCompanyWithRelations({ id: "company-3" }, {}, null),
      ];

      mockRepository.findAll.mockResolvedValue(companies);

      // Act
      const result = await manager.getClientCompanyStats();

      // Assert
      expect(result).toEqual({
        totalCompanies: 3,
        companiesWithThemes: 2,
        companiesWithPOS: 2,
      });
    });
  });
});
