import { Router, Response } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import { AuthService } from '../services/AuthService';
import {
  EjectionService,
  EjectionError,
  EjectionConsequences,
  EjectResult,
  StartOverResult,
} from '../services/EjectionService';
import {
  sessionMiddleware,
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/session';

/**
 * Creates the ejection router
 * @param authService - The authentication service (for session middleware)
 * @param ejectionService - The ejection service
 */
export function createEjectionRouter(
  authService: AuthService,
  ejectionService: EjectionService
): Router {
  const router = Router();

  // Apply session middleware to all routes
  router.use(sessionMiddleware(authService));

  /**
   * GET /api/ejection/check
   * Get ejection consequences for the authenticated user's business
   */
  router.get('/check', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const businessId = req.user!.businessId;

      const consequences = await ejectionService.checkEjectionConsequences(businessId);

      const response: ApiResponse<EjectionConsequences> = {
        success: true,
        data: consequences,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof EjectionError) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(400).json(response);
        return;
      }

      console.error('Check ejection consequences error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/ejection/eject
   * Execute ejection for the authenticated user's business
   * Requires { confirmed: true } in request body
   */
  router.post('/eject', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const businessId = req.user!.businessId;
      const { confirmed, reason } = req.body;

      const result = await ejectionService.eject(businessId, {
        confirmed: confirmed === true,
        reason,
      });

      const response: ApiResponse<EjectResult> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof EjectionError) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(400).json(response);
        return;
      }

      console.error('Eject error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/ejection/start-over
   * Reset an ejected business to onboarding state
   * Requires { confirmed: true } in request body
   * Optional: { clearCatalog: boolean, clearPOSConnection: boolean }
   */
  router.post('/start-over', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const businessId = req.user!.businessId;
      const { confirmed, clearCatalog, clearPOSConnection } = req.body;

      const result = await ejectionService.startOver(businessId, {
        confirmed: confirmed === true,
        clearCatalog,
        clearPOSConnection,
      });

      const response: ApiResponse<StartOverResult> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof EjectionError) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(400).json(response);
        return;
      }

      console.error('Start over error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
