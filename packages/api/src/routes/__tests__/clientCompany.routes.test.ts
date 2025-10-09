import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import { clientCompanyRoutes } from "../clientCompany";
import { TestDataFactory, TestAssertions } from "../../__tests__/testUtils";

// Mock the manager module
jest.mock("../../managers/clientCompany.manager", () => ({
  ClientCompanyManager: jest.fn(),
  clientCompanyManager: {
    getAllClientCompanies: jest.fn(),
    getClientCompanyById: jest.fn(),
    getClientCompanyByName: jest.fn(),
    createClientCompany: jest.fn(),
    updateClientCompany: jest.fn(),
    deleteClientCompany: jest.fn(),
    clientCompanyExists: jest.fn(),
    getClientCompanyStats: jest.fn(),
  },
}));

import { clientCompanyManager } from "../../managers/clientCompany.manager";

describe("ClientCompany Routes", () => {
  let app: express.Application;
  let mockManager: jest.Mocked<typeof clientCompanyManager>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/client-companies", clientCompanyRoutes);

    mockManager = clientCompanyManager as jest.Mocked<typeof clientCompanyManager>;
    jest.clearAllMocks();
  });

  describe("GET /client-companies", () => {
    it("should return all companies successfully", async () => {
      // Arrange
      const mockCompanies = [
        TestDataFactory.createMockSharedClientCompany(),
        TestDataFactory.createMockSharedClientCompany({ id: "company-2", name: "Company 2" }),
      ];
      mockManager.getAllClientCompanies.mockResolvedValue(mockCompanies);

      // Act
      const response = await request(app).get("/client-companies").expect(200);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, true);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockManager.getAllClientCompanies).toHaveBeenCalledWith({ includeRelations: true });
    });

    it("should handle includeRelations query parameter", async () => {
      // Arrange
      mockManager.getAllClientCompanies.mockResolvedValue([]);

      // Act
      await request(app).get("/client-companies?includeRelations=false").expect(200);

      // Assert
      expect(mockManager.getAllClientCompanies).toHaveBeenCalledWith({ includeRelations: false });
    });

    it("should handle manager errors", async () => {
      // Arrange
      mockManager.getAllClientCompanies.mockRejectedValue(new Error("Database error"));

      // Act
      const response = await request(app).get("/client-companies").expect(500);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, false);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe("INTERNAL_SERVER_ERROR");
    });
  });

  describe("GET /client-companies/stats", () => {
    it("should return statistics successfully", async () => {
      // Arrange
      const mockStats = {
        totalCompanies: 10,
        companiesWithThemes: 7,
        companiesWithPOS: 5,
      };
      mockManager.getClientCompanyStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app).get("/client-companies/stats").expect(200);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe("GET /client-companies/:id", () => {
    it("should return a company when found", async () => {
      // Arrange
      const mockCompany = TestDataFactory.createMockSharedClientCompany();
      mockManager.getClientCompanyById.mockResolvedValue(mockCompany);

      // Act
      const response = await request(app).get("/client-companies/test-company-id").expect(200);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, true);
      expect(response.body.data?.id).toBe("test-company-id");
      expect(mockManager.getClientCompanyById).toHaveBeenCalledWith("test-company-id", { includeRelations: true });
    });

    it("should return 404 when company not found", async () => {
      // Arrange
      mockManager.getClientCompanyById.mockResolvedValue(null);

      // Act
      const response = await request(app).get("/client-companies/non-existent-id").expect(404);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, false);
      expect(response.body.error?.code).toBe("CLIENT_COMPANY_NOT_FOUND");
    });

    it("should handle validation errors", async () => {
      // Arrange
      mockManager.getClientCompanyById.mockRejectedValue(new Error("Valid client company ID is required"));

      // Act
      const response = await request(app).get("/client-companies/invalid-id").expect(400);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, false);
      expect(response.body.error?.code).toBe("INVALID_CLIENT_COMPANY_ID");
    });
  });

  describe("POST /client-companies", () => {
    const validInput = {
      name: "New Company",
      pointOfContact: "John Doe",
    };

    it("should create a company successfully", async () => {
      // Arrange
      const mockCreatedCompany = TestDataFactory.createMockSharedClientCompany(validInput);
      mockManager.createClientCompany.mockResolvedValue(mockCreatedCompany);

      // Act
      const response = await request(app).post("/client-companies").send(validInput).expect(201);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, true);
      expect(response.body.data?.name).toBe("New Company");
      expect(mockManager.createClientCompany).toHaveBeenCalledWith(validInput);
    });

    it("should handle validation errors", async () => {
      // Arrange
      mockManager.createClientCompany.mockRejectedValue(new Error("Company name is required and must be a non-empty string"));

      // Act
      const response = await request(app).post("/client-companies").send({ name: "", pointOfContact: "John" }).expect(400);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should handle conflict errors", async () => {
      // Arrange
      mockManager.createClientCompany.mockRejectedValue(new Error('A client company with the name "New Company" already exists'));

      // Act
      const response = await request(app).post("/client-companies").send(validInput).expect(409);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, false);
      expect(response.body.error?.code).toBe("CLIENT_COMPANY_ALREADY_EXISTS");
    });
  });

  describe("PUT /client-companies/:id", () => {
    const updateInput = {
      name: "Updated Company",
    };

    it("should update a company successfully", async () => {
      // Arrange
      const mockUpdatedCompany = TestDataFactory.createMockSharedClientCompany(updateInput);
      mockManager.updateClientCompany.mockResolvedValue(mockUpdatedCompany);

      // Act
      const response = await request(app).put("/client-companies/test-company-id").send(updateInput).expect(200);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, true);
      expect(response.body.data?.name).toBe("Updated Company");
      expect(mockManager.updateClientCompany).toHaveBeenCalledWith("test-company-id", updateInput);
    });

    it("should return 404 when company not found", async () => {
      // Arrange
      mockManager.updateClientCompany.mockResolvedValue(null);

      // Act
      const response = await request(app).put("/client-companies/non-existent-id").send(updateInput).expect(404);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, false);
      expect(response.body.error?.code).toBe("CLIENT_COMPANY_NOT_FOUND");
    });

    it("should handle validation errors", async () => {
      // Arrange
      mockManager.updateClientCompany.mockRejectedValue(new Error("Company name must be a non-empty string"));

      // Act
      const response = await request(app).put("/client-companies/test-company-id").send({ name: "" }).expect(400);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, false);
      expect(response.body.error?.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE /client-companies/:id", () => {
    it("should delete a company successfully", async () => {
      // Arrange
      mockManager.deleteClientCompany.mockResolvedValue(true);

      // Act
      const response = await request(app).delete("/client-companies/test-company-id").expect(200);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, true);
      expect(response.body.data?.deleted).toBe(true);
      expect(mockManager.deleteClientCompany).toHaveBeenCalledWith("test-company-id");
    });

    it("should return 404 when company not found", async () => {
      // Arrange
      mockManager.deleteClientCompany.mockResolvedValue(false);

      // Act
      const response = await request(app).delete("/client-companies/non-existent-id").expect(404);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, false);
      expect(response.body.error?.code).toBe("CLIENT_COMPANY_NOT_FOUND");
    });

    it("should handle validation errors", async () => {
      // Arrange
      mockManager.deleteClientCompany.mockRejectedValue(new Error("Valid client company ID is required"));

      // Act
      const response = await request(app).delete("/client-companies/invalid-id").expect(400);

      // Assert
      TestAssertions.assertApiResponseStructure(response.body, false);
      expect(response.body.error?.code).toBe("INVALID_CLIENT_COMPANY_ID");
    });
  });
});
