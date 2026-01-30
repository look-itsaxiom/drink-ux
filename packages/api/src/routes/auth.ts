import { Router, Request, Response } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import { PrismaClient } from '../../generated/prisma';
import { AuthService, AuthError, PublicUser, PublicBusiness } from '../services/AuthService';
import {
  sessionMiddleware,
  requireAuth,
  AuthenticatedRequest,
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
} from '../middleware/session';
import { authRateLimiters } from '../middleware/rateLimit';

/**
 * Signup response data
 */
interface SignupResponseData {
  user: PublicUser;
  business: PublicBusiness;
  emailVerificationToken: string; // For testing only - in production, would be sent via email
}

/**
 * Login response data
 */
interface LoginResponseData {
  user: PublicUser;
}

/**
 * Current user response data
 */
interface MeResponseData {
  user: PublicUser;
  business?: {
    id: string;
    name: string;
    slug: string;
    accountState: string;
  };
}

/**
 * Forgot password response data
 */
interface ForgotPasswordResponseData {
  resetToken: string; // For testing only - in production, would be sent via email
}

/**
 * Options for the auth router
 */
export interface AuthRouterOptions {
  /** Disable rate limiting (for tests) */
  disableRateLimit?: boolean;
  /** Prisma client for business queries */
  prisma?: PrismaClient;
}

/**
 * Creates the auth router
 * @param authService - The authentication service
 * @param options - Optional configuration
 */
export function createAuthRouter(authService: AuthService, options: AuthRouterOptions = {}): Router {
  const router = Router();
  const { disableRateLimit = false, prisma } = options;

  // Apply session middleware to all routes
  router.use(sessionMiddleware(authService));

  // Helper to conditionally apply rate limiting
  const applyRateLimit = (limiter: any) => disableRateLimit ? [] : [limiter];

  /**
   * POST /api/auth/signup
   * Create a new user and business
   */
  router.post('/signup', ...applyRateLimit(authRateLimiters.signup), async (req: Request, res: Response) => {
    const { email, password, businessName } = req.body;

    try {
      const result = await authService.signup({ email, password, businessName });

      const response: ApiResponse<SignupResponseData> = {
        success: true,
        data: {
          user: result.user,
          business: result.business,
          emailVerificationToken: result.emailVerificationToken,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof AuthError) {
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

      console.error('Signup error:', error);
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
   * POST /api/auth/login
   * Login with email and password
   */
  router.post('/login', ...applyRateLimit(authRateLimiters.login), async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      const result = await authService.login({ email, password });

      // Set session cookie
      setSessionCookie(res, result.sessionToken);

      const response: ApiResponse<LoginResponseData> = {
        success: true,
        data: {
          user: result.user,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AuthError) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(401).json(response);
        return;
      }

      console.error('Login error:', error);
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
   * GET /api/auth/me
   * Get current authenticated user and business
   */
  router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const responseData: MeResponseData = {
      user: req.user!,
    };

    // Fetch business data if prisma is available and user has businessId
    if (prisma && req.user?.businessId) {
      try {
        const business = await prisma.business.findUnique({
          where: { id: req.user.businessId },
          select: {
            id: true,
            name: true,
            slug: true,
            accountState: true,
          },
        });
        if (business) {
          responseData.business = business;
        }
      } catch {
        // Silently continue without business data
      }
    }

    const response: ApiResponse<MeResponseData> = {
      success: true,
      data: responseData,
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/auth/logout
   * Logout current user
   */
  router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];

    if (sessionToken) {
      await authService.logout(sessionToken);
    }

    clearSessionCookie(res);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  router.post('/forgot-password', ...applyRateLimit(authRateLimiters.forgotPassword), async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Email is required',
        },
      };
      res.status(400).json(response);
      return;
    }

    try {
      const result = await authService.forgotPassword(email);

      const response: ApiResponse<ForgotPasswordResponseData> = {
        success: true,
        data: {
          resetToken: result.resetToken, // For testing - in production, send via email
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Forgot password error:', error);
      // Always return success to prevent email enumeration
      const response: ApiResponse<ForgotPasswordResponseData> = {
        success: true,
        data: {
          resetToken: '', // Empty token for non-existent users
        },
      };
      res.status(200).json(response);
    }
  });

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  router.post('/reset-password', ...applyRateLimit(authRateLimiters.resetPassword), async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Reset token is required',
        },
      };
      res.status(400).json(response);
      return;
    }

    if (!newPassword) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'New password is required',
        },
      };
      res.status(400).json(response);
      return;
    }

    try {
      await authService.resetPassword({ token, newPassword });

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Password reset successfully',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AuthError) {
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

      console.error('Reset password error:', error);
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
   * POST /api/auth/verify-email
   * Verify email with token
   */
  router.post('/verify-email', async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Verification token is required',
        },
      };
      res.status(400).json(response);
      return;
    }

    try {
      await authService.verifyEmail(token);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Email verified successfully',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AuthError) {
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

      console.error('Verify email error:', error);
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
