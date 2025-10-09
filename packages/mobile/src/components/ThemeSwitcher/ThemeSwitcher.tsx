import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { colorPaletteOutline } from 'ionicons/icons';
import { useTheme } from '../../theme';
import './ThemeSwitcher.css';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, availableThemes } = useTheme();

  const handleThemeChange = () => {
    const themeKeys = Object.keys(availableThemes) as Array<keyof typeof availableThemes>;
    const currentIndex = themeKeys.indexOf(theme.name as keyof typeof availableThemes);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setTheme(themeKeys[nextIndex]);
  };

  return (
    <div className="theme-switcher">
      <IonButton 
        onClick={handleThemeChange} 
        fill="clear" 
        className="theme-button"
        title={`Current theme: ${theme.name}`}
      >
        <IonIcon icon={colorPaletteOutline} slot="icon-only" />
      </IonButton>
      <span className="theme-name">{theme.name}</span>
    </div>
  );
};

export default ThemeSwitcher;
