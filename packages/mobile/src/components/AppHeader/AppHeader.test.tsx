import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AppHeader from './AppHeader';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { createMockResponse } from '../../test/setup';

// Mock Ionic components
vi.mock('@ionic/react', async () => {
  const actual = await vi.importActual('@ionic/react');
  return {
    ...actual,
    IonHeader: ({ children }: { children: React.ReactNode }) => (
      <header data-testid="ion-header">{children}</header>
    ),
    IonToolbar: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => (
      <div data-testid="ion-toolbar" className={className}>
        {children}
      </div>
    ),
    IonTitle: ({ children }: { children: React.ReactNode }) => (
      <h1 data-testid="ion-title">{children}</h1>
    ),
    IonButtons: ({
      children,
      slot,
    }: {
      children: React.ReactNode;
      slot: string;
    }) => (
      <div data-testid={`ion-buttons-${slot}`} data-slot={slot}>
        {children}
      </div>
    ),
    IonBackButton: ({ defaultHref }: { defaultHref: string }) => (
      <button data-testid="ion-back-button" data-href={defaultHref}>
        Back
      </button>
    ),
    IonButton: ({
      children,
      onClick,
      fill,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      fill?: string;
    }) => (
      <button data-testid="ion-button" onClick={onClick} data-fill={fill}>
        {children}
      </button>
    ),
    IonIcon: ({ name }: { name: string }) => (
      <span data-testid="ion-icon" data-name={name} />
    ),
    IonProgressBar: ({ value, color }: { value: number; color: string }) => (
      <div
        data-testid="ion-progress-bar"
        data-value={value}
        data-color={color}
      />
    ),
  };
});

