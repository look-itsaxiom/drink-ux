/**
 * Tests for GracePeriodBanner Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GracePeriodBanner } from '../GracePeriodBanner';

// Wrapper with Router
function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

// Mock useHistory (react-router v5 API used by the mobile app)
const mockPush = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useHistory: () => ({ push: mockPush }),
  };
});

// Alias for test readability
const mockNavigate = mockPush;

describe('GracePeriodBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Happy Path: Shows banner during grace period', () => {
    it('should render the grace period banner', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      expect(screen.getByText(/grace period/i)).toBeInTheDocument();
    });

    it('should have alert role for accessibility', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Success: Displays correct days remaining', () => {
    it('should display 5 days remaining', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      expect(screen.getByText(/5 days/i)).toBeInTheDocument();
    });

    it('should display last day message when 1 day remaining', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={1} />);

      // When 1 day remaining, shows "Last day" message
      expect(screen.getByText(/last day/i)).toBeInTheDocument();
    });

    it('should display 10 days remaining', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={10} />);

      expect(screen.getByText(/10 days/i)).toBeInTheDocument();
    });
  });

  describe('Success: Links to payment page', () => {
    it('should render an update payment button', () => {
      const { container } = renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      // IonButton renders as a custom element, so we look for it directly
      const paymentButton = container.querySelector('ion-button[aria-label="Update payment"]');
      expect(paymentButton).toBeInTheDocument();
    });

    it('should navigate to payment URL when button is clicked', () => {
      const { container } = renderWithRouter(
        <GracePeriodBanner
          daysRemaining={5}
          paymentUpdateUrl="/account/billing"
        />
      );

      const paymentButton = container.querySelector('ion-button[aria-label="Update payment"]');
      fireEvent.click(paymentButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/account/billing');
    });

    it('should use default payment URL when not provided', () => {
      const { container } = renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      const paymentButton = container.querySelector('ion-button[aria-label="Update payment"]');
      fireEvent.click(paymentButton!);

      // Should navigate to default admin billing path
      expect(mockNavigate).toHaveBeenCalledWith('/admin/billing');
    });
  });

  describe('Success: Can be dismissed', () => {
    it('should render a dismiss button', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('should hide banner when dismiss button is clicked', async () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/grace period/i)).not.toBeInTheDocument();
      });
    });

    it('should call onDismiss callback when provided', () => {
      const onDismiss = vi.fn();
      renderWithRouter(<GracePeriodBanner daysRemaining={5} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalled();
    });

    it('should store dismissal in localStorage', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButton);

      expect(localStorage.getItem('gracePeriodBannerDismissed')).toBeTruthy();
    });

    it('should not show banner if already dismissed today', () => {
      // Set dismissal timestamp for today
      const today = new Date().toDateString();
      localStorage.setItem('gracePeriodBannerDismissed', today);

      renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      expect(screen.queryByText(/grace period/i)).not.toBeInTheDocument();
    });

    it('should show banner again on a new day after dismissal', () => {
      // Set dismissal timestamp for yesterday
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      localStorage.setItem('gracePeriodBannerDismissed', yesterday);

      renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      expect(screen.getByText(/grace period/i)).toBeInTheDocument();
    });
  });

  describe('Edge: Last day of grace period messaging', () => {
    it('should show urgent message on last day', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={1} />);

      expect(screen.getByText(/last day/i)).toBeInTheDocument();
    });

    it('should show urgent styling on last day', () => {
      const { container } = renderWithRouter(<GracePeriodBanner daysRemaining={1} />);

      const banner = container.querySelector('.grace-period-banner');
      expect(banner).toHaveClass('grace-period-banner-urgent');
    });

    it('should show very urgent message when 0 days remaining', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={0} />);

      expect(screen.getByText(/expires today/i)).toBeInTheDocument();
    });
  });

  describe('Business name display', () => {
    it('should display business name when provided', () => {
      renderWithRouter(
        <GracePeriodBanner daysRemaining={5} businessName="Test Coffee" />
      );

      expect(screen.getByText(/Test Coffee/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have grace-period-banner class', () => {
      const { container } = renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      expect(container.querySelector('.grace-period-banner')).toBeInTheDocument();
    });

    it('should have warning styling for more than 1 day', () => {
      const { container } = renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      const banner = container.querySelector('.grace-period-banner');
      expect(banner).toHaveClass('grace-period-banner-warning');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate ARIA attributes', () => {
      renderWithRouter(<GracePeriodBanner daysRemaining={5} />);

      const banner = screen.getByRole('alert');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });
  });
});
