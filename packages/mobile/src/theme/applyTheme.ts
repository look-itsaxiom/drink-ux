/**
 * Theme Application Utilities
 * Functions for applying theme to CSS variables and deriving theme colors
 */

import { Theme, defaultTheme } from './theme';
import { BusinessTheme } from '../services/themeService';

/**
 * RGB color object
 */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Derived theme colors for CSS variables
 */
export interface DerivedThemeColors {
  primaryRgb: string;
  secondaryRgb: string;
  primaryLight: string;
  primaryBorder: string;
  primaryShadow: string;
  primaryShadowHover: string;
  secondaryShadow: string;
  secondaryShadowHover: string;
  gradientPrimary: string;
  gradientSecondary: string;
}

/**
 * Convert hex color to RGB object
 *
 * @param hex - Hex color string (with or without #)
 * @returns RGB object or null if invalid
 */
export function hexToRgb(hex: string): RgbColor | null {
  if (!hex) return null;

  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Only support 6-digit hex
  if (cleanHex.length !== 6) {
    return null;
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);

  if (!result) {
    return null;
  }

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB object to string format "r, g, b"
 */
export function rgbToString(rgb: RgbColor): string {
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

/**
 * Darken a hex color by a percentage
 *
 * @param hex - Hex color string
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened hex color
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 - percent / 100;

  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Derive additional theme colors from primary and secondary colors
 *
 * @param primaryColor - Primary hex color
 * @param secondaryColor - Secondary hex color
 * @returns Derived colors for CSS variables
 */
export function deriveThemeColors(
  primaryColor: string,
  secondaryColor: string
): DerivedThemeColors {
  const primaryRgb = hexToRgb(primaryColor);
  const secondaryRgb = hexToRgb(secondaryColor);

  const primaryRgbStr = primaryRgb ? rgbToString(primaryRgb) : '';
  const secondaryRgbStr = secondaryRgb ? rgbToString(secondaryRgb) : '';

  // Derive a darker version of primary for gradient
  const primaryDark = darkenColor(primaryColor, 20);

  return {
    primaryRgb: primaryRgbStr,
    secondaryRgb: secondaryRgbStr,
    primaryLight: primaryRgbStr
      ? `rgba(${primaryRgbStr}, 0.1)`
      : '',
    primaryBorder: primaryRgbStr
      ? `rgba(${primaryRgbStr}, 0.3)`
      : '',
    primaryShadow: primaryRgbStr
      ? `rgba(${primaryRgbStr}, 0.4)`
      : '',
    primaryShadowHover: primaryRgbStr
      ? `rgba(${primaryRgbStr}, 0.6)`
      : '',
    secondaryShadow: secondaryRgbStr
      ? `rgba(${secondaryRgbStr}, 0.3)`
      : '',
    secondaryShadowHover: secondaryRgbStr
      ? `rgba(${secondaryRgbStr}, 0.4)`
      : '',
    gradientPrimary: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryDark} 100%)`,
    gradientSecondary: `linear-gradient(135deg, ${secondaryColor} 0%, ${darkenColor(secondaryColor, 15)} 100%)`,
  };
}

/**
 * Apply a theme to the document by setting CSS custom properties
 *
 * @param theme - Theme to apply
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  // Apply color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });

  // Apply gradient variables
  Object.entries(theme.gradients).forEach(([key, value]) => {
    root.style.setProperty(`--theme-gradient-${key}`, value);
  });

  // Derive and apply additional colors
  const derived = deriveThemeColors(
    theme.colors.primary,
    theme.colors.secondary
  );

  // Apply RGB values
  if (derived.primaryRgb) {
    root.style.setProperty('--theme-primary-rgb', derived.primaryRgb);
  }
  if (derived.secondaryRgb) {
    root.style.setProperty('--theme-secondary-rgb', derived.secondaryRgb);
  }

  // Apply derived alpha variations
  if (derived.primaryLight) {
    root.style.setProperty('--theme-primary-light', derived.primaryLight);
  }
  if (derived.primaryBorder) {
    root.style.setProperty('--theme-primary-border', derived.primaryBorder);
  }
  if (derived.primaryShadow) {
    root.style.setProperty('--theme-primary-shadow', derived.primaryShadow);
  }
  if (derived.primaryShadowHover) {
    root.style.setProperty('--theme-primary-shadow-hover', derived.primaryShadowHover);
  }
  if (derived.secondaryShadow) {
    root.style.setProperty('--theme-secondary-shadow', derived.secondaryShadow);
  }
  if (derived.secondaryShadowHover) {
    root.style.setProperty('--theme-secondary-shadow-hover', derived.secondaryShadowHover);
  }
}

/**
 * Map API business theme to full Theme object
 *
 * @param apiTheme - API theme response (may be null)
 * @returns Full Theme object with all required properties
 */
export function mapApiThemeToFullTheme(
  apiTheme: BusinessTheme | null | undefined
): Theme {
  // If no API theme, return default
  if (!apiTheme) {
    return defaultTheme;
  }

  const primaryColor = apiTheme.primaryColor || defaultTheme.colors.primary;
  const secondaryColor = apiTheme.secondaryColor || defaultTheme.colors.secondary;
  const primaryDark = darkenColor(primaryColor, 20);

  // Build full theme by merging with defaults
  const theme: Theme = {
    name: 'business',
    colors: {
      ...defaultTheme.colors,
      primary: primaryColor,
      primaryDark: primaryDark,
      secondary: secondaryColor,
      accent: primaryColor, // Use primary as accent
    },
    gradients: {
      primary: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryDark} 100%)`,
      secondary: `linear-gradient(135deg, ${secondaryColor} 0%, ${darkenColor(secondaryColor, 15)} 100%)`,
    },
  };

  return theme;
}
