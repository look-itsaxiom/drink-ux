import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../ThemeProvider';
import { defaultTheme } from '../theme';
import { createMockResponse, getCSSVariable } from '../../test/setup';

// Test component to access theme context
const ThemeConsumer: React.FC = () => {
  const { theme, isLoading, error } = useTheme();
  return (
    <div>
      <span data-testid="theme-name">{theme.name}</span>
      <span data-testid="primary-color">{theme.colors.primary}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{error || 'no-error'}</span>
    </div>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('applies default theme initially', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-name').textContent).toBe(defaultTheme.name);
    expect(screen.getByTestId('primary-color').textContent).toBe(
      defaultTheme.colors.primary
    );
  });

  it('shows loading state while fetching theme', async () => {
    // Mock a delayed response
    let resolvePromise: (value: Response) => void;
    vi.mocked(global.fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(
      <ThemeProvider businessSlug="test-coffee">
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Should show loading state initially
    expect(screen.getByTestId('loading').textContent).toBe('true');

    // Resolve the promise
    await act(async () => {
      resolvePromise!(
        createMockResponse({
          success: true,
          data: {
            theme: null,
          },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('fetches and applies API theme on mount when businessSlug is provided', async () => {
    const apiTheme = {
      primaryColor: '#ff6b6b',
      secondaryColor: '#4ecdc4',
      logoUrl: 'https://example.com/logo.png',
    };

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockResponse({
        success: true,
        data: {
          id: 'business-123',
          name: 'Test Coffee',
          slug: 'test-coffee',
          theme: apiTheme,
        },
      })
    );

    render(
      <ThemeProvider businessSlug="test-coffee">
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('primary-color').textContent).toBe('#ff6b6b');
    });
  });

  it('falls back to default theme on API error', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

    render(
      <ThemeProvider businessSlug="test-coffee">
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Should still have default theme
    expect(screen.getByTestId('theme-name').textContent).toBe(defaultTheme.name);
    expect(screen.getByTestId('primary-color').textContent).toBe(
      defaultTheme.colors.primary
    );
  });

  it('provides theme context to children', () => {
    const { container } = render(
      <ThemeProvider>
        <div data-testid="child">Child content</div>
      </ThemeProvider>
    );

    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ThemeConsumer />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('updates CSS variables when theme changes', async () => {
    const apiTheme = {
      primaryColor: '#ff6b6b',
      secondaryColor: '#4ecdc4',
    };

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockResponse({
        success: true,
        data: {
          theme: apiTheme,
        },
      })
    );

    render(
      <ThemeProvider businessSlug="test-coffee">
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('primary-color').textContent).toBe('#ff6b6b');
    });

    // Check CSS variables were set
    expect(getCSSVariable('--theme-primary')).toBe('#ff6b6b');
    expect(getCSSVariable('--theme-secondary')).toBe('#4ecdc4');
  });

  it('does not fetch when no businessSlug is provided', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Wait a tick to ensure any potential fetch would have been called
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('exposes loadTheme function for manual theme loading', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('No API'));

    const TestComponent: React.FC = () => {
      const { loadTheme, theme } = useTheme();

      const handleClick = () => {
        loadTheme({
          ...defaultTheme,
          name: 'custom',
          colors: {
            ...defaultTheme.colors,
            primary: '#123456',
          },
        });
      };

      return (
        <>
          <button data-testid="load-btn" onClick={handleClick}>Load</button>
          <span data-testid="loaded-primary">{theme.colors.primary}</span>
        </>
      );
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Wait for provider to fully initialize before calling loadTheme
    await waitFor(() => {
      expect(screen.getByTestId('loaded-primary')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId('load-btn').click();
    });

    expect(screen.getByTestId('loaded-primary').textContent).toBe('#123456');
  });

  it('exposes logo URL from API theme', async () => {
    const apiTheme = {
      primaryColor: '#ff6b6b',
      logoUrl: 'https://example.com/logo.png',
    };

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockResponse({
        success: true,
        data: {
          theme: apiTheme,
        },
      })
    );

    const LogoConsumer: React.FC = () => {
      const { logoUrl } = useTheme();
      return <span data-testid="logo-url">{logoUrl || 'no-logo'}</span>;
    };

    render(
      <ThemeProvider businessSlug="test-coffee">
        <LogoConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('logo-url').textContent).toBe(
        'https://example.com/logo.png'
      );
    });
  });

  it('handles business slug change by refetching theme', async () => {
    const { rerender } = render(
      <ThemeProvider businessSlug="business-1">
        <ThemeConsumer />
      </ThemeProvider>
    );

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockResponse({
        success: true,
        data: {
          theme: { primaryColor: '#111111' },
        },
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('business-1'),
        expect.anything()
      );
    });

    // Clear mock calls
    vi.mocked(global.fetch).mockClear();

    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockResponse({
        success: true,
        data: {
          theme: { primaryColor: '#222222' },
        },
      })
    );

    rerender(
      <ThemeProvider businessSlug="business-2">
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('business-2'),
        expect.anything()
      );
    });
  });
});
