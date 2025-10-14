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
    primary: '#667eea',
    primaryDark: '#764ba2',
    secondary: '#6B4226',
    background: '#ffffff',
    surface: 'rgba(255, 255, 255, 0.95)',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    accent: '#667eea',
    border: '#e0e0e0',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    secondary: 'linear-gradient(135deg, #6B4226 0%, #8B5A3C 100%)',
  },
};

