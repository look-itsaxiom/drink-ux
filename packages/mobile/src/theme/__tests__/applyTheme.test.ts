import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyTheme,
  hexToRgb,
  deriveThemeColors,
  mapApiThemeToFullTheme,
} from '../applyTheme';
import { defaultTheme, Theme } from '../theme';
import { getCSSVariable, clearCSSVariables } from '../../test/setup';

describe('applyTheme utility', () => {
  beforeEach(() => {
    clearCSSVariables();
  });

  describe('hexToRgb', () => {
    it('converts 6-digit hex to RGB object', () => {
      expect(hexToRgb('#ff6b6b')).toEqual({ r: 255, g: 107, b: 107 });
      expect(hexToRgb('#4ecdc4')).toEqual({ r: 78, g: 205, b: 196 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('handles hex without hash prefix', () => {
      expect(hexToRgb('ff6b6b')).toEqual({ r: 255, g: 107, b: 107 });
    });

    it('returns null for invalid hex colors', () => {
      expect(hexToRgb('')).toBeNull();
      expect(hexToRgb('#fff')).toBeNull(); // 3-digit hex not supported
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#gggggg')).toBeNull();
    });

    it('handles uppercase hex values', () => {
      expect(hexToRgb('#FF6B6B')).toEqual({ r: 255, g: 107, b: 107 });
    });
  });

  describe('deriveThemeColors', () => {
    it('derives additional colors from primary color', () => {
      const derived = deriveThemeColors('#667eea', '#6B4226');

      expect(derived.primaryRgb).toBe('102, 126, 234');
      expect(derived.secondaryRgb).toBe('107, 66, 38');
      expect(derived.primaryLight).toContain('rgba(102, 126, 234, 0.1)');
      expect(derived.primaryBorder).toContain('rgba(102, 126, 234, 0.3)');
      expect(derived.primaryShadow).toContain('rgba(102, 126, 234, 0.4)');
      expect(derived.secondaryShadow).toContain('rgba(107, 66, 38, 0.3)');
    });

    it('returns empty strings for invalid colors', () => {
      const derived = deriveThemeColors('invalid', 'also-invalid');

      expect(derived.primaryRgb).toBe('');
      expect(derived.secondaryRgb).toBe('');
    });

    it('generates primary gradient', () => {
      const derived = deriveThemeColors('#667eea', '#764ba2');

      expect(derived.gradientPrimary).toContain('linear-gradient');
      expect(derived.gradientPrimary).toContain('#667eea');
    });
  });

  describe('applyTheme', () => {
    it('sets CSS custom properties on :root', () => {
      applyTheme(defaultTheme);

      expect(getCSSVariable('--theme-primary')).toBe(defaultTheme.colors.primary);
      expect(getCSSVariable('--theme-secondary')).toBe(defaultTheme.colors.secondary);
      expect(getCSSVariable('--theme-background')).toBe(defaultTheme.colors.background);
      expect(getCSSVariable('--theme-text')).toBe(defaultTheme.colors.text);
    });

    it('converts hex colors to RGB values', () => {
      applyTheme(defaultTheme);

      // RGB for defaultTheme.colors.primary (#8B5E3C = 139, 94, 60)
      const rgb = hexToRgb(defaultTheme.colors.primary);
      expect(getCSSVariable('--theme-primary-rgb')).toBe(`${rgb!.r}, ${rgb!.g}, ${rgb!.b}`);
    });

    it('applies gradient variables', () => {
      applyTheme(defaultTheme);

      const gradient = getCSSVariable('--theme-gradient-primary');
      expect(gradient).toContain('linear-gradient');
    });

    it('applies derived color variations', () => {
      applyTheme(defaultTheme);

      expect(getCSSVariable('--theme-primary-light')).toContain('rgba(');
      expect(getCSSVariable('--theme-primary-border')).toContain('rgba(');
      expect(getCSSVariable('--theme-primary-shadow')).toContain('rgba(');
    });

    it('handles partial theme with missing properties', () => {
      const partialTheme: Theme = {
        name: 'partial',
        colors: {
          primary: '#ff0000',
          primaryDark: '#cc0000',
          secondary: '#00ff00',
          background: '#ffffff',
          surface: '#ffffff',
          text: '#000000',
          textSecondary: '#666666',
          accent: '#ff0000',
          border: '#cccccc',
          shadow: 'rgba(0,0,0,0.1)',
          success: '#00ff00',
          warning: '#ffff00',
          error: '#ff0000',
        },
        gradients: {
          primary: 'linear-gradient(#ff0000, #cc0000)',
          secondary: 'linear-gradient(#00ff00, #00cc00)',
        },
      };

      // Should not throw
      expect(() => applyTheme(partialTheme)).not.toThrow();
      expect(getCSSVariable('--theme-primary')).toBe('#ff0000');
    });

    it('preserves non-theme CSS variables', () => {
      // Set a non-theme variable first
      document.documentElement.style.setProperty('--custom-var', 'custom-value');

      applyTheme(defaultTheme);

      // Custom variable should still exist
      expect(
        document.documentElement.style.getPropertyValue('--custom-var')
      ).toBe('custom-value');
    });
  });

  describe('mapApiThemeToFullTheme', () => {
    it('maps API theme with primary and secondary colors to full theme', () => {
      const apiTheme = {
        primaryColor: '#ff6b6b',
        secondaryColor: '#4ecdc4',
        logoUrl: 'https://example.com/logo.png',
      };

      const theme = mapApiThemeToFullTheme(apiTheme);

      expect(theme.colors.primary).toBe('#ff6b6b');
      expect(theme.colors.secondary).toBe('#4ecdc4');
      expect(theme.name).toBe('business');
    });

    it('uses default colors when API theme is incomplete', () => {
      const apiTheme = {
        primaryColor: '#ff6b6b',
        // No secondary color
      };

      const theme = mapApiThemeToFullTheme(apiTheme);

      expect(theme.colors.primary).toBe('#ff6b6b');
      expect(theme.colors.secondary).toBe(defaultTheme.colors.secondary);
    });

    it('returns default theme for null/undefined API theme', () => {
      const theme = mapApiThemeToFullTheme(null);

      expect(theme).toEqual(defaultTheme);
    });

    it('generates correct gradients from API colors', () => {
      const apiTheme = {
        primaryColor: '#ff6b6b',
        secondaryColor: '#4ecdc4',
      };

      const theme = mapApiThemeToFullTheme(apiTheme);

      expect(theme.gradients.primary).toContain('#ff6b6b');
    });

    it('derives primaryDark from primary color', () => {
      const apiTheme = {
        primaryColor: '#ff6b6b',
      };

      const theme = mapApiThemeToFullTheme(apiTheme);

      // primaryDark should be a darker version of primary
      expect(theme.colors.primaryDark).toBeDefined();
      expect(theme.colors.primaryDark).not.toBe('#ff6b6b');
    });
  });
});
