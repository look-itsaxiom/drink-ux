/**
 * Tests for HealthCheckService
 */

import { PrismaClient } from '../../../generated/prisma';
import { HealthCheckService, HealthStatus } from '../HealthCheckService';
import { POSAdapter, POSCredentials, TokenResult, RawCatalogData, CatalogItem, CatalogModifier, OrderSubmission } from '../../adapters/pos/POSAdapter';
import { OrderStatus } from '../../../generated/prisma';

// Mock POS adapter
class MockPOSAdapter implements POSAdapter {
  private shouldFail = false;
  private latency = 0;

  setCredentials(_credentials: POSCredentials): void {}
  getAuthorizationUrl(_state: string): string { return 'https://example.com/auth'; }
  async exchangeCodeForTokens(_code: string): Promise<TokenResult> {
    return { accessToken: 'token', refreshToken: 'refresh', expiresAt: new Date(), merchantId: 'merchant' };
  }
  async refreshTokens(_refreshToken: string): Promise<TokenResult> {
    return { accessToken: 'token', refreshToken: 'refresh', expiresAt: new Date(), merchantId: 'merchant' };
  }
  async importCatalog(): Promise<RawCatalogData> {
    return { items: [], modifiers: [], categories: [] };
  }
  async pushItem(_item: CatalogItem): Promise<string> { return 'item-id'; }
  async pushModifier(_modifier: CatalogModifier): Promise<string> { return 'mod-id'; }
  async updateItem(_posItemId: string, _item: CatalogItem): Promise<void> {}
  async createOrder(_order: OrderSubmission): Promise<string> { return 'order-id'; }
  async getOrderStatus(_posOrderId: string): Promise<OrderStatus> { return 'PENDING'; }
  async getPaymentLink(_orderId: string): Promise<string> { return 'https://payment.link'; }

  // Test helpers
  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  setLatency(ms: number): void {
    this.latency = ms;
  }

  async healthCheck(): Promise<boolean> {
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }
    if (this.shouldFail) {
      throw new Error('POS health check failed');
    }
    return true;
  }
}

// Mock Prisma client
function createMockPrisma(options: { queryFails?: boolean } = {}): PrismaClient {
  const mock = {
    $queryRaw: jest.fn().mockImplementation(async () => {
      if (options.queryFails) {
        throw new Error('Database connection failed');
      }
      return [{ '1': 1 }];
    }),
    $disconnect: jest.fn(),
  } as unknown as PrismaClient;

  return mock;
}

describe('HealthCheckService', () => {
  let healthCheckService: HealthCheckService;
  let mockPrisma: PrismaClient;
  let mockPOSAdapter: MockPOSAdapter;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockPOSAdapter = new MockPOSAdapter();
    healthCheckService = new HealthCheckService(mockPrisma, mockPOSAdapter);
  });

  describe('checkHealth - Happy Path', () => {
    it('returns healthy when all services are up', async () => {
      const result = await healthCheckService.checkHealth();

      expect(result.healthy).toBe(true);
      expect(result.services.database).toBe(true);
      expect(result.services.pos).toBe(true);
      expect(result.lastChecked).toBeInstanceOf(Date);
    });

    it('includes timestamp of last check', async () => {
      const before = new Date();
      const result = await healthCheckService.checkHealth();
      const after = new Date();

      expect(result.lastChecked.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.lastChecked.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('checkHealth - Database Failures', () => {
    it('returns unhealthy when database is down', async () => {
      mockPrisma = createMockPrisma({ queryFails: true });
      healthCheckService = new HealthCheckService(mockPrisma, mockPOSAdapter);

      const result = await healthCheckService.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.services.database).toBe(false);
      expect(result.message).toContain('database');
    });

    it('still checks other services when database fails', async () => {
      mockPrisma = createMockPrisma({ queryFails: true });
      healthCheckService = new HealthCheckService(mockPrisma, mockPOSAdapter);

      const result = await healthCheckService.checkHealth();

      expect(result.services.database).toBe(false);
      expect(result.services.pos).toBe(true);
    });
  });

  describe('checkHealth - POS Failures', () => {
    it('returns unhealthy when POS is down', async () => {
      mockPOSAdapter.setShouldFail(true);

      const result = await healthCheckService.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.services.pos).toBe(false);
      expect(result.message).toContain('POS');
    });

    it('database can still be healthy when POS fails', async () => {
      mockPOSAdapter.setShouldFail(true);

      const result = await healthCheckService.checkHealth();

      expect(result.services.database).toBe(true);
      expect(result.services.pos).toBe(false);
    });
  });

  describe('checkHealth - Timeout Handling', () => {
    it('handles timeout gracefully', async () => {
      mockPOSAdapter.setLatency(5000);
      healthCheckService = new HealthCheckService(mockPrisma, mockPOSAdapter, { posTimeout: 100 });

      const result = await healthCheckService.checkHealth();

      expect(result.services.pos).toBe(false);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('returns true when database is accessible', async () => {
      const result = await healthCheckService.checkDatabaseHealth();

      expect(result).toBe(true);
    });

    it('returns false when database query fails', async () => {
      mockPrisma = createMockPrisma({ queryFails: true });
      healthCheckService = new HealthCheckService(mockPrisma, mockPOSAdapter);

      const result = await healthCheckService.checkDatabaseHealth();

      expect(result).toBe(false);
    });

    it('executes a simple query to verify connectivity', async () => {
      await healthCheckService.checkDatabaseHealth();

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('checkPOSHealth', () => {
    it('returns true when POS is accessible', async () => {
      const result = await healthCheckService.checkPOSHealth();

      expect(result).toBe(true);
    });

    it('returns false when POS check fails', async () => {
      mockPOSAdapter.setShouldFail(true);

      const result = await healthCheckService.checkPOSHealth();

      expect(result).toBe(false);
    });
  });

  describe('Multiple failures', () => {
    it('reports all failed services', async () => {
      mockPrisma = createMockPrisma({ queryFails: true });
      mockPOSAdapter.setShouldFail(true);
      healthCheckService = new HealthCheckService(mockPrisma, mockPOSAdapter);

      const result = await healthCheckService.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.services.database).toBe(false);
      expect(result.services.pos).toBe(false);
      expect(result.message).toContain('database');
      expect(result.message).toContain('POS');
    });
  });

  describe('getReadiness', () => {
    it('returns ready when core services are up', async () => {
      const result = await healthCheckService.getReadiness();

      expect(result.ready).toBe(true);
    });

    it('returns not ready when database is down', async () => {
      mockPrisma = createMockPrisma({ queryFails: true });
      healthCheckService = new HealthCheckService(mockPrisma, mockPOSAdapter);

      const result = await healthCheckService.getReadiness();

      expect(result.ready).toBe(false);
      expect(result.reason).toContain('database');
    });

    it('is still ready when POS is down (graceful degradation)', async () => {
      mockPOSAdapter.setShouldFail(true);

      const result = await healthCheckService.getReadiness();

      // App can still work without POS (limited functionality)
      expect(result.ready).toBe(true);
      expect(result.degraded).toBe(true);
    });
  });

  describe('getLiveness', () => {
    it('returns alive when app is running', async () => {
      const result = await healthCheckService.getLiveness();

      expect(result.alive).toBe(true);
    });

    it('includes uptime information', async () => {
      const result = await healthCheckService.getLiveness();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
