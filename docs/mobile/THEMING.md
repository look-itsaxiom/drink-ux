# Theming System

The mobile app now supports a comprehensive theming system that allows for easy customization of the UI appearance through a simple JSON configuration file.

## Overview

The theming system is configured through a `theme.json` file at the root of the `packages/mobile` directory. This allows for dynamic theme changes based on external factors without requiring code modifications or redeployment.

## Configuration File

The theme is defined in `/packages/mobile/theme.json`:

```json
{
  "name": "default",
  "colors": {
    "primary": "#667eea",
    "primaryDark": "#764ba2",
    "secondary": "#6B4226",
    "background": "#ffffff",
    "surface": "rgba(255, 255, 255, 0.95)",
    "text": "#2c3e50",
    "textSecondary": "#7f8c8d",
    "accent": "#667eea",
    "border": "#e0e0e0",
    "shadow": "rgba(0, 0, 0, 0.1)",
    "success": "#4caf50",
    "warning": "#ff9800",
    "error": "#f44336"
  },
  "gradients": {
    "primary": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "secondary": "linear-gradient(135deg, #6B4226 0%, #8B5A3C 100%)"
  }
}
```

## Theme Examples

### Default Theme (Purple/Blue)
```json
{
  "name": "default",
  "colors": {
    "primary": "#667eea",
    "primaryDark": "#764ba2",
    "accent": "#667eea"
  },
  "gradients": {
    "primary": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  }
}
```

### Coffee Theme (Brown/Gold)
```json
{
  "name": "coffee",
  "colors": {
    "primary": "#6B4226",
    "primaryDark": "#4A2C1A",
    "accent": "#D4A574"
  },
  "gradients": {
    "primary": "linear-gradient(135deg, #6B4226 0%, #4A2C1A 100%)"
  }
}
```

### Ocean Theme (Blue/Cyan)
```json
{
  "name": "ocean",
  "colors": {
    "primary": "#0077be",
    "primaryDark": "#004d7a",
    "accent": "#00a8cc"
  },
  "gradients": {
    "primary": "linear-gradient(135deg, #0077be 0%, #004d7a 100%)"
  }
}
```

## How to Change the Theme

Simply edit the `/packages/mobile/theme.json` file with your desired colors and gradients. The changes will be applied when the application is built or the development server is restarted.

**Steps:**
1. Open `/packages/mobile/theme.json`
2. Update the color values and gradients
3. Save the file
4. Rebuild the application or restart the dev server

## Features

- **CSS Custom Properties**: All colors and gradients are applied as CSS variables
- **Auto-calculated Colors**: Derived colors (light, border, shadow variants) are automatically generated from the primary color
- **Type-Safe**: Full TypeScript support with theme interface validation
- **No Code Changes Required**: Change themes without modifying any source code

## Theme Schema

### Required Fields

#### `name` (string)
A unique identifier for the theme.

#### `colors` (object)
- `primary`: Main brand color
- `primaryDark`: Darker shade of primary
- `secondary`: Secondary brand color
- `background`: Page background color
- `surface`: Surface/card background color
- `text`: Primary text color
- `textSecondary`: Secondary text color
- `accent`: Accent color for highlights
- `border`: Border color
- `shadow`: Shadow color
- `success`: Success state color
- `warning`: Warning state color
- `error`: Error state color

#### `gradients` (object)
- `primary`: Primary gradient (typically used for backgrounds and buttons)
- `secondary`: Secondary gradient (for alternate styles)

## Using Themes in Components

The theme is automatically applied to all components through CSS variables. You can access the current theme in React components:

```tsx
import { useTheme } from '../theme';

const MyComponent: React.FC = () => {
  const { theme } = useTheme();
  
  return <div>Current theme: {theme.name}</div>;
};
```

## Available CSS Variables

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

### Color Variables
- `--theme-primary`
- `--theme-primaryDark`
- `--theme-secondary`
- `--theme-background`
- `--theme-surface`
- `--theme-text`
- `--theme-textSecondary`
- `--theme-accent`
- `--theme-border`
- `--theme-shadow`
- `--theme-success`
- `--theme-warning`
- `--theme-error`

### Gradient Variables
- `--theme-gradient-primary`
- `--theme-gradient-secondary`

### Auto-calculated Variables
These are automatically generated from the primary color:
- `--theme-primary-light`: Primary color with 10% opacity
- `--theme-primary-border`: Primary color with 30% opacity
- `--theme-primary-shadow`: Primary color with 40% opacity
- `--theme-primary-shadow-hover`: Primary color with 60% opacity

## Architecture

### File Structure

```
packages/mobile/
├── theme.json              # Theme configuration (edit this!)
└── src/
    └── theme/
        ├── theme.ts        # Theme TypeScript interface
        ├── ThemeProvider.tsx  # React Context provider
        ├── theme.css       # CSS variables and helper classes
        └── index.ts        # Public exports
```

### How It Works

1. **Load**: On app initialization, the ThemeProvider reads `theme.json`
2. **Apply**: Theme colors are applied to CSS custom properties on the document root
3. **Derive**: Shadow and overlay colors are auto-generated from the primary color
4. **Update**: Components automatically update when using CSS variables

## Best Practices

1. **Use CSS Variables**: Always use theme variables instead of hardcoding colors
2. **Semantic Naming**: Use variables that match the element's purpose
3. **Contrast**: Ensure sufficient contrast ratios for accessibility
4. **Test**: Verify the theme works well in all application views
5. **Document**: When creating custom themes, document the color choices

## Dynamic Theme Loading

For advanced use cases where themes need to be loaded dynamically based on runtime factors (API responses, user preferences, etc.), you can extend the ThemeProvider to fetch and apply themes from external sources.

## Migration from Hardcoded Colors

To migrate existing components:

1. Find all hardcoded color values
2. Replace with appropriate CSS variables
3. Test with your theme configuration

**Before:**
```css
.element {
  background: #667eea;
  color: #2c3e50;
}
```

**After:**
```css
.element {
  background: var(--theme-primary);
  color: var(--theme-text);
}
```

