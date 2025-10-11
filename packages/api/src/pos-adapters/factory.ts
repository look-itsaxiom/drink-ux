/**
 * POS Adapter Factory
 * 
 * Factory pattern implementation for creating POS adapters
 * Supports pluggable architecture for different POS systems
 */

import {
  IPOSAdapter,
  IPOSAdapterFactory,
  POSCredentials,
  POSConfig,
} from '@drink-ux/shared';
import { SquareAdapter } from './square.adapter';

/**
 * Registry of available POS adapters
 */
type AdapterConstructor = new (
  credentials: POSCredentials,
  config: POSConfig
) => IPOSAdapter;

/**
 * POS Adapter Factory implementation
 */
export class POSAdapterFactory implements IPOSAdapterFactory {
  private static adapters: Map<string, AdapterConstructor> = new Map();

  /**
   * Register default adapters
   */
  static {
    this.registerAdapter('square', SquareAdapter);
    // Future adapters can be registered here:
    // this.registerAdapter('toast', ToastAdapter);
    // this.registerAdapter('clover', CloverAdapter);
  }

  /**
   * Register a new POS adapter
   */
  static registerAdapter(provider: string, adapter: AdapterConstructor): void {
    this.adapters.set(provider.toLowerCase(), adapter);
  }

  /**
   * Unregister a POS adapter (useful for testing)
   */
  static unregisterAdapter(provider: string): void {
    this.adapters.delete(provider.toLowerCase());
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if a provider is supported
   */
  static isProviderSupported(provider: string): boolean {
    return this.adapters.has(provider.toLowerCase());
  }

  /**
   * Create a POS adapter for the specified provider
   */
  createAdapter(
    provider: string,
    credentials: POSCredentials,
    config: POSConfig
  ): IPOSAdapter {
    const normalizedProvider = provider.toLowerCase();
    const AdapterClass = POSAdapterFactory.adapters.get(normalizedProvider);

    if (!AdapterClass) {
      throw new Error(
        `Unsupported POS provider: ${provider}. Supported providers: ${POSAdapterFactory.getSupportedProviders().join(', ')}`
      );
    }

    return new AdapterClass(credentials, config);
  }
}

// Export singleton instance
export const posAdapterFactory = new POSAdapterFactory();
