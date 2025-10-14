import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, defaultTheme } from './theme';
// Import theme.json directly for now (placeholder for API)
import themeConfig from '../../theme.json';

interface ThemeContextType {
  theme: Theme;
  loadTheme: (theme: Theme) => void;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

    // Extract RGB from secondary color for alpha variations
    const secondaryColor = theme.colors.secondary;
    const secondaryRgb = hexToRgb(secondaryColor);
    if (secondaryRgb) {
      root.style.setProperty('--theme-secondary-shadow', `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.3)`);
      root.style.setProperty('--theme-secondary-shadow-hover', `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.4)`);
    }
  };

  // Function to manually load a theme (for API integration)
  const loadTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
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
    // TODO: Replace with actual API call when ready
    // For now, simulate API call with theme.json as placeholder
    const loadThemeFromAPI = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Use theme.json as placeholder for API response
        const theme = themeConfig as Theme;
        setCurrentTheme(theme);
        applyTheme(theme);
      } catch (error) {
        console.warn('Failed to load theme from API, using default theme:', error);
        // defaultTheme is already set as initial state, so fallback is automatic
        applyTheme(defaultTheme);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemeFromAPI();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        loadTheme,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
