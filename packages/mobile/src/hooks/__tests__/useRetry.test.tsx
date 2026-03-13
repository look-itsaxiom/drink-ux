/**
 * Tests for useRetry Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useRetry } from '../useRetry';

describe('useRetry', () => {
  describe('Happy path', () => {
    it('executes function successfully on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const { result } = renderHook(() =>
        useRetry({
          fn,
          immediate: true,
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBe('success');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('returns data on success', async () => {
      const fn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });

      const { result } = renderHook(() =>
        useRetry({
          fn,
          immediate: true,
        })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual({ id: 1, name: 'Test' });
      });
    });

    it('does not execute immediately when immediate is false', () => {
      const fn = vi.fn().mockResolvedValue('success');

      const { result } = renderHook(() =>
        useRetry({
          fn,
          immediate: false,
        })
      );

      expect(fn).not.toHaveBeenCalled();
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('executes on manual retry', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const { result } = renderHook(() =>
        useRetry({
          fn,
          immediate: false,
        })
      );

      expect(fn).not.toHaveBeenCalled();

      // Trigger manual retry
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toBe('success');
      });

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry logic', () => {
    it('retries on failure with short delay', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() =>
        useRetry({
          fn,
          maxRetries: 3,
          delay: 10, // Short delay for testing
          immediate: true,
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBe('success');
      }, { timeout: 3000 });

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('respects maxRetries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

      const { result } = renderHook(() =>
        useRetry({
          fn,
          maxRetries: 2,
          delay: 10,
          immediate: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      }, { timeout: 3000 });

      // Initial + 2 retries = 3 calls
      expect(fn).toHaveBeenCalledTimes(3);
      expect(result.current.error?.message).toBe('Always fails');
    });

    it('calls onRetry callback with attempt number', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce('success');
      const onRetry = vi.fn();

      renderHook(() =>
        useRetry({
          fn,
          maxRetries: 3,
          delay: 10,
          onRetry,
          immediate: true,
        })
      );

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
      }, { timeout: 3000 });
    });
  });

  describe('Edge cases', () => {
    it('gives up after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Permanent failure'));

      const { result } = renderHook(() =>
        useRetry({
          fn,
          maxRetries: 1,
          delay: 10,
          immediate: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error?.message).toBe('Permanent failure');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isRetrying).toBe(false);
      }, { timeout: 3000 });
    });

    it('allows manual retry after max retries reached', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() =>
        useRetry({
          fn,
          maxRetries: 1,
          delay: 10,
          immediate: true,
        })
      );

      // Wait for automatic retries to complete
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      }, { timeout: 3000 });

      expect(fn).toHaveBeenCalledTimes(2);

      // Manual retry should work
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toBe('success');
      }, { timeout: 3000 });

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('tracks attempt count', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() =>
        useRetry({
          fn,
          maxRetries: 2,
          delay: 10,
          immediate: true,
        })
      );

      // Wait for completion
      await waitFor(() => {
        expect(result.current.data).toBe('success');
      }, { timeout: 3000 });

      // Should have recorded multiple attempts
      expect(result.current.attempt).toBeGreaterThan(1);
    });
  });

  describe('Loading states', () => {
    it('sets isLoading during initial request', async () => {
      let resolvePromise: (value: string) => void;
      const fn = vi.fn().mockImplementation(() => new Promise<string>((resolve) => {
        resolvePromise = resolve;
      }));

      const { result } = renderHook(() =>
        useRetry({
          fn,
          immediate: true,
        })
      );

      // Should be loading immediately after the fn is called
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      act(() => {
        resolvePromise!('success');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBe('success');
      });
    });
  });

  describe('Configuration', () => {
    it('uses default values when not specified', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const { result } = renderHook(() =>
        useRetry({
          fn,
          immediate: true,
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBe('success');
      });

      // Default maxRetries is 3, but we succeeded first time
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('handles exponential backoff', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() =>
        useRetry({
          fn,
          maxRetries: 2,
          delay: 10,
          backoff: 'exponential',
          immediate: true,
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBe('success');
      }, { timeout: 3000 });

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
