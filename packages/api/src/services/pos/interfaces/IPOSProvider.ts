import {
  POSMenuItem,
  POSOrder,
  POSSyncResult,
  POSConnectionStatus,
  POSCredentials,
  POSConfig,
} from "@drink-ux/shared";

/**
 * Base interface that all POS providers must implement
 * This abstraction allows us to support multiple POS systems
 * with a unified API
 */
export interface IPOSProvider {
  /**
   * Test the connection to the POS system
   */
  testConnection(credentials: POSCredentials, config: POSConfig): Promise<POSConnectionStatus>;

  /**
   * Fetch menu items from the POS system
   */
  fetchMenu(credentials: POSCredentials, config: POSConfig): Promise<POSMenuItem[]>;

  /**
   * Submit an order to the POS system
   */
  submitOrder(order: POSOrder, credentials: POSCredentials, config: POSConfig): Promise<{ orderId: string; status: string }>;

  /**
   * Sync menu from POS system to our database
   */
  syncMenu(credentials: POSCredentials, config: POSConfig): Promise<POSSyncResult>;

  /**
   * Get order status from POS system
   */
  getOrderStatus(orderId: string, credentials: POSCredentials, config: POSConfig): Promise<{ status: string; details?: any }>;
}
