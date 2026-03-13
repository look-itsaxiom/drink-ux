/**
 * Tests for Mobile Error Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  parseApiError,
  getUserMessage,
  isRetryable,
  getErrorAction,
  ERROR_MESSAGES,
  ERROR_CODES,
} from '../errors';
import { ApiClientError } from '../../services/api';

describe('parseApiError', () => {
  it('parses ApiClientError correctly', () => {
    const apiError = new ApiClientError(
      { code: 'VALIDATION_ERROR', message: 'Invalid input' },
      400
    );

    const result = parseApiError(apiError);

    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('Invalid input');
    expect(result.userMessage).toBe(ERROR_MESSAGES.VALIDATION_ERROR);
    expect(result.retryable).toBe(false);
  });

  it('parses network error', () => {
    const networkError = new ApiClientError(
      { code: 'NETWORK_ERROR', message: 'Unable to connect' },
      0
    );

    const result = parseApiError(networkError);

    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.retryable).toBe(true);
    expect(result.action).toBe('retry');
  });

  it('parses timeout error', () => {
    const timeoutError = new ApiClientError(
      { code: 'TIMEOUT', message: 'Request timed out' },
      0
    );

    const result = parseApiError(timeoutError);

    expect(result.code).toBe('TIMEOUT');
    expect(result.retryable).toBe(true);
  });

  it('parses POS unavailable error', () => {
    const posError = new ApiClientError(
      { code: 'POS_UNAVAILABLE', message: 'POS down' },
      503
    );

    const result = parseApiError(posError);

    expect(result.code).toBe('POS_UNAVAILABLE');
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toBe(ERROR_MESSAGES.POS_UNAVAILABLE);
  });

  it('parses authentication error', () => {
    const authError = new ApiClientError(
      { code: 'AUTH_EXPIRED', message: 'Session expired' },
      401
    );

    const result = parseApiError(authError);

    expect(result.code).toBe('AUTH_EXPIRED');
    expect(result.retryable).toBe(false);
    expect(result.action).toBe('login');
  });

  it('parses payment declined error', () => {
    const paymentError = new ApiClientError(
      { code: 'PAYMENT_DECLINED', message: 'Insufficient funds' },
      402
    );

    const result = parseApiError(paymentError);

    expect(result.code).toBe('PAYMENT_DECLINED');
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toBe(ERROR_MESSAGES.PAYMENT_DECLINED);
  });

  it('parses generic Error', () => {
    const genericError = new Error('Something went wrong');

    const result = parseApiError(genericError);

    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('Something went wrong');
    expect(result.retryable).toBe(false);
  });

  it('parses unknown error object', () => {
    const unknownError = { foo: 'bar' };

    const result = parseApiError(unknownError);

    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.retryable).toBe(false);
  });

  it('parses null error', () => {
    const result = parseApiError(null);

    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.retryable).toBe(false);
  });

  it('parses undefined error', () => {
    const result = parseApiError(undefined);

    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.retryable).toBe(false);
  });

  it('parses string error', () => {
    const result = parseApiError('Error message');

    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('Error message');
  });
});

describe('getUserMessage', () => {
  it('returns friendly message for NETWORK_ERROR', () => {
    const message = getUserMessage('NETWORK_ERROR');

    expect(message).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    expect(message).toContain('connection');
  });

  it('returns friendly message for POS_UNAVAILABLE', () => {
    const message = getUserMessage('POS_UNAVAILABLE');

    expect(message).toBe(ERROR_MESSAGES.POS_UNAVAILABLE);
    expect(message).toContain('temporarily');
  });

  it('returns friendly message for PAYMENT_DECLINED', () => {
    const message = getUserMessage('PAYMENT_DECLINED');

    expect(message).toBe(ERROR_MESSAGES.PAYMENT_DECLINED);
    expect(message).toContain('declined');
  });

  it('returns friendly message for AUTH_EXPIRED', () => {
    const message = getUserMessage('AUTH_EXPIRED');

    expect(message).toBe(ERROR_MESSAGES.AUTH_EXPIRED);
    expect(message).toContain('session');
  });

  it('returns friendly message for ITEM_UNAVAILABLE', () => {
    const message = getUserMessage('ITEM_UNAVAILABLE');

    expect(message).toBe(ERROR_MESSAGES.ITEM_UNAVAILABLE);
    expect(message.toLowerCase()).toContain('available');
  });

  it('returns generic message for unknown codes', () => {
    const message = getUserMessage('UNKNOWN_CODE_XYZ');

    expect(message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
  });
});

describe('isRetryable', () => {
  it('returns true for network errors', () => {
    expect(isRetryable('NETWORK_ERROR')).toBe(true);
    expect(isRetryable('TIMEOUT')).toBe(true);
  });

  it('returns true for 5xx errors', () => {
    expect(isRetryable('POS_UNAVAILABLE')).toBe(true);
    expect(isRetryable('INTERNAL_ERROR')).toBe(true);
  });

  it('returns false for 4xx errors', () => {
    expect(isRetryable('VALIDATION_ERROR')).toBe(false);
    expect(isRetryable('NOT_FOUND')).toBe(false);
    expect(isRetryable('AUTH_EXPIRED')).toBe(false);
    expect(isRetryable('PAYMENT_DECLINED')).toBe(false);
  });

  it('returns false for unknown errors', () => {
    expect(isRetryable('UNKNOWN_ERROR')).toBe(false);
  });
});

describe('getErrorAction', () => {
  it('returns retry for network errors', () => {
    expect(getErrorAction('NETWORK_ERROR')).toBe('retry');
    expect(getErrorAction('TIMEOUT')).toBe('retry');
    expect(getErrorAction('POS_UNAVAILABLE')).toBe('retry');
  });

  it('returns login for auth errors', () => {
    expect(getErrorAction('AUTH_EXPIRED')).toBe('login');
    expect(getErrorAction('AUTH_REQUIRED')).toBe('login');
  });

  it('returns refresh for business state errors', () => {
    expect(getErrorAction('ITEM_UNAVAILABLE')).toBe('refresh');
  });

  it('returns contact-support for payment errors', () => {
    expect(getErrorAction('PAYMENT_ERROR')).toBe('contact-support');
  });

  it('returns undefined for unknown errors', () => {
    expect(getErrorAction('UNKNOWN_ERROR')).toBeUndefined();
    expect(getErrorAction('VALIDATION_ERROR')).toBeUndefined();
  });
});

describe('ERROR_MESSAGES', () => {
  it('has user-friendly messages', () => {
    // Messages should be user-friendly and not technical
    Object.values(ERROR_MESSAGES).forEach((message) => {
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(10);
      // Should not contain technical jargon
      expect(message.toLowerCase()).not.toContain('exception');
      expect(message.toLowerCase()).not.toContain('error code');
    });
  });

  it('provides helpful instructions', () => {
    // Network error should suggest checking connection
    expect(ERROR_MESSAGES.NETWORK_ERROR.toLowerCase()).toMatch(/check|try|internet|connection/);

    // Auth error should suggest logging in
    expect(ERROR_MESSAGES.AUTH_EXPIRED.toLowerCase()).toMatch(/log|sign|session/);

    // Payment error should suggest trying different card
    expect(ERROR_MESSAGES.PAYMENT_DECLINED.toLowerCase()).toMatch(/card|try|different/);
  });
});

describe('ERROR_CODES', () => {
  it('contains all expected error codes', () => {
    expect(ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ERROR_CODES.TIMEOUT).toBe('TIMEOUT');
    expect(ERROR_CODES.AUTH_EXPIRED).toBe('AUTH_EXPIRED');
    expect(ERROR_CODES.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
    expect(ERROR_CODES.POS_UNAVAILABLE).toBe('POS_UNAVAILABLE');
    expect(ERROR_CODES.PAYMENT_DECLINED).toBe('PAYMENT_DECLINED');
    expect(ERROR_CODES.ITEM_UNAVAILABLE).toBe('ITEM_UNAVAILABLE');
    expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
  });
});

describe('AppError interface', () => {
  it('has required properties', () => {
    const error: AppError = {
      code: 'TEST_ERROR',
      message: 'Test error message',
      userMessage: 'Something went wrong',
      retryable: true,
      action: 'retry',
    };

    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test error message');
    expect(error.userMessage).toBe('Something went wrong');
    expect(error.retryable).toBe(true);
    expect(error.action).toBe('retry');
  });

  it('allows optional action', () => {
    const error: AppError = {
      code: 'TEST_ERROR',
      message: 'Test',
      userMessage: 'Test',
      retryable: false,
    };

    expect(error.action).toBeUndefined();
  });
});
