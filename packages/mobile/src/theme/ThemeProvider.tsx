import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, defaultTheme } from './theme';
import themeConfig from '../../theme.json';

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
    
    // Apply gradient variables
    Object.entries(theme.gradients).forEach(([key, value]) => {
      root.style.setProperty(`--theme-gradient-${key}`, value);
    });

    // Apply derived color variables (with alpha for shadows and overlays)
    // Extract RGB from primary color for alpha variations
    const primaryColor = theme.colors.primary;
    const primaryRgb = hexToRgb(primaryColor);
    if (primaryRgb) {
      root.style.setProperty('--theme-primary-light', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
      root.style.setProperty('--theme-primary-border', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`);
      root.style.setProperty('--theme-primary-shadow', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.4)`);
      root.style.setProperty('--theme-primary-shadow-hover', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.6)`);
    }
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  useEffect(() => {
    // Load theme from theme.json file
    const theme = themeConfig as Theme;
    setCurrentTheme(theme);
    applyTheme(theme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
