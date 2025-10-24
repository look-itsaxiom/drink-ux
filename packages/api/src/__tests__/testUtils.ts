import { Partner, PartnerTheme, POSIntegration, PrismaClient } from "../../generated/prisma";
import { Partner as SharedPartner } from "@drink-ux/shared";
import { jest, expect } from "@jest/globals";
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
  static createMockPartner(overrides: Partial<Partner> = {}): Partner {
    return {
      id: "test-partner-id",
      name: "Test Partner",
      pointOfContact: "John Doe",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      ...overrides,
    };
  }

  static createMockPartnerTheme(overrides: Partial<PartnerTheme> = {}): PartnerTheme {
    return {
      id: "test-theme-id",
      primaryColor: "#FF0000",
      secondaryColor: "#00FF00",
      logoUrl: "https://example.com/logo.png",
      backgroundUrl: "https://example.com/bg.png",
      partnerId: "test-partner-id",
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
      partnerId: "test-partner-id",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      ...overrides,
    };
  }

  static createMockPartnerWithRelations(
    partnerOverrides: Partial<Partner> = {},
    themeOverrides: Partial<PartnerTheme> | null = {},
    posOverrides: Partial<POSIntegration> | null = {}
  ) {
    const partner = this.createMockPartner(partnerOverrides);
    const theme = themeOverrides === null ? null : this.createMockPartnerTheme({ partnerId: partner.id, ...themeOverrides });
    const posIntegration = posOverrides === null ? null : this.createMockPOSIntegration({ partnerId: partner.id, ...posOverrides });

    return {
      ...partner,
      theme,
      posIntegration,
    };
  }

  static createMockSharedPartner(overrides: Partial<SharedPartner> = {}): SharedPartner {
    return {
      id: "test-partner-id",
      name: "Test Partner",
      theme: {
        primaryColor: "#FF0000",
        secondaryColor: "#00FF00",
        logoUrl: "https://example.com/logo.png",
        backgroundUrl: "https://example.com/bg.png",
      },
      posIntegration: {
        id: "test-pos-id",
        businessId: "test-partner-id",
        provider: "square" as any,
        credentials: {},
        config: {},
        isActive: true,
      },
      ...overrides,
    };
  }

  // Legacy methods for backward compatibility during transition
  static createMockClientCompany = this.createMockPartner;
  static createMockClientTheme = this.createMockPartnerTheme;
  static createMockClientCompanyWithRelations = this.createMockPartnerWithRelations;
  static createMockSharedClientCompany = this.createMockSharedPartner;
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
   * Assert that an object matches the expected partner structure
   */
  static assertPartnerStructure(partner: any) {
    expect(partner).toHaveProperty("id");
    expect(partner).toHaveProperty("name");
    expect(typeof partner.id).toBe("string");
    expect(typeof partner.name).toBe("string");
  }

  /**
   * Assert that an object matches the expected client company structure (legacy)
   */
  static assertClientCompanyStructure = this.assertPartnerStructure;

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
