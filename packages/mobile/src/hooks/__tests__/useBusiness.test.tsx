import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AccountState } from '@drink-ux/shared';
import { useBusiness } from '../useBusiness';
import { BusinessConfigData } from '../../services/businessService';
import { createMockResponse, createMockErrorResponse } from '../../test/setup';

describe('useBusiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset location
    Object.assign(window.location, {
      hostname: 'localhost',
      search: '',
    });
  });

  const mockBusinessData: BusinessConfigData = {
    id: 'biz-123',
    name: 'Test Coffee Shop',
    slug: 'test-coffee-shop',
    accountState: AccountState.ACTIVE,
    theme: {
      primaryColor: '#6B4423',
      secondaryColor: '#D4A574',
      logoUrl: 'https://example.com/logo.png',
    },
    catalogSummary: {
      categoryCount: 5,
      itemCount: 20,
    },
  };

  describe('initial state', () => {
    it('should start with loading true when subdomain is present', () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '?business=test-coffee-shop',
      });

      // Mock a pending fetch
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useBusiness());

      expect(result.current.loading).toBe(true);
      expect(result.current.business).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should have loading false and error when no subdomain', () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '',
      });

      const { result } = renderHook(() => useBusiness());

      expect(result.current.loading).toBe(false);
      expect(result.current.business).toBeNull();
      expect(result.current.error).toBe('No business specified');
    });
  });

  describe('successful fetch', () => {
    it('should fetch and return business data', async () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '?business=test-coffee-shop',
      });

      const mockResponse = createMockResponse({
        success: true,
        data: mockBusinessData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useBusiness());

      // Initially loading
      expect(result.current.loading).toBe(true);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.business).toEqual(mockBusinessData);
      expect(result.current.error).toBeNull();
    });

    it('should extract subdomain from production domain', async () => {
      Object.assign(window.location, {
        hostname: 'test-coffee-shop.drink-ux.com',
        search: '',
      });

      const mockResponse = createMockResponse({
        success: true,
        data: mockBusinessData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useBusiness());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/business/test-coffee-shop'),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle business not found error', async () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '?business=invalid-slug',
      });

      const mockError = createMockErrorResponse(
        'BUSINESS_NOT_FOUND',
        "Business 'invalid-slug' not found",
        404
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      const { result } = renderHook(() => useBusiness());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.business).toBeNull();
      expect(result.current.error).toBe("Business 'invalid-slug' not found");
    });

    it('should handle network error', async () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '?business=test-coffee-shop',
      });

      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const { result } = renderHook(() => useBusiness());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.business).toBeNull();
      expect(result.current.error).toBe('Unable to connect to server');
    });

    it('should handle server error', async () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '?business=test-coffee-shop',
      });

      const mockError = createMockErrorResponse(
        'INTERNAL_ERROR',
        'Server error',
        500
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      const { result } = renderHook(() => useBusiness());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.business).toBeNull();
      expect(result.current.error).toBe('Server error');
    });
  });

  describe('refetch', () => {
    it('should allow manual refetch', async () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '?business=test-coffee-shop',
      });

      // First call fails
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const { result } = renderHook(() => useBusiness());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Unable to connect to server');

      // Second call succeeds
      const mockResponse = createMockResponse({
        success: true,
        data: mockBusinessData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.business).toEqual(mockBusinessData);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('subdomain prop override', () => {
    it('should use provided subdomain instead of URL', async () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '?business=url-business',
      });

      const mockResponse = createMockResponse({
        success: true,
        data: mockBusinessData,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useBusiness({ subdomain: 'override-business' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/business/override-business'),
        expect.any(Object)
      );
    });
  });
});
