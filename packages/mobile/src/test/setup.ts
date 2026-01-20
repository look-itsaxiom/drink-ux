import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';

// Mock localStorage for jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.matchMedia for theme/media query tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock CSS custom properties for testing
const cssVariables: Record<string, string> = {};
const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;

CSSStyleDeclaration.prototype.setProperty = function(
  property: string,
  value: string
) {
  if (property.startsWith('--')) {
    cssVariables[property] = value;
  }
  return originalSetProperty.call(this, property, value);
};

CSSStyleDeclaration.prototype.getPropertyValue = function(property: string) {
  if (property.startsWith('--') && cssVariables[property]) {
    return cssVariables[property];
  }
  return originalGetPropertyValue.call(this, property);
};

// Export helper to get CSS variables in tests
export function getCSSVariable(name: string): string | undefined {
  return cssVariables[name];
}

// Export helper to clear CSS variables between tests
export function clearCSSVariables(): void {
  Object.keys(cssVariables).forEach((key) => delete cssVariables[key]);
}

// Mock window.location for subdomain detection
const mockLocation = {
  hostname: 'localhost',
  search: '',
  protocol: 'http:',
  host: 'localhost:3000',
  pathname: '/',
  href: 'http://localhost:3000/',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock fetch globally
const originalFetch = global.fetch;

beforeAll(() => {
  // Reset fetch before all tests
  global.fetch = vi.fn();
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();

  // Clear CSS variables
  clearCSSVariables();

  // Reset location to default
  Object.assign(window.location, {
    hostname: 'localhost',
    search: '',
  });
});

afterAll(() => {
  // Restore original fetch
  global.fetch = originalFetch;
});

// Helper to create mock API responses
export function createMockResponse<T>(data: T, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  } as Response;
}

// Helper to create mock API error responses
export function createMockErrorResponse(
  code: string,
  message: string,
  status: number = 400
) {
  return createMockResponse(
    {
      success: false,
      error: { code, message },
    },
    { ok: false, status }
  );
}

// Helper to simulate network error
export function createNetworkError() {
  return Promise.reject(new TypeError('Failed to fetch'));
}

// Helper to simulate timeout
export function createTimeoutError() {
  return Promise.reject(new DOMException('Aborted', 'AbortError'));
}
