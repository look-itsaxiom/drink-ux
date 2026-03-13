import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Theme, defaultTheme } from './theme';
import { applyTheme, mapApiThemeToFullTheme } from './applyTheme';
import { fetchBusinessTheme, BusinessTheme } from '../services/themeService';

/**
 * Theme context type with extended functionality
 */
interface ThemeContextType {
  /** Current theme object */
  theme: Theme;
  /** Function to manually load a theme */
  loadTheme: (theme: Theme) => void;
  /** Whether theme is currently being loaded */
  isLoading: boolean;
  /** Error message if theme loading failed */
  error: string | null;
  /** Logo URL from business theme */
  logoUrl: string | null;
  /** Reload theme from API */
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hook to access theme context
 * @throws Error if used outside of ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Props for ThemeProvider component
 */
interface ThemeProviderProps {
  children: ReactNode;
  /** Business slug to fetch theme for (optional) */
  businessSlug?: string;
  /** API base URL override */
  apiBaseUrl?: string;
}

/**
 * ThemeProvider component that manages theme state and CSS variables
 *
 * When businessSlug is provided, fetches theme from API.
 * Falls back to defaultTheme on error or when no businessSlug is provided.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  businessSlug,
  apiBaseUrl,
}) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultTheme);
  const [isLoading, setIsLoading] = useState<boolean>(!!businessSlug);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  /**
   * Function to manually load a theme
   */
  const loadTheme = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  }, []);

  /**
   * Fetch and apply theme from API
   */
  const fetchAndApplyTheme = useCallback(async () => {
    if (!businessSlug) {
      setIsLoading(false);
      applyTheme(defaultTheme);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const apiTheme = await fetchBusinessTheme(businessSlug, { apiBaseUrl });

      // Map API theme to full theme object
      const fullTheme = mapApiThemeToFullTheme(apiTheme);

      // Update state
      setCurrentTheme(fullTheme);
      setLogoUrl(apiTheme?.logoUrl || null);

      // Apply to DOM
      applyTheme(fullTheme);
    } catch (err) {
      console.warn('Failed to load theme from API, using default theme:', err);
      setError(err instanceof Error ? err.message : 'Failed to load theme');

      // Fall back to default theme
      setCurrentTheme(defaultTheme);
      setLogoUrl(null);
      applyTheme(defaultTheme);
    } finally {
      setIsLoading(false);
    }
  }, [businessSlug, apiBaseUrl]);

  /**
   * Refresh theme from API
   */
  const refreshTheme = useCallback(async () => {
    await fetchAndApplyTheme();
  }, [fetchAndApplyTheme]);

  // Fetch theme on mount and when businessSlug changes
  useEffect(() => {
    fetchAndApplyTheme();
  }, [fetchAndApplyTheme]);

  // Apply default theme immediately on mount (before API response)
  useEffect(() => {
    applyTheme(defaultTheme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        loadTheme,
        isLoading,
        error,
        logoUrl,
        refreshTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
