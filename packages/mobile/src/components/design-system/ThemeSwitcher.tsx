import React from 'react';
import { useTheme } from '../../theme';

const SWATCH_COLORS: Record<string, string> = {
  espresso: '#6B4226',
  ocean: '#1A6B8A',
  cherry: '#C0392B',
  forest: '#2D6A4F',
};

export const ThemeSwitcher: React.FC = () => {
  const { theme, setThemeByName, themePresets } = useTheme();

  return (
    <div className="theme-switcher">
      <span className="theme-switcher-label">Theme</span>
      {themePresets.map((preset) => (
        <button
          key={preset.name}
          className={`theme-swatch${theme.name === preset.name ? ' active' : ''}`}
          style={{ background: SWATCH_COLORS[preset.name] || preset.colors.primary }}
          onClick={() => setThemeByName(preset.name)}
          aria-label={`Switch to ${preset.label} theme`}
          title={preset.label}
        />
      ))}
    </div>
  );
};
