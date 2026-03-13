import { POSProvider } from '@drink-ux/shared';
import { POSAdapter } from './POSAdapter';
import { SquareAdapter } from './SquareAdapter';

// Re-export types
export * from './POSAdapter';
export { SquareAdapter } from './SquareAdapter';
export { MockPOSAdapter } from './MockPOSAdapter';

/**
 * Factory function to get the appropriate POS adapter
 */
export function getAdapter(provider: POSProvider): POSAdapter {
  switch (provider) {
    case POSProvider.SQUARE:
      return new SquareAdapter();

    case POSProvider.TOAST:
      throw new Error('TOAST adapter not yet implemented');

    case POSProvider.CLOVER:
      throw new Error('CLOVER adapter not yet implemented');

    default:
      throw new Error(`Unsupported POS provider: ${provider}`);
  }
}
