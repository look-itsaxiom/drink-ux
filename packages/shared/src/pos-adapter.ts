/**
 * POS Adapter Interface - Decorator Pattern
 * 
 * This interface defines the contract for POS system integrations.
 * Each POS provider (Square, Toast, Clover, etc.) implements this interface
 * to provide a uniform way to interact with different POS systems.
 */

import {
  POSCredentials,
  POSConfig,
  POSProduct,
  POSOrder,
  POSOrderResult,
} from './types';

/**
 * Base interface for all POS adapters
 */
export interface IPOSAdapter {
  /**
   * The provider name for this adapter
   */
  readonly provider: string;

  /**
   * Test the connection to the POS system
   */
  testConnection(): Promise<boolean>;

  /**
   * Fetch the menu/catalog from the POS system
   */
  fetchMenu(): Promise<POSProduct[]>;

  /**
   * Submit an order to the POS system
   */
  submitOrder(order: POSOrder): Promise<POSOrderResult>;

  /**
   * Get location information
   */
  getLocation(locationId: string): Promise<POSLocationInfo>;

  /**
   * Validate credentials
   */
  validateCredentials(): Promise<boolean>;
}

/**
 * Location information from POS system
 */
export interface POSLocationInfo {
  id: string;
  name: string;
  address?: string;
  timezone?: string;
  status: 'active' | 'inactive';
}

/**
 * Base abstract class for POS adapters
 * Provides common functionality and enforces the interface
 */
export abstract class BasePOSAdapter implements IPOSAdapter {
  protected credentials: POSCredentials;
  protected config: POSConfig;
  
  abstract readonly provider: string;

  constructor(credentials: POSCredentials, config: POSConfig) {
    this.credentials = credentials;
    this.config = config;
  }

  /**
   * Test connection - must be implemented by each adapter
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Fetch menu - must be implemented by each adapter
   */
  abstract fetchMenu(): Promise<POSProduct[]>;

  /**
   * Submit order - must be implemented by each adapter
   */
  abstract submitOrder(order: POSOrder): Promise<POSOrderResult>;

  /**
   * Get location - must be implemented by each adapter
   */
  abstract getLocation(locationId: string): Promise<POSLocationInfo>;

  /**
   * Validate credentials - must be implemented by each adapter
   */
  abstract validateCredentials(): Promise<boolean>;

  /**
   * Get configuration
   */
  getConfig(): POSConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<POSConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Factory for creating POS adapters
 */
export interface IPOSAdapterFactory {
  createAdapter(
    provider: string,
    credentials: POSCredentials,
    config: POSConfig
  ): IPOSAdapter;
}
