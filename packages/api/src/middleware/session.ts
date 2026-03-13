import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import { AuthService, PublicUser } from '../services/AuthService';

/**
 * Cookie name for session token
 */
export const SESSION_COOKIE_NAME = 'drink_ux_session';

/**
 * Cookie options for session
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

/**
 * Extended Request type with user property
 */
export interface AuthenticatedRequest extends Request {
  user?: PublicUser;
}

/**
 * Creates session middleware that validates session cookies and attaches user to request
 */
export function sessionMiddleware(authService: AuthService) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];

      if (sessionToken) {
        const user = await authService.validateSession(sessionToken);
        if (user) {
          req.user = user;
        }
      }

      next();
    } catch (error) {
      // Log error but don't block request
      console.error('Session middleware error:', error);
      next();
    }
  };
}

/**
 * Middleware that requires authentication
 * Returns 401 if user is not authenticated
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    };
    res.status(401).json(response);
    return;
  }

  next();
}

/**
 * Middleware that optionally requires email verification
 * Use after requireAuth
 */
export function requireVerifiedEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    };
    res.status(401).json(response);
    return;
  }

  if (!req.user.emailVerified) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email verification required',
      },
    };
    res.status(403).json(response);
    return;
  }

  next();
}

/**
 * Helper function to set session cookie
 */
export function setSessionCookie(res: Response, sessionToken: string): void {
  res.cookie(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
}

/**
 * Helper function to clear session cookie
 */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}
