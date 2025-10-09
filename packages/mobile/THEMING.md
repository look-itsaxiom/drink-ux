# Theming System

The mobile app now supports a comprehensive theming system that allows for easy customization of the UI appearance.

## Features

- **CSS Custom Properties**: All colors and gradients are defined as CSS variables for easy customization
- **React Context API**: Theme state management using React Context
- **Multiple Built-in Themes**: Includes default, coffee, and ocean themes
- **Theme Persistence**: User's theme preference is saved to localStorage
- **Easy Theme Switching**: Simple API to switch between themes programmatically
- **Theme Switcher Component**: UI component for users to change themes

## Available Themes

### Default Theme
- Primary: Purple/Blue gradient (#667eea to #764ba2)
- Accent: Purple (#667eea)
- Best for: Modern, vibrant look

### Coffee Theme
- Primary: Brown gradient (#6B4226 to #4A2C1A)
- Accent: Gold (#D4A574)
- Best for: Coffee shop branding, warm aesthetic

### Ocean Theme
- Primary: Blue gradient (#0077be to #004d7a)
- Accent: Cyan (#00a8cc)
- Best for: Fresh, clean look

## Usage

### Using the Theme in Components

```tsx
import { useTheme } from '../theme';

const MyComponent: React.FC = () => {
  const { theme, setTheme } = useTheme();
  
  // Access current theme
  console.log(theme.name); // 'default', 'coffee', or 'ocean'
  
  // Change theme
  const switchToCoffee = () => {
    setTheme('coffee');
  };
  
  return <div>Current theme: {theme.name}</div>;
};
```

### Using CSS Variables

All theme colors are available as CSS custom properties:

```css
.my-element {
  /* Use theme colors */
  background: var(--theme-primary);
  color: var(--theme-text);
  border: 1px solid var(--theme-border);
  
  /* Use theme gradients */
  background: var(--theme-gradient-primary);
}
```

### Available CSS Variables

#### Colors
- `--theme-primary`: Primary brand color
- `--theme-primaryDark`: Darker shade of primary
- `--theme-secondary`: Secondary brand color
- `--theme-background`: Page background color
- `--theme-surface`: Surface/card background color
- `--theme-text`: Primary text color
- `--theme-textSecondary`: Secondary text color
- `--theme-accent`: Accent color for highlights
- `--theme-border`: Border color
- `--theme-shadow`: Shadow color
- `--theme-success`: Success state color
- `--theme-warning`: Warning state color
- `--theme-error`: Error state color

#### Gradients
- `--theme-gradient-primary`: Primary gradient
- `--theme-gradient-secondary`: Secondary gradient

#### Derived Colors (auto-calculated)
- `--theme-primary-light`: Primary color with 10% opacity
- `--theme-primary-border`: Primary color with 30% opacity
- `--theme-primary-shadow`: Primary color with 40% opacity
- `--theme-primary-shadow-hover`: Primary color with 60% opacity

## Adding New Themes

To add a new theme, edit `/src/theme/theme.ts`:

```typescript
export const myNewTheme: Theme = {
  name: 'myNewTheme',
  colors: {
    primary: '#your-color',
    primaryDark: '#your-dark-color',
    // ... other colors
  },
  gradients: {
    primary: 'linear-gradient(135deg, #color1 0%, #color2 100%)',
    secondary: 'linear-gradient(135deg, #color3 0%, #color4 100%)',
  },
};

// Add to themes object
export const themes = {
  default: defaultTheme,
  coffee: coffeeTheme,
  ocean: oceanTheme,
  myNewTheme: myNewTheme, // Add your theme here
};
```

## Architecture

### Files Structure

```
src/theme/
├── theme.ts              # Theme definitions and configurations
├── ThemeProvider.tsx     # React Context provider for theme state
├── theme.css            # CSS variables and helper classes
└── index.ts             # Public exports
```

### Theme Provider

The `ThemeProvider` component wraps the entire app in `App.tsx`:

```tsx
import { ThemeProvider } from './theme';

const App: React.FC = () => (
  <ThemeProvider>
    <IonApp>
      {/* Your app content */}
    </IonApp>
  </ThemeProvider>
);
```

### How It Works

1. **Initialization**: On app load, the theme provider checks localStorage for saved theme preference
2. **Application**: Theme colors are applied to CSS custom properties on the document root
3. **Components**: Components use CSS variables which automatically update when theme changes
4. **Persistence**: When theme changes, the new preference is saved to localStorage

## Best Practices

1. **Always use CSS variables**: Instead of hardcoding colors, use theme variables
2. **Semantic naming**: Use theme variables that match the element's purpose (e.g., `--theme-text` for text)
3. **Consistent spacing**: Maintain consistent spacing and sizing across themes
4. **Test all themes**: When adding new UI elements, test with all available themes
5. **Accessibility**: Ensure sufficient contrast ratios in all themes

## Examples

### Example 1: Themed Button

```css
.my-button {
  background: var(--theme-gradient-primary);
  color: white;
  border: none;
  box-shadow: 0 4px 8px var(--theme-primary-shadow);
}

.my-button:hover {
  box-shadow: 0 6px 12px var(--theme-primary-shadow-hover);
}
```

### Example 2: Themed Card

```css
.my-card {
  background: var(--theme-surface);
  border: 1px solid var(--theme-border);
  box-shadow: 0 2px 4px var(--theme-shadow);
}

.my-card h2 {
  color: var(--theme-text);
}

.my-card p {
  color: var(--theme-textSecondary);
}

.my-card .accent-text {
  color: var(--theme-accent);
}
```

## Migration Guide

To migrate existing components to use theming:

1. Find all hardcoded color values
2. Replace with appropriate CSS variables
3. Test with all available themes
4. Update any inline styles to use CSS classes

### Before:
```css
.element {
  background: #667eea;
  color: #2c3e50;
}
```

### After:
```css
.element {
  background: var(--theme-primary);
  color: var(--theme-text);
}
```
