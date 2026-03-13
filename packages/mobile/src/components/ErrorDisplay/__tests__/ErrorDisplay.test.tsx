/**
 * Tests for ErrorDisplay Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorDisplay } from '../ErrorDisplay';
import type { AppError } from '../../../utils/errors';

// Helper to create test errors
function createTestError(overrides: Partial<AppError> = {}): AppError {
  return {
    code: 'TEST_ERROR',
    message: 'Test error message',
    userMessage: 'Something went wrong',
    retryable: false,
    ...overrides,
  };
}

describe('ErrorDisplay', () => {
  describe('Basic rendering', () => {
    it('renders user-friendly error message', () => {
      const error = createTestError({ userMessage: 'Please try again later' });

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('Please try again later')).toBeInTheDocument();
    });

    it('renders with error icon', () => {
      const error = createTestError();

      const { container } = render(<ErrorDisplay error={error} />);

      // Ionic renders ion-icon
      const icon = container.querySelector('ion-icon');
      expect(icon).toBeInTheDocument();
    });

    it('renders error title', () => {
      const error = createTestError();

      render(<ErrorDisplay error={error} />);

      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('Retry functionality', () => {
    it('shows retry button when error is retryable', () => {
      const error = createTestError({ retryable: true });

      const { container } = render(<ErrorDisplay error={error} />);

      const retryButton = container.querySelector('ion-button');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton?.textContent).toContain('Try Again');
    });

    it('does not show retry button when error is not retryable', () => {
      const error = createTestError({ retryable: false });

      const { container } = render(<ErrorDisplay error={error} />);

      // Should not have a "Try Again" button
      const buttons = container.querySelectorAll('ion-button');
      const retryButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Try Again')
      );
      expect(retryButton).toBeUndefined();
    });

    it('shows retry button when onRetry provided even if not retryable', () => {
      const error = createTestError({ retryable: false });
      const onRetry = vi.fn();

      const { container } = render(<ErrorDisplay error={error} onRetry={onRetry} />);

      const retryButton = container.querySelector('ion-button');
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const error = createTestError({ retryable: true });
      const onRetry = vi.fn();

      const { container } = render(<ErrorDisplay error={error} onRetry={onRetry} />);

      const retryButton = container.querySelector('ion-button');
      fireEvent.click(retryButton!);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dismiss functionality', () => {
    it('shows dismiss button when onDismiss provided', () => {
      const error = createTestError();
      const onDismiss = vi.fn();

      const { container } = render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      const buttons = container.querySelectorAll('ion-button');
      const dismissButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Dismiss')
      );
      expect(dismissButton).toBeDefined();
    });

    it('does not show dismiss button when onDismiss not provided', () => {
      const error = createTestError();

      const { container } = render(<ErrorDisplay error={error} />);

      const buttons = container.querySelectorAll('ion-button');
      const dismissButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Dismiss')
      );
      expect(dismissButton).toBeUndefined();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const error = createTestError();
      const onDismiss = vi.fn();

      const { container } = render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

      const buttons = container.querySelectorAll('ion-button');
      const dismissButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Dismiss')
      );
      fireEvent.click(dismissButton!);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Action-based rendering', () => {
    it('shows "Try Again" for retry action', () => {
      const error = createTestError({ action: 'retry', retryable: true });
      const onRetry = vi.fn();

      const { container } = render(<ErrorDisplay error={error} onRetry={onRetry} />);

      const button = container.querySelector('ion-button');
      expect(button?.textContent).toContain('Try Again');
    });

    it('shows "Refresh" for refresh action', () => {
      const error = createTestError({ action: 'refresh' });

      const { container } = render(<ErrorDisplay error={error} />);

      const button = container.querySelector('ion-button');
      expect(button?.textContent).toContain('Refresh');
    });

    it('shows "Log In" for login action', () => {
      const error = createTestError({ action: 'login' });

      const { container } = render(<ErrorDisplay error={error} />);

      const button = container.querySelector('ion-button');
      expect(button?.textContent).toContain('Log In');
    });

    it('shows "Contact Support" for contact-support action', () => {
      const error = createTestError({ action: 'contact-support' });

      const { container } = render(<ErrorDisplay error={error} />);

      const button = container.querySelector('ion-button');
      expect(button?.textContent).toContain('Contact Support');
    });
  });

  describe('Variants', () => {
    it('renders inline variant', () => {
      const error = createTestError();

      const { container } = render(<ErrorDisplay error={error} variant="inline" />);

      // Inline variant should not have card wrapper
      expect(container.querySelector('ion-card')).not.toBeInTheDocument();
    });

    it('renders card variant by default', () => {
      const error = createTestError();

      const { container } = render(<ErrorDisplay error={error} />);

      expect(container.querySelector('ion-card')).toBeInTheDocument();
    });

    it('renders toast variant', () => {
      const error = createTestError();

      const { container } = render(<ErrorDisplay error={error} variant="toast" />);

      // Toast variant should have specific styling class
      const wrapper = container.querySelector('.error-display-toast');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders fullscreen variant', () => {
      const error = createTestError();

      const { container } = render(<ErrorDisplay error={error} variant="fullscreen" />);

      const wrapper = container.querySelector('.error-display-fullscreen');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has alert role for screen readers', () => {
      const error = createTestError();

      render(<ErrorDisplay error={error} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('error message is accessible', () => {
      const error = createTestError({ userMessage: 'Network connection lost' });

      render(<ErrorDisplay error={error} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Network connection lost');
    });
  });

  describe('Custom content', () => {
    it('renders custom title when provided', () => {
      const error = createTestError();

      render(<ErrorDisplay error={error} title="Custom Error Title" />);

      expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
    });

    it('renders children as additional content', () => {
      const error = createTestError();

      render(
        <ErrorDisplay error={error}>
          <p>Additional help text</p>
        </ErrorDisplay>
      );

      expect(screen.getByText('Additional help text')).toBeInTheDocument();
    });
  });

  describe('Error codes', () => {
    it('displays error code in debug mode', () => {
      const error = createTestError({ code: 'ERR_NETWORK' });

      render(<ErrorDisplay error={error} showErrorCode />);

      expect(screen.getByText(/ERR_NETWORK/)).toBeInTheDocument();
    });

    it('hides error code by default', () => {
      const error = createTestError({ code: 'ERR_NETWORK' });

      render(<ErrorDisplay error={error} />);

      expect(screen.queryByText(/ERR_NETWORK/)).not.toBeInTheDocument();
    });
  });
});
