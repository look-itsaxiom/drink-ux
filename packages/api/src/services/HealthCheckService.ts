/**
 * Health Check Service
 *
 * Provides health monitoring for the API and its dependencies.
 * Used by Kubernetes probes, load balancers, and monitoring systems.
 */

import { PrismaClient } from '../../generated/prisma';

/**
 * Interface for POS adapters with health check capability
 */
export interface HealthCheckablePOSAdapter {
  healthCheck(): Promise<boolean>;
}

/**
 * Overall health status of the system
 */
export interface HealthStatus {
  healthy: boolean;
  services: {
    database: boolean;
    pos: boolean;
    cache?: boolean;
  };
  lastChecked: Date;
  message?: string;
}

/**
 * Readiness check result
 */
export interface ReadinessStatus {
  ready: boolean;
  degraded?: boolean;
  reason?: string;
}

/**
 * Liveness check result
 */
export interface LivenessStatus {
  alive: boolean;
  uptime: number;
}

/**
 * Health check service options
 */
export interface HealthCheckServiceOptions {
  /** Timeout for POS health check in milliseconds */
  posTimeout?: number;
  /** Timeout for database health check in milliseconds */
  databaseTimeout?: number;
}

const DEFAULT_OPTIONS: HealthCheckServiceOptions = {
  posTimeout: 5000,
  databaseTimeout: 5000,
};

const startTime = Date.now();

/**
 * Health Check Service
 *
 * Monitors the health of the API and its dependencies:
 * - Database connectivity
 * - POS system availability
 * - Cache connectivity (if applicable)
 *
 * @example
 * ```typescript
 * const healthService = new HealthCheckService(prisma, posAdapter);
 *
 * // Check overall health
 * const status = await healthService.checkHealth();
 * if (!status.healthy) {
 *   console.error('System unhealthy:', status.message);
 * }
 *
 * // Kubernetes readiness probe
 * const readiness = await healthService.getReadiness();
 * if (!readiness.ready) {
 *   return res.status(503).json(readiness);
 * }
 * ```
 */
export class HealthCheckService {
  private readonly options: HealthCheckServiceOptions;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly posAdapter: HealthCheckablePOSAdapter,
    options: HealthCheckServiceOptions = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Check overall system health
   *
   * Checks all services and returns a comprehensive health status.
   * The system is considered healthy only if all services are up.
   */
  async checkHealth(): Promise<HealthStatus> {
    const [databaseHealth, posHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkPOSHealth(),
    ]);

    const healthy = databaseHealth && posHealth;
    const failedServices: string[] = [];

    if (!databaseHealth) failedServices.push('database');
    if (!posHealth) failedServices.push('POS');

    const message = failedServices.length > 0
      ? `Unhealthy services: ${failedServices.join(', ')}`
      : undefined;

    return {
      healthy,
      services: {
        database: databaseHealth,
        pos: posHealth,
      },
      lastChecked: new Date(),
      message,
    };
  }

  /**
   * Check database health
   *
   * Executes a simple query to verify database connectivity.
   */
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database check timeout')), this.options.databaseTimeout);
      });

      const queryPromise = this.prisma.$queryRaw`SELECT 1`;

      await Promise.race([queryPromise, timeoutPromise]);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Check POS system health
   *
   * Verifies connectivity to the POS system.
   */
  async checkPOSHealth(): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('POS check timeout')), this.options.posTimeout);
      });

      const healthPromise = this.posAdapter.healthCheck();

      await Promise.race([healthPromise, timeoutPromise]);
      return true;
    } catch (error) {
      console.error('POS health check failed:', error);
      return false;
    }
  }

  /**
   * Get readiness status
   *
   * Determines if the application is ready to receive traffic.
   * Used by Kubernetes readiness probes.
   *
   * The app is ready if the database is accessible.
   * POS being down results in degraded mode, not unreadiness.
   */
  async getReadiness(): Promise<ReadinessStatus> {
    const databaseHealth = await this.checkDatabaseHealth();

    if (!databaseHealth) {
      return {
        ready: false,
        reason: 'database is not accessible',
      };
    }

    const posHealth = await this.checkPOSHealth();

    return {
      ready: true,
      degraded: !posHealth,
    };
  }

  /**
   * Get liveness status
   *
   * Simple check that the application process is running.
   * Used by Kubernetes liveness probes.
   */
  async getLiveness(): Promise<LivenessStatus> {
    return {
      alive: true,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  }
}
