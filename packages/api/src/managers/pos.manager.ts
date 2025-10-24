import { POSProvider, POSCredentials, POSConfig, POSMenuItem, POSOrder, POSSyncResult, POSConnectionStatus } from "@drink-ux/shared";
import { POSProviderFactory } from "../services/pos/POSProviderFactory";
import { posIntegrationRepository } from "../repositories/posIntegration.repository";

/**
 * Manager for POS operations
 * Coordinates between POS providers and database operations
 */
export class POSManager {
  /**
   * Test connection to a POS system
   */
  async testConnection(provider: POSProvider, credentials: POSCredentials, config: POSConfig): Promise<POSConnectionStatus> {
    const posProvider = POSProviderFactory.getProvider(provider);
    return await posProvider.testConnection(credentials, config);
  }

  /**
   * Fetch menu from a POS system
   */
  async fetchMenu(provider: POSProvider, credentials: POSCredentials, config: POSConfig): Promise<POSMenuItem[]> {
    const posProvider = POSProviderFactory.getProvider(provider);
    return await posProvider.fetchMenu(credentials, config);
  }

  /**
   * Submit order to a POS system
   */
  async submitOrder(provider: POSProvider, order: POSOrder, credentials: POSCredentials, config: POSConfig): Promise<{ orderId: string; status: string }> {
    const posProvider = POSProviderFactory.getProvider(provider);
    return await posProvider.submitOrder(order, credentials, config);
  }

  /**
   * Sync menu from POS system and store in database
   */
  async syncMenu(partnerId: string, provider: POSProvider, credentials: POSCredentials, config: POSConfig): Promise<POSSyncResult> {
    const posProvider = POSProviderFactory.getProvider(provider);
    const syncResult = await posProvider.syncMenu(credentials, config);

    // Update last sync time in database
    await posIntegrationRepository.updateLastSyncTime(partnerId);

    return syncResult;
  }

  /**
   * Get order status from POS system
   */
  async getOrderStatus(provider: POSProvider, orderId: string, credentials: POSCredentials, config: POSConfig): Promise<{ status: string; details?: any }> {
    const posProvider = POSProviderFactory.getProvider(provider);
    return await posProvider.getOrderStatus(orderId, credentials, config);
  }

  /**
   * Get POS integration for a partner
   */
  async getIntegrationByPartnerId(partnerId: string) {
    return await posIntegrationRepository.findByPartnerId(partnerId);
  }

  /**
   * Create or update POS integration for a partner
   */
  async upsertIntegration(partnerId: string, provider: POSProvider, credentials: POSCredentials, config: POSConfig) {
    // First test the connection
    const connectionStatus = await this.testConnection(provider, credentials, config);

    if (!connectionStatus.connected) {
      throw new Error(`Failed to connect to ${provider}: ${connectionStatus.message}`);
    }

    // Check if integration exists
    const existingIntegration = await posIntegrationRepository.findByPartnerId(partnerId);

    if (existingIntegration) {
      // Update existing integration
      return await posIntegrationRepository.update(existingIntegration.id, {
        provider: provider as string,
        isActive: true,
      });
    } else {
      // Create new integration
      return await posIntegrationRepository.create({
        partnerId,
        provider: provider as string,
        isActive: true,
      });
    }
  }

  /**
   * Deactivate POS integration
   */
  async deactivateIntegration(partnerId: string) {
    const integration = await posIntegrationRepository.findByPartnerId(partnerId);
    if (!integration) {
      throw new Error("POS integration not found");
    }

    return await posIntegrationRepository.update(integration.id, {
      isActive: false,
    });
  }

  /**
   * Get supported providers
   */
  getSupportedProviders(): POSProvider[] {
    return POSProviderFactory.getSupportedProviders();
  }
}

export const posManager = new POSManager();
