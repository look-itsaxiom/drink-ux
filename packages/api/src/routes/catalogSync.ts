/**
 * Catalog Sync Routes
 *
 * API endpoints for on-demand catalog publishing to POS systems.
 *
 * Endpoints:
 * - GET  /api/catalog/sync/status  - Get sync status and pending changes
 * - POST /api/catalog/sync         - Trigger sync
 * - GET  /api/catalog/sync/history - Recent sync history
 */

import { Router, Request, Response } from 'express';
import { ApiResponse, POSProvider as SharedPOSProvider } from '@drink-ux/shared';
import prisma from '../database';
import { getAdapter, POSAdapter } from '../adapters/pos';
import { POSProvider } from '../../generated/prisma';
import { CatalogSyncService, SyncResult, SyncStatusResponse } from '../services/CatalogSyncService';

export const catalogSyncRouter = Router();

/**
 * Convert Prisma POSProvider enum to shared POSProvider enum
 */
function toSharedPOSProvider(provider: POSProvider): SharedPOSProvider {
  const mapping: Record<POSProvider, SharedPOSProvider> = {
    [POSProvider.SQUARE]: SharedPOSProvider.SQUARE,
    [POSProvider.TOAST]: SharedPOSProvider.TOAST,
    [POSProvider.CLOVER]: SharedPOSProvider.CLOVER,
  };
  return mapping[provider];
}

/**
 * Helper to get a CatalogSyncService instance for a business
 */
async function getServiceForBusiness(businessId: string): Promise<CatalogSyncService | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { posProvider: true },
  });

  if (!business || !business.posProvider) {
    return null;
  }

  const sharedProvider = toSharedPOSProvider(business.posProvider);
  const adapter = getAdapter(sharedProvider);
  return new CatalogSyncService(prisma, adapter);
}

/**
 * GET /api/catalog/sync/status
 * Get sync status and pending changes count
 *
 * Query params: businessId
 */
catalogSyncRouter.get('/status', async (req: Request, res: Response) => {
  const { businessId } = req.query;

  if (!businessId || typeof businessId !== 'string') {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_BUSINESS_ID',
        message: 'businessId query parameter is required',
      },
    };
    res.status(400).json(response);
    return;
  }

  try {
    const service = await getServiceForBusiness(businessId);

    // If no service, business doesn't exist or has no POS provider
    // Still try to get status with a minimal service
    const tempService = new CatalogSyncService(prisma, null as any);
    const status = await tempService.getSyncStatus(businessId);

    if (!status) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: `Business ${businessId} not found`,
        },
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<SyncStatusResponse> = {
      success: true,
      data: {
        status: status.status,
        lastSyncedAt: status.lastSyncedAt,
        lastError: status.lastError,
        pendingChanges: status.pendingChanges,
      },
    };
    res.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/catalog/sync
 * Trigger sync of catalog changes to POS
 *
 * Body: { businessId: string }
 */
catalogSyncRouter.post('/', async (req: Request, res: Response) => {
  const { businessId } = req.body;

  if (!businessId || typeof businessId !== 'string') {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_BUSINESS_ID',
        message: 'businessId is required in request body',
      },
    };
    res.status(400).json(response);
    return;
  }

  try {
    const service = await getServiceForBusiness(businessId);

    if (!service) {
      // Check if business exists but has no POS provider
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business ${businessId} not found`,
          },
        };
        res.status(404).json(response);
        return;
      }
      // Business exists but no POS provider
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NO_POS_CONNECTION',
          message: 'Business has no POS provider configured',
        },
      };
      res.status(400).json(response);
      return;
    }

    const result = await service.sync(businessId);

    if (!result.success) {
      // Determine appropriate status code based on error
      let statusCode = 502; // Default to bad gateway (POS failure)
      let errorCode = 'SYNC_FAILED';

      if (result.error?.includes('not found')) {
        statusCode = 404;
        errorCode = 'BUSINESS_NOT_FOUND';
      } else if (result.error?.includes('in progress')) {
        statusCode = 409;
        errorCode = 'SYNC_IN_PROGRESS';
      } else if (result.error?.includes('no POS connection')) {
        statusCode = 400;
        errorCode = 'NO_POS_CONNECTION';
      }

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: errorCode,
          message: result.error || 'Sync failed',
        },
      };
      res.status(statusCode).json(response);
      return;
    }

    const response: ApiResponse<SyncResult> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/catalog/sync/history
 * Get recent sync history for a business
 *
 * Query params: businessId, limit (optional, default 20, max 100)
 */
catalogSyncRouter.get('/history', async (req: Request, res: Response) => {
  const { businessId, limit: limitParam } = req.query;

  if (!businessId || typeof businessId !== 'string') {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_BUSINESS_ID',
        message: 'businessId query parameter is required',
      },
    };
    res.status(400).json(response);
    return;
  }

  // Parse and validate limit
  let limit = 20;
  if (limitParam && typeof limitParam === 'string') {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100); // Cap at 100
    }
  }

  try {
    // Create a minimal service just for getting history
    const tempService = new CatalogSyncService(prisma, null as any);
    const history = await tempService.getSyncHistory(businessId, limit);

    const response: ApiResponse<{ history: typeof history }> = {
      success: true,
      data: { history },
    };
    res.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
    };
    res.status(500).json(response);
  }
});
