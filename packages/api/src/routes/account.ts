import { Router, Response } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import { AuthService } from '../services/AuthService';
import { AccountService, AccountError, BusinessProfile, BusinessTheme, POSStatus } from '../services/AccountService';
import {
  sessionMiddleware,
  requireAuth,
  AuthenticatedRequest,
} from '../middleware/session';

/**
 * Creates the account router with all account management endpoints
 */
export function createAccountRouter(
  authService: AuthService,
  accountService: AccountService
): Router {
  const router = Router();

  // Apply session middleware to all routes
  router.use(sessionMiddleware(authService));

  // ===========================================================================
  // GET /profile - Get business profile
  // ===========================================================================
  router.get(
    '/profile',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.user!.id;

        // Get business for user
        const business = await accountService.getBusinessForUser(userId);
        if (!business) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'NO_BUSINESS',
              message: 'No business found for user',
            },
          };
          res.status(404).json(response);
          return;
        }

        const profile = await accountService.getProfile(business.id);

        const response: ApiResponse<{ profile: BusinessProfile }> = {
          success: true,
          data: { profile },
        };
        res.json(response);
      } catch (error) {
        handleAccountError(res, error);
      }
    }
  );

  // ===========================================================================
  // PUT /profile - Update business profile
  // ===========================================================================
  router.put(
    '/profile',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.user!.id;
        const { name, contactEmail, contactPhone } = req.body;

        // Get business for user
        const business = await accountService.getBusinessForUser(userId);
        if (!business) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'NO_BUSINESS',
              message: 'No business found for user',
            },
          };
          res.status(404).json(response);
          return;
        }

        const profile = await accountService.updateProfile(business.id, {
          name,
          contactEmail,
          contactPhone,
        });

        const response: ApiResponse<{ profile: BusinessProfile }> = {
          success: true,
          data: { profile },
        };
        res.json(response);
      } catch (error) {
        handleAccountError(res, error);
      }
    }
  );

  // ===========================================================================
  // PUT /slug - Update business slug
  // ===========================================================================
  router.put(
    '/slug',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.user!.id;
        const { slug } = req.body;

        if (!slug || typeof slug !== 'string') {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'MISSING_SLUG',
              message: 'Slug is required',
            },
          };
          res.status(400).json(response);
          return;
        }

        // Get business for user
        const business = await accountService.getBusinessForUser(userId);
        if (!business) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'NO_BUSINESS',
              message: 'No business found for user',
            },
          };
          res.status(404).json(response);
          return;
        }

        const profile = await accountService.updateSlug(business.id, slug);

        const response: ApiResponse<{ profile: BusinessProfile }> = {
          success: true,
          data: { profile },
        };
        res.json(response);
      } catch (error) {
        handleAccountError(res, error);
      }
    }
  );

  // ===========================================================================
  // GET /slug/available - Check if slug is available
  // ===========================================================================
  router.get(
    '/slug/available',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const slug = req.query.slug as string | undefined;

        if (!slug) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'MISSING_SLUG',
              message: 'Slug query parameter is required',
            },
          };
          res.status(400).json(response);
          return;
        }

        const available = await accountService.isSlugAvailable(slug);

        const response: ApiResponse<{ available: boolean }> = {
          success: true,
          data: { available },
        };
        res.json(response);
      } catch (error) {
        handleAccountError(res, error);
      }
    }
  );

  // ===========================================================================
  // GET /branding - Get business branding/theme
  // ===========================================================================
  router.get(
    '/branding',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.user!.id;

        // Get business for user
        const business = await accountService.getBusinessForUser(userId);
        if (!business) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'NO_BUSINESS',
              message: 'No business found for user',
            },
          };
          res.status(404).json(response);
          return;
        }

        const branding = await accountService.getBranding(business.id);

        const response: ApiResponse<{ branding: BusinessTheme | null }> = {
          success: true,
          data: { branding },
        };
        res.json(response);
      } catch (error) {
        handleAccountError(res, error);
      }
    }
  );

  // ===========================================================================
  // PUT /branding - Update business branding/theme
  // ===========================================================================
  router.put(
    '/branding',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.user!.id;
        const { primaryColor, secondaryColor, logoUrl } = req.body;

        // Get business for user
        const business = await accountService.getBusinessForUser(userId);
        if (!business) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'NO_BUSINESS',
              message: 'No business found for user',
            },
          };
          res.status(404).json(response);
          return;
        }

        const profile = await accountService.updateBranding(business.id, {
          primaryColor,
          secondaryColor,
          logoUrl,
        });

        const response: ApiResponse<{ branding: BusinessTheme | null }> = {
          success: true,
          data: { branding: profile.theme || null },
        };
        res.json(response);
      } catch (error) {
        handleAccountError(res, error);
      }
    }
  );

  // ===========================================================================
  // GET /pos-status - Get POS connection status
  // ===========================================================================
  router.get(
    '/pos-status',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.user!.id;

        // Get business for user
        const business = await accountService.getBusinessForUser(userId);
        if (!business) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'NO_BUSINESS',
              message: 'No business found for user',
            },
          };
          res.status(404).json(response);
          return;
        }

        const posStatus = await accountService.getPOSStatus(business.id);

        const response: ApiResponse<{ posStatus: POSStatus }> = {
          success: true,
          data: { posStatus },
        };
        res.json(response);
      } catch (error) {
        handleAccountError(res, error);
      }
    }
  );

  return router;
}

/**
 * Handle AccountError and other errors in a consistent way
 */
function handleAccountError(res: Response, error: unknown): void {
  if (error instanceof AccountError) {
    const statusCode = getStatusCodeForError(error.code);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
    res.status(statusCode).json(response);
    return;
  }

  console.error('Unhandled account error:', error);
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
}

/**
 * Map error codes to HTTP status codes
 */
function getStatusCodeForError(code: string): number {
  switch (code) {
    case 'BUSINESS_NOT_FOUND':
    case 'USER_NOT_FOUND':
      return 404;

    case 'INVALID_NAME':
    case 'INVALID_EMAIL':
    case 'INVALID_PHONE':
    case 'INVALID_SLUG':
    case 'RESERVED_SLUG':
    case 'SLUG_TAKEN':
    case 'INVALID_COLOR':
    case 'INVALID_LOGO_URL':
      return 400;

    case 'UNAUTHORIZED':
      return 401;

    default:
      return 500;
  }
}