describe('AppHeader', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('basic rendering', () => {
    it('renders title correctly', () => {
      render(
        <ThemeProvider>
          <AppHeader title="Test Title" />
        </ThemeProvider>
      );

      expect(screen.getByTestId('ion-title').textContent).toBe('Test Title');
    });

    it('shows back button when showBackButton is true', () => {
      render(
        <ThemeProvider>
          <AppHeader title="Test" showBackButton backHref="/home" />
        </ThemeProvider>
      );

      const backButton = screen.getByTestId('ion-back-button');
      expect(backButton).toBeDefined();
      expect(backButton.getAttribute('data-href')).toBe('/home');
    });

    it('hides back button by default', () => {
      render(
        <ThemeProvider>
          <AppHeader title="Test" />
        </ThemeProvider>
      );

      expect(screen.queryByTestId('ion-back-button')).toBeNull();
    });
  });

  describe('logo rendering', () => {
    it('displays logo image when logoUrl is provided', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({
          success: true,
          data: {
            theme: {
              primaryColor: '#ff6b6b',
              logoUrl: 'https://example.com/logo.png',
            },
          },
        })
      );

      render(
        <ThemeProvider businessSlug="test-coffee">
          <AppHeader title="Test Coffee" showLogo />
        </ThemeProvider>
      );

      await waitFor(() => {
        const logo = screen.getByTestId('header-logo');
        expect(logo).toBeDefined();
        expect(logo.getAttribute('src')).toBe('https://example.com/logo.png');
      });
    });

    it('displays business name when no logo URL is provided', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({
          success: true,
          data: {
            name: 'Test Coffee Shop',
            theme: {
              primaryColor: '#ff6b6b',
              // No logoUrl
            },
          },
        })
      );

      render(
        <ThemeProvider businessSlug="test-coffee">
          <AppHeader title="Test Coffee Shop" showLogo />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('ion-title').textContent).toBe(
          'Test Coffee Shop'
        );
      });
    });

    it('handles logo loading error gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({
          success: true,
          data: {
            name: 'Test Coffee',
            theme: {
              logoUrl: 'https://example.com/broken-logo.png',
            },
          },
        })
      );

      render(
        <ThemeProvider businessSlug="test-coffee">
          <AppHeader title="Test Coffee" showLogo />
        </ThemeProvider>
      );

      await waitFor(() => {
        const logo = screen.queryByTestId('header-logo');
        if (logo) {
          // Simulate error event
          fireEvent.error(logo);
        }
      });

      // After error, should fall back to showing title
      await waitFor(() => {
        expect(screen.getByTestId('ion-title')).toBeDefined();
      });
    });

    it('includes proper alt text for accessibility', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({
          success: true,
          data: {
            name: 'Test Coffee',
            theme: {
              logoUrl: 'https://example.com/logo.png',
            },
          },
        })
      );

      render(
        <ThemeProvider businessSlug="test-coffee">
          <AppHeader title="Test Coffee" showLogo businessName="Test Coffee" />
        </ThemeProvider>
      );

      await waitFor(() => {
        const logo = screen.getByTestId('header-logo');
        expect(logo.getAttribute('alt')).toBe('Test Coffee logo');
      });
    });

    it('does not show logo when showLogo is false', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({
          success: true,
          data: {
            theme: {
              logoUrl: 'https://example.com/logo.png',
            },
          },
        })
      );

      render(
        <ThemeProvider businessSlug="test-coffee">
          <AppHeader title="Test Coffee" showLogo={false} />
        </ThemeProvider>
      );

      // Wait for component to render with title
      await waitFor(() => {
        expect(screen.getByTestId('ion-title')).toBeDefined();
      });

      expect(screen.queryByTestId('header-logo')).toBeNull();
    });
  });

  describe('progress indicator', () => {
    it('shows progress bar when showProgress is true', () => {
      render(
        <ThemeProvider>
          <AppHeader title="Test" showProgress progressValue={0.5} />
        </ThemeProvider>
      );

      const progressBar = screen.getByTestId('ion-progress-bar');
      expect(progressBar).toBeDefined();
      expect(progressBar.getAttribute('data-value')).toBe('0.5');
    });

    it('shows progress steps when provided', () => {
      const steps = [
        { key: 'step1', label: 'Step 1', isActive: true, isCompleted: false },
        { key: 'step2', label: 'Step 2', isActive: false, isCompleted: false },
      ];

      render(
        <ThemeProvider>
          <AppHeader
            title="Test"
            showProgress
            progressValue={0.5}
            progressSteps={steps}
          />
        </ThemeProvider>
      );

      expect(screen.getByText('Step 1')).toBeDefined();
      expect(screen.getByText('Step 2')).toBeDefined();
    });

    it('applies correct CSS classes to progress steps', () => {
      const steps = [
        { key: 'step1', label: 'Completed', isActive: false, isCompleted: true },
        { key: 'step2', label: 'Active', isActive: true, isCompleted: false },
        { key: 'step3', label: 'Pending', isActive: false, isCompleted: false },
      ];

      render(
        <ThemeProvider>
          <AppHeader
            title="Test"
            showProgress
            progressValue={0.33}
            progressSteps={steps}
          />
        </ThemeProvider>
      );

      const completedStep = screen.getByText('Completed');
      const activeStep = screen.getByText('Active');
      const pendingStep = screen.getByText('Pending');

      expect(completedStep.className).toContain('completed');
      expect(activeStep.className).toContain('active');
      expect(pendingStep.className).not.toContain('completed');
      expect(pendingStep.className).not.toContain('active');
    });
  });

  describe('cart button', () => {
    it('shows cart button when showCartButton is true', () => {
      const onCartClick = vi.fn();

      render(
        <ThemeProvider>
          <AppHeader title="Test" showCartButton onCartClick={onCartClick} />
        </ThemeProvider>
      );

      const cartButton = screen.getByTestId('ion-button');
      expect(cartButton).toBeDefined();

      fireEvent.click(cartButton);
      expect(onCartClick).toHaveBeenCalledTimes(1);
    });

    it('hides cart button by default', () => {
      render(
        <ThemeProvider>
          <AppHeader title="Test" />
        </ThemeProvider>
      );

      expect(screen.queryByTestId('ion-button')).toBeNull();
    });
  });
});
