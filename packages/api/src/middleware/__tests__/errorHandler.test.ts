/**
 * Tests for Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../errorHandler';
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
} from '../../utils/errors';

// Mock console.error to prevent noise in test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('errorHandler middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusFn: jest.Mock;
  let jsonFn: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/api/test',
    };

    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });

    mockResponse = {
      status: statusFn,
      json: jsonFn,
    };

    mockNext = jest.fn();
  });

  describe('AppError handling', () => {
    it('handles ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email' },
        },
      });
    });

    it('handles AuthenticationError correctly', () => {
      const error = new AuthenticationError('Session expired', 'AUTH_EXPIRED');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_EXPIRED',
          message: 'Session expired',
        },
      });
    });

    it('handles AuthorizationError correctly', () => {
      const error = new AuthorizationError('Not allowed');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Not allowed',
        },
      });
    });

    it('handles NotFoundError correctly', () => {
      const error = new NotFoundError('Business', 'slug-123', 'BUSINESS_NOT_FOUND');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(404);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: 'Business slug-123 not found',
        },
      });
    });

    it('handles POSUnavailableError correctly', () => {
      const error = new POSUnavailableError('POS system down', { retryAfter: 60 });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(503);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'POS_UNAVAILABLE',
          message: 'POS system down',
          details: { retryAfter: 60 },
        },
      });
    });

    it('handles PaymentDeclinedError correctly', () => {
      const error = new PaymentDeclinedError('Card declined', { reason: 'insufficient_funds' });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(402);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PAYMENT_DECLINED',
          message: 'Card declined',
          details: { reason: 'insufficient_funds' },
        },
      });
    });

    it('handles ItemUnavailableError correctly', () => {
      const error = new ItemUnavailableError('Vanilla Latte', { itemId: 'item-123' });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(409);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ITEM_UNAVAILABLE',
          message: 'Vanilla Latte is currently unavailable',
          details: { itemId: 'item-123' },
        },
      });
    });

    it('handles SyncError correctly', () => {
      const error = new SyncError('Sync failed', true, { retryAfter: 30 });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'POS_SYNC_ERROR',
          message: 'Sync failed',
          details: { retryAfter: 30 },
        },
      });
    });

    it('handles RateLimitError correctly', () => {
      const error = new RateLimitError(60);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(429);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please retry after 60 seconds',
          details: { retryAfter: 60 },
        },
      });
    });

    it('handles generic AppError correctly', () => {
      const error = new AppError('CUSTOM_ERROR', 'Custom error message', 418, { custom: 'data' });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(418);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error message',
          details: { custom: 'data' },
        },
      });
    });
  });

  describe('Unknown error handling', () => {
    it('handles standard Error as 500', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('handles TypeError as 500', () => {
      const error = new TypeError('Cannot read property of undefined');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('handles string errors as 500', () => {
      const error = 'String error';

      errorHandler(error as unknown as Error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('handles null errors as 500', () => {
      errorHandler(null as unknown as Error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });
  });

  describe('Logging', () => {
    it('logs all errors', () => {
      const error = new ValidationError('Test');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(console.error).toHaveBeenCalled();
    });

    it('logs error details for debugging', () => {
      const error = new ValidationError('Test error', { field: 'test' });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Test error',
        })
      );
    });

    it('includes request info in log', () => {
      const error = new ValidationError('Test');
      const customRequest = {
        method: 'POST',
        path: '/api/orders',
      } as Partial<Request>;

      errorHandler(error, customRequest as Request, mockResponse as Response, mockNext);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.objectContaining({
          method: 'POST',
          path: '/api/orders',
        })
      );
    });
  });

  describe('Error without details', () => {
    it('does not include details key when undefined', () => {
      const error = new ValidationError('No details here');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = jsonFn.mock.calls[0][0];
      expect(response.error).not.toHaveProperty('details');
    });
  });

  describe('Response format', () => {
    it('always returns success: false', () => {
      const errors = [
        new ValidationError('Test'),
        new AuthenticationError(),
        new Error('Unknown'),
      ];

      for (const error of errors) {
        errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
        const response = jsonFn.mock.calls[jsonFn.mock.calls.length - 1][0];
        expect(response.success).toBe(false);
      }
    });

    it('always includes error code and message', () => {
      const error = new AppError('TEST', 'Test message', 500);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = jsonFn.mock.calls[0][0];
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
    });
  });
});
