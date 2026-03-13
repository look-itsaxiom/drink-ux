/**
 * Tests for SubscriptionGate Component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SubscriptionGate } from '../SubscriptionGate';
import { clearSubscriptionCache } from '../../../hooks/useSubscriptionStatus';
import { createMockResponse, createMockErrorResponse } from '../../../test/setup';

// Wrapper with Router
function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SubscriptionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSubscriptionCache();
    localStorage.clear();
  });

  // Mock subscription responses
  const mockActiveSubscription = {
    status: 'active' as const,
    expiresAt: null,
    gracePeriodDays: null,
  };

  const mockTrialSubscription = {
    status: 'trial' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    gracePeriodDays: null,
  };

  const mockGracePeriodSubscription = {
    status: 'grace_period' as const,
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
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

  describe('Happy Path: Renders children for active subscription', () => {
    it('should render children content when subscription is active', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockActiveSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      renderWithRouter(
        <SubscriptionGate subdomain="test-coffee-shop">
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      await waitFor(() => {
        expect(screen.getByTestId('storefront-content')).toBeInTheDocument();
      });

      expect(screen.getByText('Storefront Content')).toBeInTheDocument();
    });

    it('should render children when subscription is in trial', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockTrialSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      renderWithRouter(
        <SubscriptionGate subdomain="test-coffee-shop">
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      await waitFor(() => {
        expect(screen.getByTestId('storefront-content')).toBeInTheDocument();
      });
    });
  });

  describe('Success: Shows Coming Soon for inactive', () => {
    it('should show Coming Soon page when subscription is inactive', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockInactiveSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      renderWithRouter(
        <SubscriptionGate subdomain="test-coffee-shop" businessName="Test Coffee">
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      await waitFor(() => {
        expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
      });

      // Children should not be rendered
      expect(screen.queryByTestId('storefront-content')).not.toBeInTheDocument();
    });
  });

  describe('Success: Shows grace period warning', () => {
    it('should render children with grace period banner when in grace period', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockGracePeriodSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      renderWithRouter(
        <SubscriptionGate subdomain="test-coffee-shop">
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      await waitFor(() => {
        expect(screen.getByTestId('storefront-content')).toBeInTheDocument();
      });

      // Grace period banner should be shown
      expect(screen.getByText(/grace period/i)).toBeInTheDocument();
    });
  });

  describe('Success: Shows suspended message', () => {
    it('should show suspended Coming Soon page when subscription is suspended', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockSuspendedSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      renderWithRouter(
        <SubscriptionGate subdomain="test-coffee-shop" businessName="Test Coffee">
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      // Wait for the h1 title specifically
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /temporarily unavailable/i })
        ).toBeInTheDocument();
      });

      // Children should not be rendered
      expect(screen.queryByTestId('storefront-content')).not.toBeInTheDocument();
    });
  });

  describe('Failure: Handles loading state', () => {
    it('should show loading spinner while fetching subscription status', () => {
      // Mock a pending fetch that never resolves
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(() => {})
      );

      const { container } = renderWithRouter(
        <SubscriptionGate subdomain="test-coffee-shop">
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      // Should show loading indicator
      expect(container.querySelector('ion-spinner')).toBeInTheDocument();

      // Children should not be rendered yet
      expect(screen.queryByTestId('storefront-content')).not.toBeInTheDocument();
    });

    it('should show custom loading component when provided', () => {
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(
        <SubscriptionGate
          subdomain="test-coffee-shop"
          loadingComponent={<div data-testid="custom-loader">Custom Loading...</div>}
        >
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
    });
  });

  describe('Edge: Preview mode bypass', () => {
    it('should render children when previewMode is true regardless of subscription', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockInactiveSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      renderWithRouter(
        <SubscriptionGate subdomain="test-coffee-shop" previewMode>
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      // Children should be rendered immediately in preview mode
      expect(screen.getByTestId('storefront-content')).toBeInTheDocument();

      // Coming Soon should not appear
      expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    });

    it('should show preview banner when in preview mode', () => {
      renderWithRouter(
        <SubscriptionGate subdomain="test-coffee-shop" previewMode>
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      expect(screen.getByText(/preview mode/i)).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should show Coming Soon on API error as fallback', async () => {
      const mockError = createMockErrorResponse(
        'INTERNAL_ERROR',
        'Server error',
        500
      );
      vi.mocked(global.fetch).mockResolvedValueOnce(mockError);

      renderWithRouter(
        <SubscriptionGate subdomain="test-coffee-shop" businessName="Test Coffee">
          <div data-testid="storefront-content">Storefront Content</div>
        </SubscriptionGate>
      );

      await waitFor(() => {
        expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
      });
    });
  });

  describe('Business branding', () => {
    it('should pass business name to Coming Soon page', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockInactiveSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      renderWithRouter(
        <SubscriptionGate
          subdomain="test-coffee-shop"
          businessName="Amazing Coffee"
          logoUrl="https://example.com/logo.png"
        >
          <div>Content</div>
        </SubscriptionGate>
      );

      await waitFor(() => {
        expect(screen.getByText('Amazing Coffee')).toBeInTheDocument();
      });
    });

    it('should pass logo to Coming Soon page', async () => {
      const mockResponse = createMockResponse({
        success: true,
        data: mockInactiveSubscription,
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      renderWithRouter(
        <SubscriptionGate
          subdomain="test-coffee-shop"
          businessName="Amazing Coffee"
          logoUrl="https://example.com/logo.png"
        >
          <div>Content</div>
        </SubscriptionGate>
      );

      await waitFor(() => {
        const logo = screen.getByRole('img', { name: /logo/i });
        expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
      });
    });
  });
});
