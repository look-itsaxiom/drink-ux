import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Theme, defaultTheme, themePresets } from './theme';
import { applyTheme, mapApiThemeToFullTheme } from './applyTheme';
import { fetchBusinessTheme } from '../services/themeService';

const THEME_STORAGE_KEY = 'drink-ux-theme';

interface ThemeContextType {
  /** Current theme object */
  theme: Theme;
  /** Function to manually load a theme */
  loadTheme: (theme: Theme) => void;
  /** Switch to a preset theme by name */
  setThemeByName: (name: string) => void;
  /** Available theme presets */
  themePresets: Theme[];
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
   * Function to manually load a theme (with persistence and data-theme)
   */
  const loadTheme = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    document.documentElement.setAttribute('data-theme', theme.name);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.name);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  /**
   * Switch to a preset theme by name
   */
  const setThemeByName = useCallback((name: string) => {
    const found = themePresets.find((t) => t.name === name);
    if (found) {
      loadTheme(found);
    }
  }, [loadTheme]);

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

  // Apply saved preset or default theme immediately on mount (before API response)
  useEffect(() => {
    let initial = defaultTheme;
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        const found = themePresets.find((t) => t.name === saved);
        if (found) initial = found;
      }
    } catch {
      // localStorage may be unavailable
    }
    setCurrentTheme(initial);
    applyTheme(initial);
    document.documentElement.setAttribute('data-theme', initial.name);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        loadTheme,
        setThemeByName,
        themePresets,
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
