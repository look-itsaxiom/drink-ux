// Re-export from shared package for backwards compatibility
// Import the CSS for styles (mobile app still uses the local CSS)
import './DrinkVisual.css';

export { DrinkVisual as default } from '@drink-ux/shared';
export type { DrinkVisualProps } from '@drink-ux/shared';
