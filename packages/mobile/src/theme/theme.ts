export interface Theme {
  name: string;
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

// Fallback theme for initial render and error scenarios
export const defaultTheme: Theme = {
  name: 'default',
  colors: {
    primary: '#8B5E3C',
    primaryDark: '#5D3A1A',
    secondary: '#C17F4A',
    background: '#FAF7F4',
    surface: 'rgba(255, 255, 255, 0.97)',
    text: '#2C1810',
    textSecondary: '#7A6B5D',
    accent: '#C17F4A',
    border: 'rgba(139, 94, 60, 0.12)',
    shadow: 'rgba(44, 24, 16, 0.06)',
    success: '#4caf50',
    warning: '#D4903C',
    error: '#C0392B',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #8B5E3C 0%, #5D3A1A 100%)',
    secondary: 'linear-gradient(135deg, #C17F4A 0%, #8B5E3C 100%)',
  },
};

