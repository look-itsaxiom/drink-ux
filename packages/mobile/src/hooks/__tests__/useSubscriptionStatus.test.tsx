/**
 * Tests for useSubscriptionStatus Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSubscriptionStatus, clearSubscriptionCache } from '../useSubscriptionStatus';
import { createMockResponse, createMockErrorResponse } from '../../test/setup';

describe('useSubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear subscription status cache between tests
    clearSubscriptionCache();
    // Clear localStorage cache
    localStorage.clear();
  });

  afterEach(() => {
    // Reset location
    Object.assign(window.location, {
      hostname: 'localhost',
      search: '',
    });
  });

  // Mock subscription response data
  const mockActiveSubscription = {
    status: 'active' as const,
    expiresAt: null,
    gracePeriodDays: null,
  };

  const mockTrialSubscription = {
    status: 'trial' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    gracePeriodDays: null,
  };

  const mockGracePeriodSubscription = {
    status: 'grace_period' as const,
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    gracePeriodDays: 5,
  };

  const mockSuspendedSubscription = {
    status: 'suspended' as const,
    expiresAt: null,
    gracePeriodDays: null,
  };

  const mockInactiveSubscription = {
    status: 'inactive' as const,
    expiresAt: null,
    gracePeriodDays: null,
  };

  describe('Happy Path: Returns active status for subscribed business', () => {
    it('should return active status and canAccessStorefront true', async () => {
      Object.assign(window.location, {
        hostname: 'localhost',
        search: '?business=test-coffee-shop',
      });

      const mockResponse = createMockResponse({
        success: true,
        data: mockActiveSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      // Initially loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe('active');
      expect(result.current.isActive).toBe(true);
      expect(result.current.isTrial).toBe(false);
      expect(result.current.isGracePeriod).toBe(false);
      expect(result.current.gracePeriodDays).toBeNull();
      expect(result.current.canAccessStorefront).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Success: Returns trial status during trial', () => {
    it('should return trial status with isActive and isTrial true', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockTrialSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe('trial');
      expect(result.current.isActive).toBe(true);
      expect(result.current.isTrial).toBe(true);
      expect(result.current.isGracePeriod).toBe(false);
      expect(result.current.canAccessStorefront).toBe(true);
    });
  });

  describe('Success: Returns grace period info', () => {
    it('should return grace period status with remaining days', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockGracePeriodSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe('grace_period');
      expect(result.current.isActive).toBe(false);
      expect(result.current.isTrial).toBe(false);
      expect(result.current.isGracePeriod).toBe(true);
      expect(result.current.gracePeriodDays).toBe(5);
      expect(result.current.canAccessStorefront).toBe(true);
    });
  });

  describe('Success: Returns suspended status', () => {
    it('should return suspended status with canAccessStorefront false', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockSuspendedSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe('suspended');
      expect(result.current.isActive).toBe(false);
      expect(result.current.canAccessStorefront).toBe(false);
    });
  });

  describe('Success: Returns inactive status', () => {
    it('should return inactive status with canAccessStorefront false', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockInactiveSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBe('inactive');
      expect(result.current.isActive).toBe(false);
      expect(result.current.canAccessStorefront).toBe(false);
    });
  });

  describe('Failure: Handles API errors', () => {
    it('should handle 404 error when business not found', async () => {
      const mockError = createMockErrorResponse(
        'BUSINESS_NOT_FOUND',
        "Business 'invalid-slug' not found",
        404
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'invalid-slug' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.status).toBeNull();
      expect(result.current.error).toBe("Business 'invalid-slug' not found");
      expect(result.current.canAccessStorefront).toBe(false);
    });

    it('should handle server error', async () => {
      const mockError = createMockErrorResponse(
        'INTERNAL_ERROR',
        'Server error',
        500
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.canAccessStorefront).toBe(false);
    });
  });

  describe('Edge: Handles network offline', () => {
    it('should handle network error gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Unable to connect to server');
      expect(result.current.canAccessStorefront).toBe(false);
    });
  });

  describe('Caching behavior', () => {
    it('should cache status with appropriate TTL', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockActiveSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      // First call
      const { result: result1 } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      // Second call should use cache (fetch called only once)
      const { result: result2 } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      expect(result2.current.status).toBe('active');
      // Fetch should have been called only once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Skip option', () => {
    it('should not fetch when skip is true', () => {
      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop', skip: true })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.status).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Refetch capability', () => {
    it('should allow manual refetch', async () => {
      // First call fails
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const { result } = renderHook(() =>
        useSubscriptionStatus({ subdomain: 'test-coffee-shop' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Unable to connect to server');

      // Second call succeeds
      const mockResponse = createMockResponse({
        success: true,
        data: mockActiveSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('active');
      });

      expect(result.current.error).toBeNull();
    });
  });
});
