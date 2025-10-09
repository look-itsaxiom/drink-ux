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

export const coffeeTheme: Theme = {
  name: 'coffee',
  colors: {
    primary: '#6B4226',
    primaryDark: '#4A2C1A',
    secondary: '#D4A574',
    background: '#ffffff',
    surface: 'rgba(255, 255, 255, 0.95)',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    accent: '#D4A574',
    border: '#e0e0e0',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #6B4226 0%, #4A2C1A 100%)',
    secondary: 'linear-gradient(135deg, #D4A574 0%, #B8956A 100%)',
  },
};

export const oceanTheme: Theme = {
  name: 'ocean',
  colors: {
    primary: '#0077be',
    primaryDark: '#004d7a',
    secondary: '#00a8cc',
    background: '#ffffff',
    surface: 'rgba(255, 255, 255, 0.95)',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    accent: '#00a8cc',
    border: '#e0e0e0',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #0077be 0%, #004d7a 100%)',
    secondary: 'linear-gradient(135deg, #00a8cc 0%, #0088a8 100%)',
  },
};

export const themes = {
  default: defaultTheme,
  coffee: coffeeTheme,
  ocean: oceanTheme,
};
