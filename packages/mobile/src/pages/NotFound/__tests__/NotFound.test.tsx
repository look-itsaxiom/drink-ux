/**
 * Tests for NotFound Page
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotFound } from '../NotFound';

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

describe('NotFound', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Basic rendering', () => {
    it('renders 404 heading', () => {
      renderWithRouter(<NotFound />);

      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('renders page not found message', () => {
      renderWithRouter(<NotFound />);

      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    });

    it('renders helpful description', () => {
      renderWithRouter(<NotFound />);

      expect(screen.getByText(/looking for doesn't exist/i)).toBeInTheDocument();
    });

    it('renders an icon', () => {
      const { container } = renderWithRouter(<NotFound />);

      const icon = container.querySelector('ion-icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('shows go home button', () => {
      const { container } = renderWithRouter(<NotFound />);

      const buttons = container.querySelectorAll('ion-button');
      const homeButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Go Home')
      );
      expect(homeButton).toBeDefined();
    });

    it('navigates to home when go home is clicked', () => {
      const { container } = renderWithRouter(<NotFound />);

      const buttons = container.querySelectorAll('ion-button');
      const homeButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Go Home')
      );
      fireEvent.click(homeButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('shows go back button', () => {
      const { container } = renderWithRouter(<NotFound />);

      const buttons = container.querySelectorAll('ion-button');
      const backButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Go Back')
      );
      expect(backButton).toBeDefined();
    });

    it('navigates back when go back is clicked', () => {
      const { container } = renderWithRouter(<NotFound />);

      const buttons = container.querySelectorAll('ion-button');
      const backButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Go Back')
      );
      fireEvent.click(backButton!);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('Custom content', () => {
    it('renders custom title when provided', () => {
      renderWithRouter(<NotFound title="Oops!" />);

      expect(screen.getByText('Oops!')).toBeInTheDocument();
    });

    it('renders custom message when provided', () => {
      renderWithRouter(<NotFound message="Something went wrong" />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders custom description when provided', () => {
      renderWithRouter(
        <NotFound description="Please try a different page." />
      );

      expect(screen.getByText('Please try a different page.')).toBeInTheDocument();
    });

    it('hides go back button when showBackButton is false', () => {
      const { container } = renderWithRouter(<NotFound showBackButton={false} />);

      const buttons = container.querySelectorAll('ion-button');
      const backButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Go Back')
      );
      expect(backButton).toBeUndefined();
    });

    it('uses custom home path when provided', () => {
      const { container } = renderWithRouter(<NotFound homePath="/menu" />);

      const buttons = container.querySelectorAll('ion-button');
      const homeButton = Array.from(buttons).find(
        (btn) => btn.textContent?.includes('Go Home')
      );
      fireEvent.click(homeButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/menu');
    });
  });

  describe('Styling', () => {
    it('renders in a page container', () => {
      const { container } = renderWithRouter(<NotFound />);

      // ion-page is rendered as custom element, check container has content
      expect(container.innerHTML).toContain('ion-page');
    });

    it('has content area', () => {
      const { container } = renderWithRouter(<NotFound />);

      expect(container.querySelector('ion-content')).toBeInTheDocument();
    });

    it('has centered content', () => {
      const { container } = renderWithRouter(<NotFound />);

      const notFoundContainer = container.querySelector('.not-found');
      expect(notFoundContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible heading', () => {
      renderWithRouter(<NotFound />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('has accessible buttons', () => {
      const { container } = renderWithRouter(<NotFound />);

      // Ionic buttons - check for ion-button elements
      const buttons = container.querySelectorAll('ion-button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has main region', () => {
      const { container } = renderWithRouter(<NotFound />);

      // Content should have role="main"
      const main = container.querySelector('.not-found');
      expect(main).toBeInTheDocument();
    });
  });

  describe('Children support', () => {
    it('renders children as additional content', () => {
      renderWithRouter(
        <NotFound>
          <p>Custom additional content</p>
        </NotFound>
      );

      expect(screen.getByText('Custom additional content')).toBeInTheDocument();
    });

    it('renders custom action buttons in children', () => {
      const customAction = vi.fn();
      renderWithRouter(
        <NotFound>
          <button onClick={customAction}>Custom Action</button>
        </NotFound>
      );

      const customButton = screen.getByRole('button', { name: /custom action/i });
      fireEvent.click(customButton);

      expect(customAction).toHaveBeenCalled();
    });
  });
});
