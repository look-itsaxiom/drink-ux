import { ClientCompany, ClientTheme, POSIntegration } from "../../generated/prisma";
import { ClientCompany as SharedClientCompany } from "@drink-ux/shared";
import { jest, expect } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";

/**
 * Mock Prisma Client for testing
 */
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

/**
 * Test data factories for creating mock data
 */
export class TestDataFactory {
  static createMockClientCompany(overrides: Partial<ClientCompany> = {}): ClientCompany {
    return {
      id: "test-company-id",
      name: "Test Company",
      pointOfContact: "John Doe",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      ...overrides,
    };
  }

  static createMockClientTheme(overrides: Partial<ClientTheme> = {}): ClientTheme {
    return {
      id: "test-theme-id",
      primaryColor: "#FF0000",
      secondaryColor: "#00FF00",
      logoUrl: "https://example.com/logo.png",
      backgroundUrl: "https://example.com/bg.png",
      companyId: "test-company-id",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      ...overrides,
    };
  }

  static createMockPOSIntegration(overrides: Partial<POSIntegration> = {}): POSIntegration {
    return {
      id: "test-pos-id",
      provider: "square",
      isActive: true,
      companyId: "test-company-id",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      ...overrides,
    };
  }

  static createMockClientCompanyWithRelations(
    companyOverrides: Partial<ClientCompany> = {},
    themeOverrides: Partial<ClientTheme> | null = {},
    posOverrides: Partial<POSIntegration> | null = {}
  ) {
    const company = this.createMockClientCompany(companyOverrides);
    const theme = themeOverrides === null ? null : this.createMockClientTheme({ companyId: company.id, ...themeOverrides });
    const posIntegration = posOverrides === null ? null : this.createMockPOSIntegration({ companyId: company.id, ...posOverrides });

    return {
      ...company,
      theme,
      posIntegration,
    };
  }

  static createMockSharedClientCompany(overrides: Partial<SharedClientCompany> = {}): SharedClientCompany {
    return {
      id: "test-company-id",
      name: "Test Company",
      theme: {
        primaryColor: "#FF0000",
        secondaryColor: "#00FF00",
        logoUrl: "https://example.com/logo.png",
        backgroundUrl: "https://example.com/bg.png",
      },
      posIntegration: {
        id: "test-pos-id",
        businessId: "test-company-id",
        provider: "square" as any,
        credentials: {},
        config: {},
        isActive: true,
      },
      ...overrides,
    };
  }
}

/**
 * Common test utilities
 */
export class TestUtils {
  /**
   * Create a mock function with proper typing
   */
  static createMockFunction<T extends (...args: any[]) => any>(): jest.MockedFunction<T> {
    return jest.fn() as unknown as jest.MockedFunction<T>;
  }

  /**
   * Wait for a specified amount of time (useful for async testing)
   */
  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a random string for testing
   */
  static randomString(length: number = 10): string {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }

  /**
   * Generate a random CUID-like ID for testing
   */
  static randomId(): string {
    return `test_${this.randomString(20)}`;
  }
}

/**
 * Common test assertions
 */
export class TestAssertions {
  /**
   * Assert that an object matches the expected client company structure
   */
  static assertClientCompanyStructure(company: any) {
    expect(company).toHaveProperty("id");
    expect(company).toHaveProperty("name");
    expect(typeof company.id).toBe("string");
    expect(typeof company.name).toBe("string");
  }

  /**
   * Assert that an API response has the correct structure
   */
  static assertApiResponseStructure<T>(response: any, expectData: boolean = true) {
    expect(response).toHaveProperty("success");
    expect(typeof response.success).toBe("boolean");

    if (expectData) {
      expect(response).toHaveProperty("data");
    } else {
      expect(response).toHaveProperty("error");
      expect(response.error).toHaveProperty("code");
      expect(response.error).toHaveProperty("message");
    }
  }
}
