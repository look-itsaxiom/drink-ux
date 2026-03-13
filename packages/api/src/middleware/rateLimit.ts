import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '@drink-ux/shared';

/**
 * Default rate limit configurations
 */
const DEFAULT_LOGIN_LIMIT = 5; // requests
const DEFAULT_LOGIN_WINDOW = 15; // minutes

const DEFAULT_SIGNUP_LIMIT = 3; // requests
const DEFAULT_SIGNUP_WINDOW = 60; // minutes

const DEFAULT_PASSWORD_RESET_LIMIT = 3; // requests
const DEFAULT_PASSWORD_RESET_WINDOW = 60; // minutes

const DEFAULT_GENERAL_LIMIT = 100; // requests
const DEFAULT_GENERAL_WINDOW = 15; // minutes

/**
 * Standard rate limit error response handler
 */
function createRateLimitHandler(message: string): Options['handler'] {
  return (req: Request, res: Response): void => {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
    };
    res.status(429).json(response);
  };
}

/**
 * Creates a rate limiter for login attempts
 * More restrictive to prevent brute force attacks
 *
 * @param maxRequests - Maximum requests per window (default: 5)
 * @param windowMinutes - Window duration in minutes (default: 15)
 */
export function createLoginRateLimiter(
  maxRequests: number = DEFAULT_LOGIN_LIMIT,
  windowMinutes: number = DEFAULT_LOGIN_WINDOW
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler(
      `Too many login attempts. Please try again in ${windowMinutes} minute${windowMinutes !== 1 ? 's' : ''}.`
    ),
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
  });
}

/**
 * Creates a rate limiter for signup attempts
 * Stricter to prevent mass account creation
 *
 * @param maxRequests - Maximum requests per window (default: 3)
 * @param windowMinutes - Window duration in minutes (default: 60)
 */
export function createSignupRateLimiter(
  maxRequests: number = DEFAULT_SIGNUP_LIMIT,
  windowMinutes: number = DEFAULT_SIGNUP_WINDOW
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler(
      `Too many signup attempts. Please try again in ${windowMinutes} minute${windowMinutes !== 1 ? 's' : ''}.`
    ),
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
  });
}

/**
 * Creates a rate limiter for password reset requests
 * Prevents email flooding and enumeration attacks
 *
 * @param maxRequests - Maximum requests per window (default: 3)
 * @param windowMinutes - Window duration in minutes (default: 60)
 */
export function createPasswordResetRateLimiter(
  maxRequests: number = DEFAULT_PASSWORD_RESET_LIMIT,
  windowMinutes: number = DEFAULT_PASSWORD_RESET_WINDOW
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler(
      `Too many password reset requests. Please try again in ${windowMinutes} minute${windowMinutes !== 1 ? 's' : ''}.`
    ),
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
  });
}

/**
 * Creates a general rate limiter for API endpoints
 * More lenient for authenticated users
 *
 * @param maxRequests - Maximum requests per window (default: 100)
 * @param windowMinutes - Window duration in minutes (default: 15)
 */
export function createGeneralRateLimiter(
  maxRequests: number = DEFAULT_GENERAL_LIMIT,
  windowMinutes: number = DEFAULT_GENERAL_WINDOW
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler(
      `Too many requests. Please slow down and try again later.`
    ),
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
  });
}

/**
 * Pre-configured rate limiters for auth routes
 */
export const authRateLimiters = {
  login: createLoginRateLimiter(),
  signup: createSignupRateLimiter(),
  forgotPassword: createPasswordResetRateLimiter(),
  resetPassword: createPasswordResetRateLimiter(),
};
