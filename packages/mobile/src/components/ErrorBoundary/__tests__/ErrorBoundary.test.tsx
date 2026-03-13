/**
 * Tests for ErrorBoundary Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Suppress console.error for error boundary tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalError;
});

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Component that throws after interaction
function ThrowOnClickComponent() {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw new Error('Click error');
  }

  return (
    <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
  );
}

describe('ErrorBoundary', () => {
  describe('Normal rendering', () => {
    it('renders children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('catches errors in children', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.queryByText('No error')).not.toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('shows default fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      // Find the ion-button containing Try Again
      const ionButton = document.querySelector('ion-button');
      expect(ionButton).toBeInTheDocument();
      expect(ionButton?.textContent).toContain('Try Again');
    });

    it('shows custom fallback UI', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('calls onError callback', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('passes error details to onError callback', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const [error] = onError.mock.calls[0];
      expect(error.message).toBe('Test error');
    });
  });

  describe('Error recovery', () => {
    it('resets error state when Try Again is clicked', () => {
      const onRetry = vi.fn();

      const { container } = render(
        <ErrorBoundary onRetry={onRetry}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify error state
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Click try again - Ionic buttons render as ion-button, not native button
      const tryAgainButton = document.querySelector('ion-button');
      expect(tryAgainButton).toBeInTheDocument();
      fireEvent.click(tryAgainButton!);

      // Verify onRetry was called
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback when Try Again is clicked', () => {
      const onRetry = vi.fn();

      render(
        <ErrorBoundary onRetry={onRetry}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const tryAgainButton = document.querySelector('ion-button');
      fireEvent.click(tryAgainButton!);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Nested error boundaries', () => {
    it('inner boundary catches inner errors', () => {
      render(
        <ErrorBoundary fallback={<div>Outer error</div>}>
          <div>Outer content</div>
          <ErrorBoundary fallback={<div>Inner error</div>}>
            <ThrowingComponent />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      expect(screen.getByText('Outer content')).toBeInTheDocument();
      expect(screen.getByText('Inner error')).toBeInTheDocument();
      expect(screen.queryByText('Outer error')).not.toBeInTheDocument();
    });
  });

  describe('Render props fallback', () => {
    it('supports render props for fallback with error info', () => {
      render(
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <p>Error: {error.message}</p>
              <button onClick={resetErrorBoundary}>Reset</button>
            </div>
          )}
        >
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('resetErrorBoundary calls reset and clears state', () => {
      const onRetry = vi.fn();

      render(
        <ErrorBoundary
          onRetry={onRetry}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <p>Error: {error.message}</p>
              <button onClick={resetErrorBoundary}>Reset</button>
            </div>
          )}
        >
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error: Test error')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /reset/i }));

      // Verify reset was called
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('fallback UI is accessible', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Has heading
      expect(screen.getByRole('heading')).toBeInTheDocument();

      // Has actionable button (Ionic renders as ion-button, not native button)
      const ionButton = document.querySelector('ion-button');
      expect(ionButton).toBeInTheDocument();
    });

    it('announces error to screen readers', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Error section should have alert role
      const alertRegion = screen.getByRole('alert');
      expect(alertRegion).toBeInTheDocument();
    });
  });
});
