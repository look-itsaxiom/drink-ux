// Theme Provider and Hook
export { ThemeProvider, useTheme } from './ThemeProvider';

// Theme Types, Presets, and Default
export { defaultTheme, themePresets, espressoTheme, oceanTheme, cherryTheme, forestTheme } from './theme';
export type { Theme } from './theme';

// Theme Utilities
export {
  applyTheme,
  hexToRgb,
  deriveThemeColors,
  mapApiThemeToFullTheme,
} from './applyTheme';
export type { RgbColor, DerivedThemeColors } from './applyTheme';
