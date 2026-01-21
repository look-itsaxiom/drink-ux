/**
 * Error Handler Middleware
 *
 * Centralized error handling for Express routes.
 * Converts errors to consistent API response format.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, toErrorResponse } from '../utils/errors';

/**
 * Express error handler middleware
 *
 * Should be registered as the last middleware in the chain.
 * Handles all errors thrown in routes and converts them to
 * consistent API response format.
 *
 * @example
 * ```typescript
 * import { errorHandler } from './middleware/errorHandler';
 *
 * const app = express();
 *
 * // ... routes ...
 *
 * // Error handler must be last
 * app.use(errorHandler);
 * ```
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Log error for debugging
  const logDetails: Record<string, unknown> = {
    method: req.method,
    path: req.path,
  };

  if (error instanceof AppError) {
    logDetails.code = error.code;
    logDetails.message = error.message;
    logDetails.statusCode = error.statusCode;
    if (error.details) {
      logDetails.details = error.details;
    }
  } else if (error instanceof Error) {
    logDetails.name = error.name;
    logDetails.message = error.message;
    logDetails.stack = error.stack;
  }

  console.error('Error:', logDetails);

  // Convert to response format
  const response = toErrorResponse(error);

  // Get status code
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  res.status(statusCode).json(response);
}

/**
 * Async route handler wrapper
 *
 * Wraps async route handlers to automatically catch errors
 * and pass them to the error handler middleware.
 *
 * @example
 * ```typescript
 * import { asyncHandler } from './middleware/errorHandler';
 *
 * router.get('/orders/:id', asyncHandler(async (req, res) => {
 *   const order = await orderService.getOrder(req.params.id);
 *   if (!order) {
 *     throw new NotFoundError('Order', req.params.id);
 *   }
 *   res.json({ success: true, data: order });
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for undefined routes
 *
 * Use as a catch-all route handler before the error handler.
 *
 * @example
 * ```typescript
 * import { notFoundHandler, errorHandler } from './middleware/errorHandler';
 *
 * // ... routes ...
 *
 * // 404 handler for undefined routes
 * app.use(notFoundHandler);
 *
 * // Error handler must be last
 * app.use(errorHandler);
 * ```
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
