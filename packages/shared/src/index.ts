// Types - safe to import from API (no JSX)
export * from './types.js';

// Components - only import from React apps (mobile, admin)
// Note: Components are exported separately to avoid JSX issues in non-React packages
// Use: import { LayeredCup } from '@drink-ux/shared/components'
export * from './components/index.js';
