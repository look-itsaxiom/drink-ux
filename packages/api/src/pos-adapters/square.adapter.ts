/**
 * Square POS Adapter Implementation
 * 
 * Integrates with Square's API for menu synchronization and order submission
 * Based on Square API documentation: https://developer.squareup.com
 * 
 * Key APIs used:
 * - Catalog API: For menu items and modifiers
 * - Orders API: For order submission
 * - Locations API: For location management
 */

import {
  BasePOSAdapter,
  POSCredentials,
  POSConfig,
  POSProduct,
  POSProductVariation,
  POSModifierList,
  POSModifier,
  POSOrder,
  POSOrderResult,
  POSLocationInfo,
} from '@drink-ux/shared';

/**
 * Square-specific types based on their API
 */
interface SquareCatalogObject {
  id: string;
  type: string;
  item_data?: {
    name: string;
    description?: string;
    category_id?: string;
    variations?: SquareItemVariation[];
    modifier_list_info?: SquareModifierListInfo[];
    image_ids?: string[];
  };
  category_data?: {
    name: string;
  };
  modifier_list_data?: {
    name: string;
    selection_type?: 'SINGLE' | 'MULTIPLE';
    modifiers?: SquareModifierData[];
  };
  modifier_data?: {
    name: string;
    price_money?: {
      amount: number;
      currency: string;
    };
  };
}

interface SquareItemVariation {
  id: string;
  item_variation_data: {
    name: string;
    price_money?: {
      amount: number;
      currency: string;
    };
    item_id: string;
  };
}

interface SquareModifierListInfo {
  modifier_list_id: string;
  min_selected_modifiers?: number;
  max_selected_modifiers?: number;
  enabled?: boolean;
}

interface SquareModifierData {
  id: string;
  modifier_data: {
    name: string;
    price_money?: {
      amount: number;
      currency: string;
    };
  };
}

interface SquareLocation {
  id: string;
  name: string;
  address?: {
    address_line_1?: string;
    locality?: string;
    administrative_district_level_1?: string;
  };
  timezone?: string;
  status: string;
}

/**
 * Square POS Adapter
 */
export class SquareAdapter extends BasePOSAdapter {
  readonly provider = 'square';
  private baseUrl: string;
  private apiVersion = '2024-06-04'; // Latest stable version

  constructor(credentials: POSCredentials, config: POSConfig) {
    super(credentials, config);
    // Use sandbox for testing or production URL
    this.baseUrl = this.isProduction() 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';
  }

  /**
   * Determine if running in production based on credentials
   */
  private isProduction(): boolean {
    // Production access tokens start with 'sq0atp-' or 'sq0csp-'
    // Sandbox tokens start with 'EAA' or 'EAAA'
    const token = this.credentials.accessToken || '';
    return token.startsWith('sq0atp-') || token.startsWith('sq0csp-');
  }

