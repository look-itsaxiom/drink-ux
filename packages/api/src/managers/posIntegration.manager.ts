/**
 * POS Integration Manager
 * 
 * Manages POS integrations, menu synchronization, and order submission
 * Uses the adapter pattern to support multiple POS systems
 */

import {
  POSIntegration,
  POSCredentials,
  POSConfig,
  POSProduct,
  POSOrder,
  POSOrderResult,
  POSLocationInfo,
  IPOSAdapter,
} from '@drink-ux/shared';
import { posAdapterFactory, POSAdapterFactory } from '../pos-adapters';

export interface SyncMenuResult {
  success: boolean;
  productsCount: number;
  products?: POSProduct[];
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  provider: string;
  locationId?: string;
  locationName?: string;
  error?: string;
}

/**
 * POS Integration Manager
 */
export class POSIntegrationManager {
  /**
   * Create a POS adapter from integration configuration
   */
  private createAdapter(integration: POSIntegration): IPOSAdapter {
    return posAdapterFactory.createAdapter(
      integration.provider,
      integration.credentials,
      integration.config
    );
  }

  /**
   * Test connection to POS system
   */
  async testConnection(integration: POSIntegration): Promise<TestConnectionResult> {
    try {
      const adapter = this.createAdapter(integration);
      const isConnected = await adapter.testConnection();

      if (!isConnected) {
        return {
          success: false,
          provider: integration.provider,
          error: 'Failed to connect to POS system',
        };
      }

      // Try to get location info if available
      let locationInfo: POSLocationInfo | undefined;
      if (integration.config.locationId) {
        try {
          locationInfo = await adapter.getLocation(integration.config.locationId);
        } catch (error) {
          console.warn('Could not fetch location info:', error);
        }
      }

      return {
        success: true,
        provider: integration.provider,
        locationId: locationInfo?.id,
        locationName: locationInfo?.name,
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        provider: integration.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate POS credentials
   */
  async validateCredentials(
    provider: string,
    credentials: POSCredentials,
    config: POSConfig
  ): Promise<boolean> {
    try {
      const adapter = posAdapterFactory.createAdapter(provider, credentials, config);
      return await adapter.validateCredentials();
    } catch (error) {
      console.error('Credential validation failed:', error);
      return false;
    }
  }

  /**
   * Synchronize menu from POS system
   */
  async syncMenu(integration: POSIntegration): Promise<SyncMenuResult> {
    try {
      if (!integration.isActive) {
        return {
          success: false,
          productsCount: 0,
          error: 'POS integration is not active',
        };
      }

      const adapter = this.createAdapter(integration);
      const products = await adapter.fetchMenu();

      return {
        success: true,
        productsCount: products.length,
        products,
      };
    } catch (error) {
      console.error('Menu sync failed:', error);
      return {
        success: false,
        productsCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Submit order to POS system
   */
  async submitOrder(
    integration: POSIntegration,
    order: POSOrder
  ): Promise<POSOrderResult> {
    try {
      if (!integration.isActive) {
        return {
          success: false,
          error: 'POS integration is not active',
        };
      }

      const adapter = this.createAdapter(integration);
      
      // Ensure location ID is set
      if (!order.locationId && integration.config.locationId) {
        order.locationId = integration.config.locationId;
      }

      if (!order.locationId) {
        return {
          success: false,
          error: 'Location ID is required for order submission',
        };
      }

      return await adapter.submitOrder(order);
    } catch (error) {
      console.error('Order submission failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get location information from POS
   */
  async getLocationInfo(
    integration: POSIntegration,
    locationId?: string
  ): Promise<POSLocationInfo> {
    const adapter = this.createAdapter(integration);
    const locId = locationId || integration.config.locationId;

    if (!locId) {
      throw new Error('Location ID is required');
    }

    return await adapter.getLocation(locId);
  }

  /**
   * Get supported POS providers
   */
  getSupportedProviders(): string[] {
    return POSAdapterFactory.getSupportedProviders();
  }

  /**
   * Check if a provider is supported
   */
  isProviderSupported(provider: string): boolean {
    return POSAdapterFactory.isProviderSupported(provider);
  }
}

// Export singleton instance
export const posIntegrationManager = new POSIntegrationManager();
