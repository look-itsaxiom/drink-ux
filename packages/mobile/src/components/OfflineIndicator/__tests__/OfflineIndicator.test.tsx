/**
 * Tests for OfflineIndicator Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfflineIndicator } from '../OfflineIndicator';

describe('OfflineIndicator', () => {
  // Store original navigator.onLine
  const originalOnLine = navigator.onLine;

  // Helper to mock online/offline status
  function mockOnlineStatus(isOnline: boolean) {
    Object.defineProperty(navigator, 'onLine', {
      value: isOnline,
      writable: true,
      configurable: true,
    });
  }

  // Helper to trigger online/offline events wrapped in act
  function triggerOnlineEvent() {
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
  }

  function triggerOfflineEvent() {
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
  }

  afterEach(() => {
    // Restore original
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  describe('Online state', () => {
    beforeEach(() => {
      mockOnlineStatus(true);
    });

    it('does not render when online', () => {
      const { container } = render(<OfflineIndicator />);

      expect(container.querySelector('.offline-indicator')).not.toBeInTheDocument();
    });

    it('renders nothing when online', () => {
      const { container } = render(<OfflineIndicator />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Offline state', () => {
    beforeEach(() => {
      mockOnlineStatus(false);
    });

    it('renders when offline', () => {
      const { container } = render(<OfflineIndicator />);

      expect(container.querySelector('.offline-indicator')).toBeInTheDocument();
    });

    it('shows offline message', () => {
      render(<OfflineIndicator />);

      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    it('shows cloud-offline icon', () => {
      const { container } = render(<OfflineIndicator />);

      const icon = container.querySelector('ion-icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Online/offline transitions', () => {
    it('shows indicator when going offline', async () => {
      mockOnlineStatus(true);
      const { container } = render(<OfflineIndicator />);

      // Initially not visible
      expect(container.querySelector('.offline-indicator')).not.toBeInTheDocument();

      // Go offline
      mockOnlineStatus(false);
      triggerOfflineEvent();

      await waitFor(() => {
        expect(container.querySelector('.offline-indicator')).toBeInTheDocument();
      });
    });

    it('hides indicator when coming online', async () => {
      mockOnlineStatus(false);
      const { container } = render(<OfflineIndicator />);

      // Initially visible
      expect(container.querySelector('.offline-indicator')).toBeInTheDocument();

      // Come online
      mockOnlineStatus(true);
      triggerOnlineEvent();

      await waitFor(() => {
        expect(container.querySelector('.offline-indicator')).not.toBeInTheDocument();
      });
    });
  });

  describe('Callbacks', () => {
    beforeEach(() => {
      mockOnlineStatus(true);
    });

    it('calls onOffline when going offline', async () => {
      const onOffline = vi.fn();
      render(<OfflineIndicator onOffline={onOffline} />);

      mockOnlineStatus(false);
      triggerOfflineEvent();

      await waitFor(() => {
        expect(onOffline).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onOnline when coming back online', async () => {
      mockOnlineStatus(false);
      const onOnline = vi.fn();
      render(<OfflineIndicator onOnline={onOnline} />);

      mockOnlineStatus(true);
      triggerOnlineEvent();

      await waitFor(() => {
        expect(onOnline).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Custom message', () => {
    beforeEach(() => {
      mockOnlineStatus(false);
    });

    it('shows default message', () => {
      render(<OfflineIndicator />);

      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    });

    it('shows custom message when provided', () => {
      render(<OfflineIndicator message="No internet connection" />);

      expect(screen.getByText('No internet connection')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    beforeEach(() => {
      mockOnlineStatus(false);
    });

    it('renders banner variant by default', () => {
      const { container } = render(<OfflineIndicator />);

      expect(container.querySelector('.offline-indicator-banner')).toBeInTheDocument();
    });

    it('renders toast variant', () => {
      const { container } = render(<OfflineIndicator variant="toast" />);

      expect(container.querySelector('.offline-indicator-toast')).toBeInTheDocument();
    });

    it('renders badge variant', () => {
      const { container } = render(<OfflineIndicator variant="badge" />);

      expect(container.querySelector('.offline-indicator-badge')).toBeInTheDocument();
    });
  });

  describe('Dismissable', () => {
    beforeEach(() => {
      mockOnlineStatus(false);
    });

    it('shows dismiss button when dismissable', () => {
      const { container } = render(<OfflineIndicator dismissable />);

      const dismissButton = container.querySelector('.offline-indicator-dismiss');
      expect(dismissButton).toBeInTheDocument();
    });

    it('does not show dismiss button by default', () => {
      const { container } = render(<OfflineIndicator />);

      const dismissButton = container.querySelector('.offline-indicator-dismiss');
      expect(dismissButton).not.toBeInTheDocument();
    });

    it('hides indicator when dismiss is clicked', async () => {
      const { container } = render(<OfflineIndicator dismissable />);

      expect(container.querySelector('.offline-indicator')).toBeInTheDocument();

      const dismissButton = container.querySelector('.offline-indicator-dismiss');
      fireEvent.click(dismissButton!);

      await waitFor(() => {
        expect(container.querySelector('.offline-indicator')).not.toBeInTheDocument();
      });
    });

    it('reappears when going offline again after dismiss', async () => {
      const { container } = render(<OfflineIndicator dismissable />);

      // Dismiss
      const dismissButton = container.querySelector('.offline-indicator-dismiss');
      fireEvent.click(dismissButton!);

      await waitFor(() => {
        expect(container.querySelector('.offline-indicator')).not.toBeInTheDocument();
      });

      // Come online then offline again
      mockOnlineStatus(true);
      triggerOnlineEvent();
      mockOnlineStatus(false);
      triggerOfflineEvent();

      await waitFor(() => {
        expect(container.querySelector('.offline-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockOnlineStatus(false);
    });

    it('has alert role', () => {
      render(<OfflineIndicator />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live for screen readers', () => {
      const { container } = render(<OfflineIndicator />);

      const indicator = container.querySelector('.offline-indicator');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Retry functionality', () => {
    beforeEach(() => {
      mockOnlineStatus(false);
    });

    it('shows retry button when showRetry is true', () => {
      const { container } = render(<OfflineIndicator showRetry />);

      const retryButton = container.querySelector('ion-button');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton?.textContent).toContain('Retry');
    });

    it('does not show retry button by default', () => {
      const { container } = render(<OfflineIndicator />);

      const buttons = container.querySelectorAll('ion-button');
      const retryButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Retry')
      );
      expect(retryButton).toBeUndefined();
    });

    it('calls onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      const { container } = render(<OfflineIndicator showRetry onRetry={onRetry} />);

      const retryButton = container.querySelector('ion-button');
      fireEvent.click(retryButton!);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });
});
