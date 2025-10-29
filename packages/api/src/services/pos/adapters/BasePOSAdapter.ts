import {
  POSMenuItem,
  POSOrder,
  POSSyncResult,
  POSConnectionStatus,
  POSCredentials,
  POSConfig,
  POSProvider,
} from "@drink-ux/shared";
import { IPOSProvider } from "../interfaces/IPOSProvider";

/**
 * Base abstract class for POS providers
 * Provides common functionality and enforces implementation of required methods
 */
export abstract class BasePOSAdapter implements IPOSProvider {
  protected readonly providerName: POSProvider;

  constructor(providerName: POSProvider) {
    this.providerName = providerName;
  }

  /**
   * Validate credentials are present
   */
  protected validateCredentials(credentials: POSCredentials): void {
    if (!credentials) {
      throw new Error(`${this.providerName}: Credentials are required`);
    }
  }

  /**
   * Validate config is present
   */
  protected validateConfig(config: POSConfig): void {
    if (!config) {
      throw new Error(`${this.providerName}: Configuration is required`);
    }
  }

  /**
   * Abstract methods that must be implemented by each provider
   */
  abstract testConnection(credentials: POSCredentials, config: POSConfig): Promise<POSConnectionStatus>;
  abstract fetchMenu(credentials: POSCredentials, config: POSConfig): Promise<POSMenuItem[]>;
  abstract submitOrder(order: POSOrder, credentials: POSCredentials, config: POSConfig): Promise<{ orderId: string; status: string }>;
  abstract syncMenu(credentials: POSCredentials, config: POSConfig): Promise<POSSyncResult>;
  abstract getOrderStatus(orderId: string, credentials: POSCredentials, config: POSConfig): Promise<{ status: string; details?: any }>;
}
