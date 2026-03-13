/**
 * API Client for drink-ux mobile app
 * Provides typed fetch wrapper with error handling
 */

import { ApiResponse, ApiError } from '@drink-ux/shared';

// Default timeout in milliseconds (30 seconds)
const DEFAULT_TIMEOUT = 30000;

/**
 * Get the API base URL from environment or use default
 */
export function getApiBaseUrl(): string {
  // Check for environment variable first (Vite uses import.meta.env)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Default to localhost for development
  return 'http://localhost:3001';
}

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(error: ApiError, status: number) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

/**
 * Options for API requests
 */
export interface RequestOptions {
  /** Authorization token */
  token?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Makes a fetch request with error handling and timeout
 */
async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { token, timeout = DEFAULT_TIMEOUT, headers = {}, signal } = options;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  // Set up abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  // Combine signals if one was provided
  const combinedSignal = signal
    ? combineAbortSignals(signal, abortController.signal)
    : abortController.signal;

  try {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
      signal: combinedSignal,
    };

    if (body !== undefined && (method === 'POST' || method === 'PUT')) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);

    // Parse JSON response
    const json = await response.json() as ApiResponse<T>;

    // Handle error responses
    if (!response.ok || !json.success) {
      const error: ApiError = json.error || {
        code: 'UNKNOWN_ERROR',
        message: `Request failed with status ${response.status}`,
      };
      throw new ApiClientError(error, response.status);
    }

    return json.data as T;
  } catch (error) {
    // Re-throw ApiClientError as-is
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Handle abort/timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError(
        { code: 'TIMEOUT', message: 'Request timed out' },
        0
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiClientError(
        { code: 'NETWORK_ERROR', message: 'Unable to connect to server' },
        0
      );
    }

    // Unknown error
    throw new ApiClientError(
      { code: 'UNKNOWN_ERROR', message: String(error) },
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Combine multiple abort signals into one
 */
function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * API client with typed methods
 */
export const apiClient = {
  /**
   * Make a GET request
   */
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },

  /**
   * Make a POST request
   */
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', path, body, options);
  },

  /**
   * Make a PUT request
   */
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PUT', path, body, options);
  },

  /**
   * Make a DELETE request
   */
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },
};

export default apiClient;
