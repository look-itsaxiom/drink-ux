import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ClientCompanyRepository } from "../clientCompany.repository";
import { TestDataFactory } from "../../__tests__/testUtils";

// Mock the database module
jest.mock("../../database", () => ({
  __esModule: true,
  default: {
    clientCompany: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Import the mocked prisma
import prisma from "../../database";

describe("ClientCompanyRepository", () => {
  let repository: ClientCompanyRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new ClientCompanyRepository();
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should find all companies with relations by default", async () => {
      // Arrange
      const mockCompanies = [
        TestDataFactory.createMockClientCompanyWithRelations(),
        TestDataFactory.createMockClientCompanyWithRelations({ id: "company-2", name: "Company 2" }),
      ];
      mockPrisma.clientCompany.findMany.mockResolvedValue(mockCompanies);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(mockPrisma.clientCompany.findMany).toHaveBeenCalledWith({
        include: {
          theme: true,
          posIntegration: true,
        },
      });
      expect(result).toEqual(mockCompanies);
    });

    it("should find all companies without relations when specified", async () => {
      // Arrange
      const mockCompanies = [TestDataFactory.createMockClientCompany(), TestDataFactory.createMockClientCompany({ id: "company-2", name: "Company 2" })];
      mockPrisma.clientCompany.findMany.mockResolvedValue(mockCompanies);

      // Act
      const result = await repository.findAll(false);

      // Assert
      expect(mockPrisma.clientCompany.findMany).toHaveBeenCalledWith({
        include: undefined,
      });
      expect(result).toEqual(mockCompanies);
    });
  });

  describe("findById", () => {
    it("should find a company by ID with relations", async () => {
      // Arrange
      const mockCompany = TestDataFactory.createMockClientCompanyWithRelations();
      mockPrisma.clientCompany.findUnique.mockResolvedValue(mockCompany);

      // Act
      const result = await repository.findById("test-company-id");

      // Assert
      expect(mockPrisma.clientCompany.findUnique).toHaveBeenCalledWith({
        where: { id: "test-company-id" },
        include: {
          theme: true,
          posIntegration: true,
        },
      });
      expect(result).toEqual(mockCompany);
    });

    it("should return null when company not found", async () => {
      // Arrange
      mockPrisma.clientCompany.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("findByName", () => {
    it("should find a company by name", async () => {
      // Arrange
      const mockCompany = TestDataFactory.createMockClientCompanyWithRelations();
      mockPrisma.clientCompany.findFirst.mockResolvedValue(mockCompany);

      // Act
      const result = await repository.findByName("Test Company");

      // Assert
      expect(mockPrisma.clientCompany.findFirst).toHaveBeenCalledWith({
        where: { name: "Test Company" },
        include: {
          theme: true,
          posIntegration: true,
        },
      });
      expect(result).toEqual(mockCompany);
    });
  });

  describe("create", () => {
    it("should create a new company", async () => {
      // Arrange
      const createData = {
        name: "New Company",
        pointOfContact: "Jane Doe",
      };
      const mockCreatedCompany = TestDataFactory.createMockClientCompany(createData);
      mockPrisma.clientCompany.create.mockResolvedValue(mockCreatedCompany);

      // Act
      const result = await repository.create(createData);

      // Assert
      expect(mockPrisma.clientCompany.create).toHaveBeenCalledWith({
        data: createData,
      });
      expect(result).toEqual(mockCreatedCompany);
    });
  });

  describe("updateById", () => {
    it("should update a company by ID", async () => {
      // Arrange
      const updateData = { name: "Updated Company" };
      const mockUpdatedCompany = TestDataFactory.createMockClientCompany(updateData);
      mockPrisma.clientCompany.update.mockResolvedValue(mockUpdatedCompany);

      // Act
      const result = await repository.updateById("test-company-id", updateData);

      // Assert
      expect(mockPrisma.clientCompany.update).toHaveBeenCalledWith({
        where: { id: "test-company-id" },
        data: updateData,
      });
      expect(result).toEqual(mockUpdatedCompany);
    });

    it("should return null when company not found during update", async () => {
      // Arrange
      const updateData = { name: "Updated Company" };
      const notFoundError = new Error("Record not found") as any;
      notFoundError.code = "P2025";
      mockPrisma.clientCompany.update.mockRejectedValue(notFoundError);

      // Act
      const result = await repository.updateById("non-existent-id", updateData);

      // Assert
      expect(result).toBeNull();
    });

    it("should throw other errors that are not P2025", async () => {
      // Arrange
      const updateData = { name: "Updated Company" };
      const otherError = new Error("Database connection failed");
      mockPrisma.clientCompany.update.mockRejectedValue(otherError);

      // Act & Assert
      await expect(repository.updateById("test-company-id", updateData)).rejects.toThrow("Database connection failed");
    });
  });

  describe("deleteById", () => {
    it("should delete a company and return true", async () => {
      // Arrange
      mockPrisma.clientCompany.delete.mockResolvedValue(TestDataFactory.createMockClientCompany());

      // Act
      const result = await repository.deleteById("test-company-id");

      // Assert
      expect(mockPrisma.clientCompany.delete).toHaveBeenCalledWith({
        where: { id: "test-company-id" },
      });
      expect(result).toBe(true);
    });

    it("should return false when company not found during delete", async () => {
      // Arrange
      const notFoundError = new Error("Record not found") as any;
      notFoundError.code = "P2025";
      mockPrisma.clientCompany.delete.mockRejectedValue(notFoundError);

      // Act
      const result = await repository.deleteById("non-existent-id");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("existsById", () => {
    it("should return true when company exists", async () => {
      // Arrange
      mockPrisma.clientCompany.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsById("test-company-id");

      // Assert
      expect(mockPrisma.clientCompany.count).toHaveBeenCalledWith({
        where: { id: "test-company-id" },
      });
      expect(result).toBe(true);
    });

    it("should return false when company does not exist", async () => {
      // Arrange
      mockPrisma.clientCompany.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsById("non-existent-id");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("existsByName", () => {
    it("should return true when company with name exists", async () => {
      // Arrange
      mockPrisma.clientCompany.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByName("Test Company");

      // Assert
      expect(mockPrisma.clientCompany.count).toHaveBeenCalledWith({
        where: { name: "Test Company" },
      });
      expect(result).toBe(true);
    });
  });

  describe("count", () => {
    it("should return total count of companies", async () => {
      // Arrange
      mockPrisma.clientCompany.count.mockResolvedValue(5);

      // Act
      const result = await repository.count();

      // Assert
      expect(mockPrisma.clientCompany.count).toHaveBeenCalledWith();
      expect(result).toBe(5);
    });
  });
});
