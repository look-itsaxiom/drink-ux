/**
 * Theme Service
 * Handles fetching business theme configuration from the API
 */

/**
 * Business theme configuration from API
 */
export interface BusinessTheme {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  fontFamily?: string;
}

/**
 * Custom error class for theme service errors
 */
export class ThemeServiceError extends Error {
  code: string;

  constructor(message: string, code: string = 'THEME_ERROR') {
    super(message);
    this.name = 'ThemeServiceError';
    this.code = code;
  }
}

/**
 * Options for fetching business theme
 */
export interface FetchThemeOptions {
  apiBaseUrl?: string;
  timeout?: number;
}

/**
 * Default API base URL for development
 */
const DEFAULT_API_BASE_URL = 'http://localhost:3001';

/**
 * Default timeout for API requests (10 seconds)
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Get the API base URL for theme service
 * @param configuredUrl - Optional configured URL
 * @returns The API base URL to use
 */
function getThemeApiBaseUrl(configuredUrl?: string): string {
  return configuredUrl || DEFAULT_API_BASE_URL;
}

/**
 * Fetch business theme from the API
 *
 * @param businessSlug - The business slug to fetch theme for
 * @param options - Optional configuration for the request
 * @returns The business theme or null if not found/no theme configured
 * @throws ThemeServiceError for network or server errors
 */
export async function fetchBusinessTheme(
  businessSlug: string,
  options: FetchThemeOptions = {}
): Promise<BusinessTheme | null> {
  // Validate business slug
  if (!businessSlug || businessSlug.trim() === '') {
    throw new ThemeServiceError(
      'Business slug is required',
      'INVALID_SLUG'
    );
  }

  const { apiBaseUrl, timeout = DEFAULT_TIMEOUT } = options;
  const baseUrl = getThemeApiBaseUrl(apiBaseUrl);
  const url = `${baseUrl}/api/business/${encodeURIComponent(businessSlug.trim())}`;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 404 - business not found, return null
    if (response.status === 404) {
      return null;
    }

    // Handle other error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.error?.message || `HTTP error ${response.status}`;
      throw new ThemeServiceError(errorMessage, 'HTTP_ERROR');
    }

    // Parse successful response
    const data = await response.json();

    if (!data.success) {
      throw new ThemeServiceError(
        data.error?.message || 'API returned unsuccessful response',
        data.error?.code || 'API_ERROR'
      );
    }

    // Return theme from response (may be null if business has no theme)
    return data.data?.theme || null;
  } catch (error) {
    clearTimeout(timeoutId);

    // Re-throw ThemeServiceError as-is
    if (error instanceof ThemeServiceError) {
      throw error;
    }

    // Handle abort/timeout errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ThemeServiceError('Request timeout', 'TIMEOUT');
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ThemeServiceError('Network error', 'NETWORK_ERROR');
    }

    // Handle other errors
    throw new ThemeServiceError(
      error instanceof Error ? error.message : 'Unknown error',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Type guard to check if a value is a valid BusinessTheme
 */
export function isBusinessTheme(value: unknown): value is BusinessTheme {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const theme = value as Record<string, unknown>;

  // Check that if properties exist, they are strings or undefined
  const validString = (v: unknown) =>
    v === undefined || typeof v === 'string';

  return (
    validString(theme.primaryColor) &&
    validString(theme.secondaryColor) &&
    validString(theme.logoUrl) &&
    validString(theme.fontFamily)
  );
}
