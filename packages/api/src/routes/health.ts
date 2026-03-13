/**
 * Health Check Routes
 *
 * Provides endpoints for monitoring the API health:
 * - /api/health - Overall health status
 * - /api/health/pos - POS-specific health
 * - /api/health/ready - Kubernetes readiness probe
 * - /api/health/live - Kubernetes liveness probe
 */

import { Router, Request, Response } from 'express';
import { HealthCheckService } from '../services/HealthCheckService';

/**
 * Create health check routes
 *
 * @param healthService - The health check service instance
 * @returns Express router with health check routes
 *
 * @example
 * ```typescript
 * import { createHealthRoutes } from './routes/health';
 * import { HealthCheckService } from './services/HealthCheckService';
 *
 * const healthService = new HealthCheckService(prisma, posAdapter);
 * app.use('/api/health', createHealthRoutes(healthService));
 * ```
 */
export function createHealthRoutes(healthService: HealthCheckService): Router {
  const router = Router();

  /**
   * GET /api/health
   *
   * Overall health check endpoint.
   * Returns 200 if healthy, 503 if any service is down.
   */
  router.get('/', async (_req: Request, res: Response) => {
    const status = await healthService.checkHealth();

    const responseStatus = status.healthy ? 200 : 503;

    res.status(responseStatus).json({
      success: true,
      data: {
        healthy: status.healthy,
        services: status.services,
        lastChecked: status.lastChecked.toISOString(),
        ...(status.message && { message: status.message }),
      },
    });
  });

  /**
   * GET /api/health/pos
   *
   * POS-specific health check endpoint.
   * Returns 200 if POS is accessible, 503 if not.
   */
  router.get('/pos', async (_req: Request, res: Response) => {
    const status = await healthService.checkHealth();

    const responseStatus = status.services.pos ? 200 : 503;

    res.status(responseStatus).json({
      success: true,
      data: {
        pos: status.services.pos,
        lastChecked: status.lastChecked.toISOString(),
      },
    });
  });

  /**
   * GET /api/health/ready
   *
   * Kubernetes readiness probe endpoint.
   * Returns 200 if ready to receive traffic, 503 if not.
   *
   * The app is ready if the database is accessible.
   * POS being down results in degraded mode, not unreadiness.
   */
  router.get('/ready', async (_req: Request, res: Response) => {
    const status = await healthService.getReadiness();

    const responseStatus = status.ready ? 200 : 503;

    res.status(responseStatus).json({
      success: true,
      data: {
        ready: status.ready,
        ...(status.degraded !== undefined && { degraded: status.degraded }),
        ...(status.reason && { reason: status.reason }),
      },
    });
  });

  /**
   * GET /api/health/live
   *
   * Kubernetes liveness probe endpoint.
   * Returns 200 if the process is running.
   *
   * This should always succeed unless the process is stuck.
   */
  router.get('/live', async (_req: Request, res: Response) => {
    const status = await healthService.getLiveness();

    res.status(200).json({
      success: true,
      data: {
        alive: status.alive,
        uptime: status.uptime,
      },
    });
  });

  return router;
}
