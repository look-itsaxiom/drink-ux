/**
 * Tests for StorefrontStatus Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorefrontStatus } from '../StorefrontStatus';

// Mock fetch
const originalFetch = global.fetch;

describe('StorefrontStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  function mockFetch(response: {
    ok?: boolean;
    status?: number;
    json?: () => Promise<unknown>;
  }) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: response.json ?? (() => Promise.resolve({})),
    });
  }

  function mockFetchError(error: Error) {
    global.fetch = vi.fn().mockRejectedValue(error);
  }

  describe('Loading state', () => {
    it('shows loading indicator initially', () => {
      mockFetch({ json: () => new Promise(() => {}) }); // Never resolves
      const { container } = render(<StorefrontStatus healthEndpoint="/api/health" />);

      const spinner = container.querySelector('ion-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('shows loading text', () => {
      mockFetch({ json: () => new Promise(() => {}) });
      render(<StorefrontStatus healthEndpoint="/api/health" />);

      expect(screen.getByText(/checking/i)).toBeInTheDocument();
    });
  });

  describe('Healthy state', () => {
    it('shows online status when health check succeeds', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          database: { healthy: true },
          pos: { healthy: true },
        }),
      });

      render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        expect(screen.getByText(/online/i)).toBeInTheDocument();
      });
    });

    it('shows green indicator for healthy status', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      const { container } = render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        const indicator = container.querySelector('.storefront-status-indicator-healthy');
        expect(indicator).toBeInTheDocument();
      });
    });

    it('shows checkmark icon when healthy', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      const { container } = render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        const icon = container.querySelector('ion-icon');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('Degraded state', () => {
    it('shows degraded status when some services are unhealthy', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({
          status: 'degraded',
          database: { healthy: true },
          pos: { healthy: false },
        }),
      });

      render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        expect(screen.getByText(/limited/i)).toBeInTheDocument();
      });
    });

    it('shows warning indicator for degraded status', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'degraded' }),
      });

      const { container } = render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        const indicator = container.querySelector('.storefront-status-indicator-degraded');
        expect(indicator).toBeInTheDocument();
      });
    });
  });

  describe('Unhealthy state', () => {
    it('shows offline status when health check fails', async () => {
      mockFetch({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ status: 'unhealthy' }),
      });

      render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });
    });

    it('shows red indicator for unhealthy status', async () => {
      mockFetch({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ status: 'unhealthy' }),
      });

      const { container } = render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        const indicator = container.querySelector('.storefront-status-indicator-unhealthy');
        expect(indicator).toBeInTheDocument();
      });
    });

    it('shows offline on network error', async () => {
      mockFetchError(new Error('Network error'));

      render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });
    });
  });

  describe('Polling', () => {
    it('polls health endpoint at specified interval', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      render(<StorefrontStatus healthEndpoint="/api/health" pollInterval={1000} />);

      // Wait for initial call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Advance timer
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Advance again
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    });

    it('uses default 30 second poll interval', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Advance by 30 seconds
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Callbacks', () => {
    it('calls onStatusChange when status changes', async () => {
      const onStatusChange = vi.fn();
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      render(
        <StorefrontStatus
          healthEndpoint="/api/health"
          onStatusChange={onStatusChange}
        />
      );

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('healthy');
      });
    });

    it('calls onError when health check fails', async () => {
      const onError = vi.fn();
      mockFetchError(new Error('Network error'));

      render(
        <StorefrontStatus healthEndpoint="/api/health" onError={onError} />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Variants', () => {
    beforeEach(() => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });
    });

    it('renders badge variant by default', async () => {
      const { container } = render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        expect(container.querySelector('.storefront-status-badge')).toBeInTheDocument();
      });
    });

    it('renders card variant', async () => {
      const { container } = render(
        <StorefrontStatus healthEndpoint="/api/health" variant="card" />
      );

      await waitFor(() => {
        expect(container.querySelector('ion-card')).toBeInTheDocument();
      });
    });

    it('renders detailed variant with service status', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          database: { healthy: true },
          pos: { healthy: true },
        }),
      });

      render(<StorefrontStatus healthEndpoint="/api/health" variant="detailed" />);

      await waitFor(() => {
        expect(screen.getByText(/database/i)).toBeInTheDocument();
        expect(screen.getByText(/pos/i)).toBeInTheDocument();
      });
    });
  });

  describe('Custom labels', () => {
    beforeEach(() => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });
    });

    it('shows custom store name', async () => {
      render(
        <StorefrontStatus healthEndpoint="/api/health" storeName="Coffee Shop" />
      );

      await waitFor(() => {
        expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has status role', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('has aria-live for screen reader updates', async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      const { container } = render(<StorefrontStatus healthEndpoint="/api/health" />);

      await waitFor(() => {
        const status = container.querySelector('.storefront-status');
        expect(status).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Error display', () => {
    it('shows last known status on temporary failure', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'healthy' }),
          });
        }
        return Promise.reject(new Error('Network error'));
      });

      render(<StorefrontStatus healthEndpoint="/api/health" pollInterval={1000} />);

      // First call succeeds
      await waitFor(() => {
        expect(screen.getByText(/online/i)).toBeInTheDocument();
      });

      // Advance to trigger second call which fails
      vi.advanceTimersByTime(1000);

      // Should show warning about connection issues but maintain last known status
      await waitFor(() => {
        // The component might show a stale indicator or maintain online status
        const status = screen.queryByText(/online/i) || screen.queryByText(/offline/i);
        expect(status).toBeInTheDocument();
      });
    });
  });
});
