export interface Theme {
  name: string;
  label: string;
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    border: string;
    shadow: string;
    success: string;
    warning: string;
    error: string;
  };
  gradients: {
    primary: string;
    secondary: string;
  };
}

// ── Theme Presets (extracted from designs/prototypes/mobile-home-v1.html) ──

export const espressoTheme: Theme = {
  name: 'espresso',
  label: 'Espresso',
  colors: {
    primary: '#6B4226',
    primaryDark: '#4a2e1a',
    secondary: '#D4A574',
    background: '#FDF8F5',
    surface: '#FFFFFF',
    text: '#2C1810',
    textSecondary: '#8B7E74',
    accent: '#E67E22',
    border: 'rgba(107, 66, 38, 0.12)',
    shadow: 'rgba(107, 66, 38, 0.15)',
    success: '#2D9B6F',
    warning: '#F59E0B',
    error: '#E53E3E',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #6B4226, #a0622f)',
    secondary: 'linear-gradient(135deg, #D4A574, #e8c18a)',
  },
};

export const oceanTheme: Theme = {
  name: 'ocean',
  label: 'Ocean',
  colors: {
    primary: '#1A6B8A',
    primaryDark: '#0f4d65',
    secondary: '#5BC4D4',
    background: '#F0F9FC',
    surface: '#FFFFFF',
    text: '#0D2D3A',
    textSecondary: '#4A7A8A',
    accent: '#FF6B6B',
    border: 'rgba(26, 107, 138, 0.12)',
    shadow: 'rgba(26, 107, 138, 0.15)',
    success: '#2D9B6F',
    warning: '#F59E0B',
    error: '#E53E3E',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #1A6B8A, #2589ad)',
    secondary: 'linear-gradient(135deg, #5BC4D4, #7dd8e6)',
  },
};

export const cherryTheme: Theme = {
  name: 'cherry',
  label: 'Cherry',
  colors: {
    primary: '#C0392B',
    primaryDark: '#922b21',
    secondary: '#F1948A',
    background: '#FFF5F5',
    surface: '#FFFFFF',
    text: '#2C1010',
    textSecondary: '#8B6060',
    accent: '#E67E22',
    border: 'rgba(192, 57, 43, 0.12)',
    shadow: 'rgba(192, 57, 43, 0.15)',
    success: '#2D9B6F',
    warning: '#F59E0B',
    error: '#E53E3E',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #C0392B, #e04e40)',
    secondary: 'linear-gradient(135deg, #F1948A, #f5b0aa)',
  },
};

export const forestTheme: Theme = {
  name: 'forest',
  label: 'Forest',
  colors: {
    primary: '#2D6A4F',
    primaryDark: '#1b4332',
    secondary: '#74C69D',
    background: '#F2FAF5',
    surface: '#FFFFFF',
    text: '#1B3A2A',
    textSecondary: '#52796F',
    accent: '#95D5B2',
    border: 'rgba(45, 106, 79, 0.12)',
    shadow: 'rgba(45, 106, 79, 0.15)',
    success: '#2D9B6F',
    warning: '#F59E0B',
    error: '#E53E3E',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #2D6A4F, #3d8a67)',
    secondary: 'linear-gradient(135deg, #74C69D, #95d5b2)',
  },
};

export const themePresets: Theme[] = [
  espressoTheme,
  oceanTheme,
  cherryTheme,
  forestTheme,
];

// Default theme is espresso (matches the prototype's :root)
export const defaultTheme: Theme = espressoTheme;
