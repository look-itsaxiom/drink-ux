import {
  POSMenuItem,
  POSOrder,
  POSSyncResult,
  POSConnectionStatus,
  POSCredentials,
  POSConfig,
  POSProvider,
} from "@drink-ux/shared";
import { BasePOSAdapter } from "../adapters/BasePOSAdapter";
import { SquareClient } from "../clients/SquareClient";
import { SquareMapper } from "../mappers/SquareMapper";

/**
 * Square POS Provider Implementation
 * Integrates with Square's Catalog, Orders, and Locations APIs using the official Square SDK
 * 
 * This implementation makes it easy to onboard new partners by automatically
 * mapping their Square configuration to our common drink model.
 */
export class SquarePOSProvider extends BasePOSAdapter {
  constructor() {
    super(POSProvider.SQUARE);
  }

  /**
   * Test connection to Square API by retrieving location details
   * This verifies that credentials are valid and the location exists
   */
  async testConnection(credentials: POSCredentials, config: POSConfig): Promise<POSConnectionStatus> {
    this.validateCredentials(credentials);

    try {
      // Validate required fields
      if (!credentials.accessToken) {
        return {
          connected: false,
          provider: this.providerName,
          message: "Access token is required for Square integration",
        };
      }

      if (!config.locationId) {
        return {
          connected: false,
          provider: this.providerName,
          message: "Location ID is required for Square integration",
        };
      }

      // Create Square client and test connection
      const client = SquareClient.createClient(credentials, config);
      const { locations } = client;

      // Retrieve location to verify credentials and location access
      const response = await locations.get({ locationId: config.locationId });

      if (response.location) {
        return {
          connected: true,
          provider: this.providerName,
          message: `Successfully connected to Square location: ${response.location.name || config.locationId}`,
        };
      }

      return {
        connected: false,
        provider: this.providerName,
        message: "Location not found",
      };
    } catch (error) {
      return {
        connected: false,
        provider: this.providerName,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Fetch menu items from Square Catalog API
   * Uses the SquareMapper to transform Square catalog into our common model
   * This makes onboarding new partners seamless - their existing menu just works
   */
  async fetchMenu(credentials: POSCredentials, config: POSConfig): Promise<POSMenuItem[]> {
    this.validateCredentials(credentials);
    this.validateConfig(config);

    try {
      // Create Square client
      const client = SquareClient.createClient(credentials, config);
      const { catalog } = client;

      // List all catalog objects (items, modifiers, etc.)
      const page = await catalog.list({ types: "ITEM,MODIFIER_LIST" });

      const catalogObjects = page.data || [];

      // Use SquareMapper to convert Square catalog to our model
      // This is where the magic happens for partner onboarding
      const menuItems = SquareMapper.mapSquareCatalogToMenuItems(catalogObjects);

      return menuItems;
    } catch (error) {
      console.error("Error fetching menu from Square:", error);
      throw new Error(`Failed to fetch menu: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Submit order to Square Orders API
   * Transforms our order format to Square's format and creates the order
   */
  async submitOrder(
    order: POSOrder,
    credentials: POSCredentials,
    config: POSConfig
  ): Promise<{ orderId: string; status: string }> {
    this.validateCredentials(credentials);
    this.validateConfig(config);

    try {
      // Create Square client
      const client = SquareClient.createClient(credentials, config);
      const { orders } = client;

      // Transform our order to Square's format
      const squareOrder = {
        locationId: config.locationId!,
        lineItems: order.items.map((item) => ({
          catalogObjectId: item.menuItemId,
          quantity: item.quantity.toString(),
          modifiers: item.modifiers.map((mod) => ({
            catalogObjectId: mod.optionId,
          })),
          note: item.specialInstructions,
        })),
      };

      // Create order in Square
      const response = await orders.create({
        order: squareOrder,
        idempotencyKey: order.id, // Use our order ID for idempotency
      });

      if (response.order) {
        return {
          orderId: response.order.id || order.id,
          status: response.order.state || "PENDING",
        };
      }

      throw new Error("Failed to create order - no order returned");
    } catch (error) {
      console.error("Error submitting order to Square:", error);
      throw new Error(`Failed to submit order: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Sync menu from Square to our database
   * Fetches complete catalog and returns sync statistics
   */
  async syncMenu(credentials: POSCredentials, config: POSConfig): Promise<POSSyncResult> {
    this.validateCredentials(credentials);
    this.validateConfig(config);

    try {
      // Fetch current menu from Square
      const menuItems = await this.fetchMenu(credentials, config);

      // In a complete implementation, this would:
      // 1. Compare with existing items in database
      // 2. Add new items
      // 3. Update existing ones
      // 4. Deactivate removed ones
      // For now, return statistics based on fetched items

      return {
        itemsSynced: menuItems.length,
        itemsAdded: menuItems.length,
        itemsUpdated: 0,
        itemsDeactivated: 0,
        errors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        itemsSynced: 0,
        itemsAdded: 0,
        itemsUpdated: 0,
        itemsDeactivated: 0,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get order status from Square Orders API
   * Retrieves current order state and details
   */
  async getOrderStatus(
    orderId: string,
    credentials: POSCredentials,
    config: POSConfig
  ): Promise<{ status: string; details?: any }> {
    this.validateCredentials(credentials);

    try {
      // Create Square client
      const client = SquareClient.createClient(credentials, config);
      const { orders } = client;

      // Retrieve order from Square
      const response = await orders.get({ orderId });

      if (response.order) {
        const order = response.order;
        return {
          status: order.state || "UNKNOWN",
          details: {
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            totalMoney: order.totalMoney,
            lineItems: order.lineItems,
          },
        };
      }

      throw new Error("Order not found");
    } catch (error) {
      console.error("Error getting order status from Square:", error);
      throw new Error(`Failed to get order status: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
