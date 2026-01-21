/**
 * API Error Types
 *
 * Comprehensive error classes for consistent error handling across the API.
 * Each error type includes a code, message, HTTP status code, and optional details.
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Validation error - 400 Bad Request
 * Used when input validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error - 401 Unauthorized
 * Used when authentication is required or has failed
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'AUTH_REQUIRED') {
    super(code, message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error - 403 Forbidden
 * Used when user lacks permission for an action
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super('AUTHORIZATION_ERROR', message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error - 404 Not Found
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string, code: string = 'NOT_FOUND') {
    const message = id ? `${resource} ${id} not found` : `${resource} not found`;
    super(code, message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * POS unavailable error - 503 Service Unavailable
 * Used when the POS system is unreachable or down
 */
export class POSUnavailableError extends AppError {
  constructor(message: string = 'POS system temporarily unavailable', details?: Record<string, unknown>) {
    super('POS_UNAVAILABLE', message, 503, details);
    this.name = 'POSUnavailableError';
  }
}

/**
 * Payment declined error - 402 Payment Required
 * Used when a payment attempt fails
 */
export class PaymentDeclinedError extends AppError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super('PAYMENT_DECLINED', reason, 402, details);
    this.name = 'PaymentDeclinedError';
  }
}

/**
 * Item unavailable error - 409 Conflict
 * Used when an ordered item is no longer available
 */
export class ItemUnavailableError extends AppError {
  constructor(itemName: string, details?: Record<string, unknown>) {
    super('ITEM_UNAVAILABLE', `${itemName} is currently unavailable`, 409, details);
    this.name = 'ItemUnavailableError';
  }
}

/**
 * Sync error - 500 Internal Server Error
 * Used when catalog synchronization fails
 */
export class SyncError extends AppError {
  public readonly retryable: boolean;

  constructor(
    message: string,
    retryable: boolean = false,
    details?: Record<string, unknown>,
    code: string = 'POS_SYNC_ERROR'
  ) {
    super(code, message, 500, details);
    this.name = 'SyncError';
    this.retryable = retryable;
  }
}

/**
 * Rate limit error - 429 Too Many Requests
 * Used when request rate limits are exceeded
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Too many requests. Please retry after ${retryAfter} seconds`
      : 'Too many requests';
    const details = retryAfter ? { retryAfter } : undefined;
    super('RATE_LIMIT_EXCEEDED', message, 429, details);
    this.name = 'RateLimitError';
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Error response format for API responses
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Convert an error to a standardized API response format
 */
export function toErrorResponse(error: unknown): ErrorResponse {
  if (isAppError(error)) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    };
  }

  // Unknown error - return generic response
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
}

/**
 * Error codes reference for documentation
 */
export const ERROR_CODES = {
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Authentication
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_INVALID: 'AUTH_INVALID',

  // Authorization
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Business
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  BUSINESS_UNAVAILABLE: 'BUSINESS_UNAVAILABLE',
  BUSINESS_SETUP: 'BUSINESS_SETUP',

  // Orders
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_EXPIRED: 'ORDER_EXPIRED',
  ITEM_UNAVAILABLE: 'ITEM_UNAVAILABLE',

  // Payment
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',

  // POS
  POS_UNAVAILABLE: 'POS_UNAVAILABLE',
  POS_SYNC_ERROR: 'POS_SYNC_ERROR',
  POS_AUTH_EXPIRED: 'POS_AUTH_EXPIRED',

  // General
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
