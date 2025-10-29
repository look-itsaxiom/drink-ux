import { POSProvider } from "@drink-ux/shared";
import { IPOSProvider } from "./interfaces/IPOSProvider";
import { SquarePOSProvider } from "./providers/SquarePOSProvider";
import { ToastPOSProvider } from "./providers/ToastPOSProvider";
import { CloverPOSProvider } from "./providers/CloverPOSProvider";

/**
 * Factory for creating POS provider instances
 * This is the main entry point for getting a POS provider
 */
export class POSProviderFactory {
  private static providers: Map<POSProvider, IPOSProvider> = new Map();

  /**
   * Get a POS provider instance for the given provider type
   * Providers are cached as singletons
   */
  static getProvider(provider: POSProvider): IPOSProvider {
    // Check if provider is already instantiated
    if (this.providers.has(provider)) {
      return this.providers.get(provider)!;
    }

    // Create new provider instance
    let providerInstance: IPOSProvider;

    switch (provider) {
      case POSProvider.SQUARE:
        providerInstance = new SquarePOSProvider();
        break;
      case POSProvider.TOAST:
        providerInstance = new ToastPOSProvider();
        break;
      case POSProvider.CLOVER:
        providerInstance = new CloverPOSProvider();
        break;
      default:
        throw new Error(`Unsupported POS provider: ${provider}`);
    }

    // Cache the provider instance
    this.providers.set(provider, providerInstance);
    return providerInstance;
  }

  /**
   * Check if a provider is supported
   */
  static isProviderSupported(provider: string): boolean {
    return Object.values(POSProvider).includes(provider as POSProvider);
  }

  /**
   * Get list of all supported providers
   */
  static getSupportedProviders(): POSProvider[] {
    return Object.values(POSProvider);
  }
}
