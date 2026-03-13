/**
 * Tests for ComingSoon Page
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ComingSoon } from '../ComingSoon';

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

describe('ComingSoon', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Happy Path: Renders coming soon message with business name', () => {
    it('should render coming soon title', () => {
      renderWithRouter(<ComingSoon />);

      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });

    it('should display business name when provided', () => {
      renderWithRouter(<ComingSoon businessName="Test Coffee Shop" />);

      expect(screen.getByText('Test Coffee Shop')).toBeInTheDocument();
    });

    it('should show default message when no business name provided', () => {
      renderWithRouter(<ComingSoon />);

      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });
  });

  describe('Success: Displays business logo when available', () => {
    it('should render logo image when logoUrl is provided', () => {
      renderWithRouter(
        <ComingSoon
          businessName="Test Coffee"
          logoUrl="https://example.com/logo.png"
        />
      );

      const logo = screen.getByRole('img', { name: /logo/i });
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('should not render logo when logoUrl is not provided', () => {
      renderWithRouter(<ComingSoon businessName="Test Coffee" />);

      const logo = screen.queryByRole('img', { name: /logo/i });
      expect(logo).not.toBeInTheDocument();
    });
  });

  describe('Success: Shows contact info when provided', () => {
    it('should display email when contactEmail is provided', () => {
      renderWithRouter(
        <ComingSoon
          businessName="Test Coffee"
          contactEmail="info@testcoffee.com"
        />
      );

      expect(screen.getByText('info@testcoffee.com')).toBeInTheDocument();
    });

    it('should display phone when contactPhone is provided', () => {
      renderWithRouter(
        <ComingSoon
          businessName="Test Coffee"
          contactPhone="555-1234"
        />
      );

      expect(screen.getByText('555-1234')).toBeInTheDocument();
    });

    it('should not render contact section when no contact info provided', () => {
      const { container } = renderWithRouter(
        <ComingSoon businessName="Test Coffee" />
      );

      const contactSection = container.querySelector('.coming-soon-contact');
      expect(contactSection).not.toBeInTheDocument();
    });
  });

  describe('Social media links', () => {
    it('should display social media links when provided', () => {
      const socialLinks = {
        facebook: 'https://facebook.com/testcoffee',
        instagram: 'https://instagram.com/testcoffee',
        twitter: 'https://twitter.com/testcoffee',
      };

      renderWithRouter(
        <ComingSoon businessName="Test Coffee" socialLinks={socialLinks} />
      );

      const facebookLink = screen.getByLabelText(/facebook/i);
      expect(facebookLink).toHaveAttribute('href', socialLinks.facebook);

      const instagramLink = screen.getByLabelText(/instagram/i);
      expect(instagramLink).toHaveAttribute('href', socialLinks.instagram);

      const twitterLink = screen.getByLabelText(/twitter/i);
      expect(twitterLink).toHaveAttribute('href', socialLinks.twitter);
    });

    it('should not render social section when no links provided', () => {
      const { container } = renderWithRouter(
        <ComingSoon businessName="Test Coffee" />
      );

      const socialSection = container.querySelector('.coming-soon-social');
      expect(socialSection).not.toBeInTheDocument();
    });
  });

  describe('Edge: Handles missing business data gracefully', () => {
    it('should render without crashing when no props provided', () => {
      const { container } = renderWithRouter(<ComingSoon />);

      expect(container.innerHTML).toContain('ion-page');
      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });

    it('should show generic message when business name is empty string', () => {
      renderWithRouter(<ComingSoon businessName="" />);

      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should render in a page container', () => {
      const { container } = renderWithRouter(<ComingSoon />);

      expect(container.innerHTML).toContain('ion-page');
    });

    it('should have content area', () => {
      const { container } = renderWithRouter(<ComingSoon />);

      expect(container.querySelector('ion-content')).toBeInTheDocument();
    });

    it('should have coming-soon container class', () => {
      const { container } = renderWithRouter(<ComingSoon />);

      const comingSoonContainer = container.querySelector('.coming-soon');
      expect(comingSoonContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading', () => {
      renderWithRouter(<ComingSoon />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should have main region', () => {
      const { container } = renderWithRouter(<ComingSoon />);

      const main = container.querySelector('.coming-soon');
      expect(main).toHaveAttribute('role', 'main');
    });

    it('should have accessible business name when provided', () => {
      renderWithRouter(<ComingSoon businessName="Test Coffee Shop" />);

      expect(screen.getByRole('heading', { name: /test coffee shop/i })).toBeInTheDocument();
    });
  });

  describe('Custom description', () => {
    it('should show custom description when provided', () => {
      renderWithRouter(
        <ComingSoon
          businessName="Test Coffee"
          description="We're working hard to bring you the best coffee experience!"
        />
      );

      expect(
        screen.getByText(/We're working hard to bring you the best coffee experience!/i)
      ).toBeInTheDocument();
    });

    it('should show default description when not provided', () => {
      renderWithRouter(<ComingSoon businessName="Test Coffee" />);

      expect(
        screen.getByText(/We're working on something amazing/i)
      ).toBeInTheDocument();
    });
  });

  describe('Theme support', () => {
    it('should apply custom primary color when provided', () => {
      const { container } = renderWithRouter(
        <ComingSoon businessName="Test Coffee" primaryColor="#FF5733" />
      );

      const comingSoonContainer = container.querySelector('.coming-soon');
      expect(comingSoonContainer).toHaveStyle('--coming-soon-primary: #FF5733');
    });
  });

  describe('Suspended state', () => {
    it('should show suspended message when isSuspended is true', () => {
      renderWithRouter(
        <ComingSoon businessName="Test Coffee" isSuspended />
      );

      // Check for the title specifically
      expect(
        screen.getByRole('heading', { name: /temporarily unavailable/i })
      ).toBeInTheDocument();
    });

    it('should show resubscribe link when suspended', () => {
      const { container } = renderWithRouter(
        <ComingSoon businessName="Test Coffee" isSuspended />
      );

      // Check for the suspended message element specifically
      const suspendedMessage = container.querySelector('.coming-soon-suspended-message');
      expect(suspendedMessage).toBeInTheDocument();
      expect(suspendedMessage?.textContent).toMatch(/contact.*to reactivate/i);
    });
  });
});
