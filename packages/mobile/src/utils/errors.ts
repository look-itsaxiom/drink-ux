/**
 * Mobile Error Utilities
 *
 * Provides user-friendly error handling for the mobile app.
 * Converts API errors to actionable user messages.
 */

import { ApiClientError } from '../services/api';

/**
 * Application error interface
 */
export interface AppError {
  /** Error code for programmatic handling */
  code: string;
  /** Technical error message (for logging) */
  message: string;
  /** User-friendly message for display */
  userMessage: string;
  /** Whether the operation can be retried */
  retryable: boolean;
  /** Suggested action for the user */
  action?: 'retry' | 'refresh' | 'login' | 'contact-support';
}

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Authentication
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',

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
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Network
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection and try again.',
  TIMEOUT: 'The request took too long. Please try again.',

  // Authentication
  AUTH_EXPIRED: 'Your session has expired. Please log in again.',
  AUTH_REQUIRED: 'Please log in to continue.',
  AUTH_INVALID: 'Invalid login credentials. Please try again.',

  // Business
  BUSINESS_NOT_FOUND: 'This shop could not be found. Please check the address.',
  BUSINESS_UNAVAILABLE: 'This shop is currently unavailable.',
  BUSINESS_SETUP: 'This shop is still being set up. Please check back soon.',

  // Orders
  ORDER_NOT_FOUND: 'Order not found. It may have been cancelled or expired.',
  ORDER_EXPIRED: 'This order has expired. Please place a new order.',
  ITEM_UNAVAILABLE: 'Some items in your order are no longer available. Please review your cart.',

  // Payment
  PAYMENT_DECLINED: 'Your payment was declined. Please try a different card.',
  PAYMENT_ERROR: 'There was a problem processing your payment. Please contact support.',
  PAYMENT_TIMEOUT: 'Payment processing timed out. Please try again.',

  // POS
  POS_UNAVAILABLE: 'The ordering system is temporarily unavailable. Please try again in a few minutes.',
  POS_SYNC_ERROR: 'There was a problem syncing with the ordering system.',
  POS_AUTH_EXPIRED: 'The shop needs to reconnect their payment system.',

  // General
  VALIDATION_ERROR: 'Please check your information and try again.',
  NOT_FOUND: 'The requested resource could not be found.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

/**
 * Error codes that can be retried
 */
const RETRYABLE_ERRORS = new Set([
  ERROR_CODES.NETWORK_ERROR,
  ERROR_CODES.TIMEOUT,
  ERROR_CODES.POS_UNAVAILABLE,
  ERROR_CODES.INTERNAL_ERROR,
  ERROR_CODES.PAYMENT_TIMEOUT,
]);

/**
 * Map error codes to suggested actions
 */
const ERROR_ACTIONS: Record<string, AppError['action']> = {
  // Network errors - retry
  [ERROR_CODES.NETWORK_ERROR]: 'retry',
  [ERROR_CODES.TIMEOUT]: 'retry',
  [ERROR_CODES.POS_UNAVAILABLE]: 'retry',
  [ERROR_CODES.INTERNAL_ERROR]: 'retry',
  [ERROR_CODES.PAYMENT_TIMEOUT]: 'retry',

  // Auth errors - login
  [ERROR_CODES.AUTH_EXPIRED]: 'login',
  [ERROR_CODES.AUTH_REQUIRED]: 'login',
  [ERROR_CODES.AUTH_INVALID]: 'login',

  // Business/item errors - refresh
  [ERROR_CODES.ITEM_UNAVAILABLE]: 'refresh',
  [ERROR_CODES.BUSINESS_UNAVAILABLE]: 'refresh',

  // Payment errors - contact support
  [ERROR_CODES.PAYMENT_ERROR]: 'contact-support',
};

/**
 * Parse an error into a standardized AppError
 *
 * @param error - The error to parse (can be any type)
 * @returns Standardized AppError object
 *
 * @example
 * ```typescript
 * try {
 *   await submitOrder(order);
 * } catch (err) {
 *   const appError = parseApiError(err);
 *   showToast(appError.userMessage);
 *   if (appError.retryable) {
 *     showRetryButton();
 *   }
 * }
 * ```
 */
export function parseApiError(error: unknown): AppError {
  // Handle null/undefined
  if (error == null) {
    return createUnknownError('Unknown error occurred');
  }

  // Handle ApiClientError
  if (error instanceof ApiClientError) {
    const code = error.code || ERROR_CODES.UNKNOWN_ERROR;
    return {
      code,
      message: error.message,
      userMessage: getUserMessage(code),
      retryable: isRetryable(code),
      action: getErrorAction(code),
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    return createUnknownError(error.message);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return createUnknownError(error);
  }

  // Handle unknown objects
  return createUnknownError('Unknown error occurred');
}

/**
 * Create an unknown error object
 */
function createUnknownError(message: string): AppError {
  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message,
    userMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
    retryable: false,
    action: undefined,
  };
}

/**
 * Get a user-friendly message for an error code
 *
 * @param code - The error code
 * @returns User-friendly error message
 */
export function getUserMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Check if an error code represents a retryable error
 *
 * @param code - The error code
 * @returns True if the error can be retried
 */
export function isRetryable(code: string): boolean {
  return RETRYABLE_ERRORS.has(code);
}

/**
 * Get the suggested action for an error code
 *
 * @param code - The error code
 * @returns Suggested action or undefined
 */
export function getErrorAction(code: string): AppError['action'] | undefined {
  return ERROR_ACTIONS[code];
}

/**
 * Format error for logging (includes technical details)
 */
export function formatErrorForLogging(error: unknown): string {
  if (error instanceof ApiClientError) {
    return `[${error.code}] ${error.message} (HTTP ${error.status})`;
  }

  if (error instanceof Error) {
    return `[Error] ${error.message}`;
  }

  return `[Unknown] ${String(error)}`;
}
