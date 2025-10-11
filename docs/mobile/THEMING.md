# Theming System

The mobile app now supports a comprehensive theming system that allows for easy customization of the UI appearance through a simple JSON configuration file.

## Overview

The theming system is designed to load themes dynamically from an API call. The `theme.json` file currently serves as a placeholder/mock for development, but the system is built to handle real API integration.

## Theme Loading Strategy

### 1. **Fallback Theme**
- CSS variables in `theme.css` provide immediate fallback values
- TypeScript `defaultTheme` in `theme.ts` serves as JavaScript fallback
- Ensures app renders correctly before API call completes

### 2. **API Theme Loading** (Planned)
- `ThemeProvider` will make API call on app initialization
- API response will override fallback theme values
- Error handling falls back to default theme

### 3. **Current Development Setup**
- `theme.json` simulates API response for development
- Easy to test different themes by editing JSON file
- Seamless transition to real API when ready

## Configuration

### Development (Current)
Edit `/packages/mobile/theme.json` to test different themes:

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

### Production (API Integration)
When ready, replace the placeholder in `ThemeProvider.tsx`:

```tsx
// Replace this placeholder:
const theme = themeConfig as Theme;

// With actual API call:
const response = await fetch('/api/theme');
const theme = await response.json();
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
These are automatically generated from theme colors:
- `--theme-primary-light`: Primary color with 10% opacity
- `--theme-primary-border`: Primary color with 30% opacity  
- `--theme-primary-shadow`: Primary color with 40% opacity
- `--theme-primary-shadow-hover`: Primary color with 60% opacity
- `--theme-secondary-shadow`: Secondary color with 30% opacity
- `--theme-secondary-shadow-hover`: Secondary color with 40% opacity

## Utility Classes

The theme system includes pre-built utility classes for common UI patterns. These classes ensure consistency and reduce code duplication across components.

### Layout Classes
- `.container`: Standard page container (24px padding, flex column, gap)
- `.container-compact`: Compact container (16px padding, flex column, gap)
- `.section`: Standard content section (surface background, padding, rounded corners, shadow)
- `.section-compact`: Compact section variant

### Interactive Item Classes
- `.interactive-item`: Base class for clickable list items with hover/active states
- `.interactive-item-large`: Larger variant for main navigation items (80px min-height)

### Animation Classes
- `.slide-in-up`: Standard slide-up entrance animation (0.6s duration)
- `.slide-in-up-fast`: Faster slide-up animation (0.4s duration)

### Button Enhancement Classes
- `.button-elevated`: Enhanced button with elevation shadow and hover effects

### Card Enhancement Classes  
- `.card-elevated`: Card with hover lift effect and enhanced shadows

### Typography Classes
- `.section-title`: Standard section heading (1.5rem, bold, centered)
- `.page-title`: Large page title (2.5rem, bold, text shadow)
- `.page-subtitle`: Page subtitle (1.1rem, slight opacity)

### Theme Helper Classes
- `.theme-bg-primary`: Primary gradient background
- `.theme-bg-secondary`: Secondary gradient background with shadow
- `.theme-bg-surface`: Surface background
- `.theme-text-primary`: Primary color text
- `.theme-text`: Default text color
- `.theme-text-secondary`: Secondary text color

### Usage Example
```tsx
// Instead of custom CSS for each component
<div className="container">
  <div className="section">
    <h2 className="section-title">Menu Items</h2>
    <IonItem className="interactive-item slide-in-up">
      <IonLabel className="theme-text">Coffee</IonLabel>
    </IonItem>
  </div>
</div>
```

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

### Theme Variables
1. **Use CSS Variables**: Always use theme variables instead of hardcoding colors
2. **Semantic Naming**: Use variables that match the element's purpose  
3. **Contrast**: Ensure sufficient contrast ratios for accessibility
4. **Test**: Verify the theme works well in all application views
5. **Document**: When creating custom themes, document the color choices

### Utility Classes
1. **Prefer Utility Classes**: Use pre-built utility classes for common patterns instead of writing custom CSS
2. **Component-Specific CSS**: Only write custom CSS for truly unique component features
3. **Consistency**: Use `.interactive-item` for all clickable list items
4. **Animations**: Use `.slide-in-up` or `.slide-in-up-fast` for entrance animations
5. **Layout**: Use `.container` and `.section` for standard page layouts

### Component Development
1. **Start with Utilities**: Begin new components by applying relevant utility classes
2. **Minimize Custom CSS**: Component CSS files should only contain styles unique to that component
3. **Theme Compliance**: Ensure all colors come from theme variables, not hardcoded values
4. **Test Themes**: Verify components work with different theme configurations

## Dynamic Theme Loading

For advanced use cases where themes need to be loaded dynamically based on runtime factors (API responses, user preferences, etc.), you can extend the ThemeProvider to fetch and apply themes from external sources.

## Migration and Refactoring Guide

### From Hardcoded Colors to Theme Variables

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

### From Custom CSS to Utility Classes

To reduce duplication and improve consistency:

1. Identify common patterns in component CSS files
2. Replace with utility classes from the theme system
3. Keep only component-specific styles in individual CSS files

**Before:**
```css
/* In ComponentA.css */
.item {
  background: var(--theme-surface);
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 16px var(--theme-shadow);
  transition: transform 0.3s ease;
}
.item:hover {
  transform: translateY(-2px);
}

/* In ComponentB.css - Same pattern repeated! */
.card {
  background: var(--theme-surface);
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 16px var(--theme-shadow);
  transition: transform 0.3s ease;
}
.card:hover {
  transform: translateY(-2px);
}
```

**After:**
```tsx
// Use utility classes in JSX
<div className="section card-elevated">
  {/* Content */}
</div>

// Minimal component-specific CSS
/* ComponentA.css - Only unique styles */
.special-icon {
  margin-right: 12px;
}
```

This approach ensures that:
- Theme changes propagate consistently
- Common patterns are centralized
- Component CSS files focus on unique features
- Maintenance is simplified

