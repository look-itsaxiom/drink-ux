/**
 * Tests for API Error Types
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  POSUnavailableError,
  PaymentDeclinedError,
  ItemUnavailableError,
  SyncError,
  RateLimitError,
  isAppError,
  toErrorResponse,
} from '../errors';

describe('AppError', () => {
  it('creates error with code, message, and default status', () => {
    const error = new AppError('TEST_ERROR', 'Test error message');

    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test error message');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('AppError');
  });

  it('creates error with custom status code', () => {
    const error = new AppError('CUSTOM_ERROR', 'Custom error', 418);

    expect(error.statusCode).toBe(418);
  });

  it('creates error with details', () => {
    const details = { field: 'email', reason: 'invalid format' };
    const error = new AppError('DETAIL_ERROR', 'Error with details', 400, details);

    expect(error.details).toEqual(details);
  });

  it('is an instance of Error', () => {
    const error = new AppError('TEST', 'Test');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('ValidationError', () => {
  it('creates validation error with 400 status', () => {
    const error = new ValidationError('Invalid input');

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
  });

  it('includes validation details', () => {
    const details = {
      fields: {
        email: 'Required',
        password: 'Too short',
      },
    };
    const error = new ValidationError('Validation failed', details);

    expect(error.details).toEqual(details);
  });
});

describe('AuthenticationError', () => {
  it('creates authentication error with 401 status', () => {
    const error = new AuthenticationError();

    expect(error.code).toBe('AUTH_REQUIRED');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Authentication required');
  });

  it('allows custom message', () => {
    const error = new AuthenticationError('Session expired');

    expect(error.message).toBe('Session expired');
  });

  it('allows AUTH_EXPIRED code', () => {
    const error = new AuthenticationError('Token expired', 'AUTH_EXPIRED');

    expect(error.code).toBe('AUTH_EXPIRED');
    expect(error.message).toBe('Token expired');
  });
});

describe('AuthorizationError', () => {
  it('creates authorization error with 403 status', () => {
    const error = new AuthorizationError();

    expect(error.code).toBe('AUTHORIZATION_ERROR');
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Access denied');
  });

  it('allows custom message', () => {
    const error = new AuthorizationError('You do not have permission to access this resource');

    expect(error.message).toBe('You do not have permission to access this resource');
  });
});

describe('NotFoundError', () => {
  it('creates not found error with 404 status', () => {
    const error = new NotFoundError('Business');

    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Business not found');
  });

  it('includes resource ID in message when provided', () => {
    const error = new NotFoundError('Order', 'order-123');

    expect(error.message).toBe('Order order-123 not found');
  });

  it('allows custom error code', () => {
    const error = new NotFoundError('Business', 'slug-123', 'BUSINESS_NOT_FOUND');

    expect(error.code).toBe('BUSINESS_NOT_FOUND');
  });
});

describe('POSUnavailableError', () => {
  it('creates POS unavailable error with 503 status', () => {
    const error = new POSUnavailableError();

    expect(error.code).toBe('POS_UNAVAILABLE');
    expect(error.statusCode).toBe(503);
    expect(error.message).toBe('POS system temporarily unavailable');
  });

  it('allows custom message', () => {
    const error = new POSUnavailableError('Square API is down for maintenance');

    expect(error.message).toBe('Square API is down for maintenance');
  });

  it('can include retry information', () => {
    const error = new POSUnavailableError('POS unavailable', { retryAfter: 60 });

    expect(error.details).toEqual({ retryAfter: 60 });
  });
});

describe('PaymentDeclinedError', () => {
  it('creates payment declined error with 402 status', () => {
    const error = new PaymentDeclinedError('Insufficient funds');

    expect(error.code).toBe('PAYMENT_DECLINED');
    expect(error.statusCode).toBe(402);
    expect(error.message).toBe('Insufficient funds');
  });

  it('includes decline reason in details', () => {
    const error = new PaymentDeclinedError('Card declined', { reason: 'insufficient_funds' });

    expect(error.details).toEqual({ reason: 'insufficient_funds' });
  });
});

describe('ItemUnavailableError', () => {
  it('creates item unavailable error with 409 status', () => {
    const error = new ItemUnavailableError('Vanilla Latte');

    expect(error.code).toBe('ITEM_UNAVAILABLE');
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Vanilla Latte is currently unavailable');
  });

  it('includes item details', () => {
    const error = new ItemUnavailableError('Oat Milk', { itemId: 'mod-123' });

    expect(error.details).toEqual({ itemId: 'mod-123' });
  });
});

describe('SyncError', () => {
  it('creates sync error with appropriate status', () => {
    const error = new SyncError('Catalog sync failed');

    expect(error.code).toBe('POS_SYNC_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Catalog sync failed');
  });

  it('indicates retryability', () => {
    const error = new SyncError('Temporary failure', true, { retryAfter: 30 });

    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ retryAfter: 30 });
  });

  it('defaults to non-retryable', () => {
    const error = new SyncError('Permanent failure');

    expect(error.retryable).toBe(false);
  });

  it('handles auth expiry case', () => {
    const error = new SyncError('OAuth token expired', false, undefined, 'POS_AUTH_EXPIRED');

    expect(error.code).toBe('POS_AUTH_EXPIRED');
  });
});

describe('RateLimitError', () => {
  it('creates rate limit error with 429 status', () => {
    const error = new RateLimitError();

    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe('Too many requests');
  });

  it('includes retry after in details', () => {
    const error = new RateLimitError(60);

    expect(error.details).toEqual({ retryAfter: 60 });
    expect(error.message).toBe('Too many requests. Please retry after 60 seconds');
  });
});

describe('isAppError', () => {
  it('returns true for AppError instances', () => {
    expect(isAppError(new AppError('TEST', 'Test'))).toBe(true);
    expect(isAppError(new ValidationError('Test'))).toBe(true);
    expect(isAppError(new NotFoundError('Test'))).toBe(true);
  });

  it('returns false for non-AppError instances', () => {
    expect(isAppError(new Error('Test'))).toBe(false);
    expect(isAppError({ code: 'TEST', message: 'Test' })).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });
});

describe('toErrorResponse', () => {
  it('converts AppError to response format', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });
    const response = toErrorResponse(error);

    expect(response).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email' },
      },
    });
  });

  it('converts unknown error to generic response', () => {
    const error = new Error('Something went wrong');
    const response = toErrorResponse(error);

    expect(response).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  it('handles null/undefined errors', () => {
    const response = toErrorResponse(null);

    expect(response).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
});