  /**
   * Make API request to Square
   */
  private async makeRequest<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}/v2${endpoint}`;
    
    const headers: Record<string, string> = {
      'Square-Version': this.apiVersion,
      'Authorization': `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Square API error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      return await response.json() as T;
    } catch (error) {
      console.error('Square API request failed:', error);
      throw error;
    }
  }

  /**
   * Test connection to Square API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ locations: any[] }>('/locations');
      return response.locations && response.locations.length > 0;
    } catch (error) {
      console.error('Square connection test failed:', error);
      return false;
    }
  }

  /**
   * Validate credentials
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.credentials.accessToken) {
      return false;
    }

    return await this.testConnection();
  }

  /**
   * Get location information
   */
  async getLocation(locationId: string): Promise<POSLocationInfo> {
    try {
      const response = await this.makeRequest<{ location: SquareLocation }>(
        `/locations/${locationId}`
      );

      const location = response.location;
      return {
        id: location.id,
        name: location.name,
        address: location.address
          ? `${location.address.address_line_1 || ''}, ${location.address.locality || ''}, ${location.address.administrative_district_level_1 || ''}`
          : undefined,
        timezone: location.timezone,
        status: location.status === 'ACTIVE' ? 'active' : 'inactive',
      };
    } catch (error) {
      console.error('Failed to fetch Square location:', error);
      throw new Error('Failed to fetch location information');
    }
  }

  /**
   * Fetch menu from Square Catalog API
   */
  async fetchMenu(): Promise<POSProduct[]> {
    try {
      // Fetch catalog items
      const response = await this.makeRequest<{
        objects?: SquareCatalogObject[];
        cursor?: string;
      }>('/catalog/list?types=ITEM,MODIFIER_LIST,MODIFIER,CATEGORY');

      if (!response.objects) {
        return [];
      }

      // Build lookup maps for related objects
      const modifierLists = new Map<string, SquareCatalogObject>();
      const modifiers = new Map<string, SquareCatalogObject>();
      const categories = new Map<string, SquareCatalogObject>();

      response.objects.forEach(obj => {
        if (obj.type === 'MODIFIER_LIST') {
          modifierLists.set(obj.id, obj);
        } else if (obj.type === 'MODIFIER') {
          modifiers.set(obj.id, obj);
        } else if (obj.type === 'CATEGORY') {
          categories.set(obj.id, obj);
        }
      });

      // Convert Square items to POSProduct
      const products = response.objects
        .filter(obj => obj.type === 'ITEM' && obj.item_data)
        .map(item => this.convertSquareItemToProduct(
          item,
          modifierLists,
          modifiers,
          categories
        ));

      return products;
    } catch (error) {
      console.error('Failed to fetch Square menu:', error);
      throw new Error('Failed to fetch menu from Square');
    }
  }

  /**
   * Convert Square catalog item to POSProduct
   */
  private convertSquareItemToProduct(
    item: SquareCatalogObject,
    modifierLists: Map<string, SquareCatalogObject>,
    modifiers: Map<string, SquareCatalogObject>,
    categories: Map<string, SquareCatalogObject>
  ): POSProduct {
    const itemData = item.item_data!;
    
    // Get category name
    const categoryName = itemData.category_id
      ? categories.get(itemData.category_id)?.category_data?.name
      : undefined;

    // Convert variations
    const variations: POSProductVariation[] = (itemData.variations || []).map(v => ({
      id: v.id,
      name: v.item_variation_data.name,
      price: this.convertSquareMoney(v.item_variation_data.price_money?.amount || 0),
      available: true, // Square doesn't provide availability at variation level by default
    }));

    // Get base price from first variation
    const basePrice = variations.length > 0 ? variations[0].price : 0;

    // Convert modifier lists
    const modifierListsData: POSModifierList[] = (itemData.modifier_list_info || [])
      .filter(info => info.enabled !== false)
      .map(info => {
        const modListObj = modifierLists.get(info.modifier_list_id);
        if (!modListObj?.modifier_list_data) return null;

        const modListData = modListObj.modifier_list_data;
        const mods: POSModifier[] = (modListData.modifiers || [])
          .map(mod => {
            const modObj = modifiers.get(mod.id);
            if (!modObj?.modifier_data) return null;

            return {
              id: mod.id,
              name: modObj.modifier_data.name,
              price: this.convertSquareMoney(modObj.modifier_data.price_money?.amount || 0),
              available: true,
            };
          })
          .filter((m): m is POSModifier => m !== null);

        const result: POSModifierList = {
          id: info.modifier_list_id,
          name: modListData.name,
          modifiers: mods,
          selectionType: modListData.selection_type === 'SINGLE' ? 'single' : 'multiple',
        };

        if (info.min_selected_modifiers !== undefined) {
          result.minSelections = info.min_selected_modifiers;
        }
        if (info.max_selected_modifiers !== undefined) {
          result.maxSelections = info.max_selected_modifiers;
        }

        return result;
      })
      .filter((ml): ml is POSModifierList => ml !== null);

    return {
      id: item.id,
      name: itemData.name,
      description: itemData.description,
      category: categoryName,
      basePrice,
      available: true,
      variations: variations.length > 0 ? variations : undefined,
      modifiers: modifierListsData.length > 0 ? modifierListsData : undefined,
    };
  }

  /**
   * Convert Square money amount (in cents) to dollars
   */
  private convertSquareMoney(amount: number): number {
    return amount / 100;
  }

  /**
   * Submit order to Square Orders API
   */
  async submitOrder(order: POSOrder): Promise<POSOrderResult> {
    try {
      // Build Square order format
      const squareOrder = {
        idempotency_key: order.externalId || this.generateIdempotencyKey(),
        order: {
          location_id: order.locationId || this.config.locationId,
          line_items: order.lineItems.map(item => ({
            catalog_object_id: item.catalogItemId,
            quantity: item.quantity.toString(),
            variation_name: item.variationId,
            modifiers: item.modifiers?.map(mod => ({
              catalog_object_id: mod.catalogItemId,
              quantity: mod.quantity?.toString() || '1',
            })),
            note: item.note,
          })),
          state: 'OPEN',
        },
      };

      const response = await this.makeRequest<{
        order: { id: string };
      }>('/orders', 'POST', squareOrder);

      return {
        success: true,
        orderId: response.order.id,
      };
    } catch (error) {
      console.error('Failed to submit order to Square:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate idempotency key for Square API
   */
  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
