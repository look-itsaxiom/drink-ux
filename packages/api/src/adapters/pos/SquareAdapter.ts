import { OrderStatus } from '../../../generated/prisma';
import {
  POSAdapter,
  POSCredentials,
  POSLocation,
  TokenResult,
  RawCatalogData,
  CatalogItem,
  CatalogModifier,
  OrderSubmission,
} from './POSAdapter';

/**
 * Square OAuth token response
 */
interface SquareTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  merchant_id: string;
  token_type: string;
}

/**
 * Square error response
 */
interface SquareErrorResponse {
  error: string;
  error_description: string;
}

/**
 * Square API error response (v2 format)
 */
interface SquareApiErrorResponse {
  errors: Array<{
    code: string;
    detail: string;
    category?: string;
  }>;
}

/**
 * Square catalog object types
 */
interface SquareCatalogObject {
  type: string;
  id: string;
  category_data?: {
    name: string;
    ordinal?: number;
  };
  item_data?: {
    name: string;
    description?: string;
    category_id?: string;
    variations?: Array<{
      id: string;
      item_variation_data: {
        name: string;
        price_money?: {
          amount: number;
          currency: string;
        };
      };
    }>;
    modifier_list_info?: Array<{
      modifier_list_id: string;
    }>;
  };
  modifier_list_data?: {
    name: string;
    modifiers?: Array<{
      id: string;
      modifier_data: {
        name: string;
        price_money?: {
          amount: number;
          currency: string;
        };
      };
    }>;
  };
}

interface SquareCatalogListResponse {
  objects?: SquareCatalogObject[];
  cursor?: string;
}

interface SquareCatalogObjectResponse {
  catalog_object?: {
    id: string;
  };
  id?: string;
}

interface SquareCatalogGetResponse {
  object?: {
    id: string;
    version?: number;
  };
}

const SQUARE_API_VERSION = '2024-01-18';

/**
 * Square POS Adapter
 * Implements POSAdapter interface for Square API integration
 */
export class SquareAdapter implements POSAdapter {
  private credentials: POSCredentials | null = null;
  private appId: string;
  private appSecret: string;
  private environment: 'sandbox' | 'production';
  private callbackUrl: string;

  constructor() {
    // Support both naming conventions for backwards compatibility
    this.appId = process.env.SQUARE_APPLICATION_ID || process.env.SQUARE_APP_ID || '';
    this.appSecret = process.env.SQUARE_APPLICATION_SECRET || process.env.SQUARE_APP_SECRET || '';
    this.environment = (process.env.SQUARE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
    this.callbackUrl = process.env.SQUARE_OAUTH_CALLBACK_URL || process.env.POS_OAUTH_CALLBACK_URL || 'http://localhost:3005/api/pos/oauth/callback';
  }

  private getBaseUrl(): string {
    return this.environment === 'sandbox'
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';
  }

  setCredentials(credentials: POSCredentials): void {
    this.credentials = credentials;
  }

  getAuthorizationUrl(state: string): string {
    const scopes = [
      'MERCHANT_PROFILE_READ',
      'ITEMS_READ',
      'ITEMS_WRITE',
      'ORDERS_READ',
      'ORDERS_WRITE',
      'PAYMENTS_READ',
      'PAYMENTS_WRITE',
    ];

    const params = new URLSearchParams({
      client_id: this.appId,
      session: 'false',
      state: state,
    });

    // Add redirect_uri if configured
    if (this.callbackUrl) {
      params.append('redirect_uri', this.callbackUrl);
    }

    // Build scope manually - Square expects space-separated scopes, not URL-encoded plus signs
    const scopeParam = scopes.join(' ');

    return `${this.getBaseUrl()}/oauth2/authorize?${params.toString()}&scope=${encodeURIComponent(scopeParam)}`;
  }

  /**
   * Check if the adapter is properly configured for OAuth
   */
  isOAuthConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResult> {
    const requestBody: Record<string, string> = {
      client_id: this.appId,
      client_secret: this.appSecret,
      code: code,
      grant_type: 'authorization_code',
    };

    // Include redirect_uri if configured (Square may require it)
    if (this.callbackUrl) {
      requestBody.redirect_uri = this.callbackUrl;
    }

    const response = await fetch(`${this.getBaseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as SquareErrorResponse;
      console.error('Square token exchange error:', JSON.stringify(data, null, 2));
      throw new Error(errorData.error_description || errorData.error || 'OAuth token exchange failed');
    }

    const tokenData = data as SquareTokenResponse;

    if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.merchant_id) {
      throw new Error('Invalid token response from Square');
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      merchantId: tokenData.merchant_id,
      expiresAt: new Date(tokenData.expires_at),
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResult> {
    const response = await fetch(`${this.getBaseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.appId,
        client_secret: this.appSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as SquareErrorResponse;
      throw new Error(errorData.error_description || errorData.error || 'Token refresh failed');
    }

    const tokenData = data as SquareTokenResponse;

    if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.merchant_id) {
      throw new Error('Invalid token response from Square');
    }

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      merchantId: tokenData.merchant_id,
      expiresAt: new Date(tokenData.expires_at),
    };
  }

  async importCatalog(): Promise<RawCatalogData> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const result: RawCatalogData = {
      items: [],
      modifiers: [],
      categories: [],
    };

    let cursor: string | undefined;

    do {
      const url = cursor
        ? `${this.getBaseUrl()}/v2/catalog/list?cursor=${cursor}`
        : `${this.getBaseUrl()}/v2/catalog/list`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': SQUARE_API_VERSION,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as SquareApiErrorResponse;
        const errorMessage = errorData.errors?.[0]?.detail || 'Failed to import catalog';
        throw new Error(errorMessage);
      }

      const catalogData = data as SquareCatalogListResponse;
      const objects = catalogData.objects || [];

      for (const obj of objects) {
        switch (obj.type) {
          case 'CATEGORY':
            if (obj.category_data) {
              result.categories.push({
                id: obj.id,
                name: obj.category_data.name,
                ordinal: obj.category_data.ordinal,
              });
            }
            break;

          case 'ITEM':
            if (obj.item_data) {
              result.items.push({
                id: obj.id,
                name: obj.item_data.name,
                description: obj.item_data.description,
                categoryId: obj.item_data.category_id,
                variations: (obj.item_data.variations || []).map(v => ({
                  id: v.id,
                  name: v.item_variation_data.name,
                  price: v.item_variation_data.price_money?.amount || 0,
                })),
                modifierListIds: obj.item_data.modifier_list_info?.map(m => m.modifier_list_id),
              });
            }
            break;

          case 'MODIFIER_LIST':
            if (obj.modifier_list_data?.modifiers) {
              for (const mod of obj.modifier_list_data.modifiers) {
                result.modifiers.push({
                  id: mod.id,
                  name: mod.modifier_data.name,
                  price: mod.modifier_data.price_money?.amount || 0,
                  modifierListId: obj.id,
                });
              }
            }
            break;
        }
      }

      cursor = catalogData.cursor;
    } while (cursor);

    return result;
  }

  async getLocations(): Promise<POSLocation[]> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.getBaseUrl()}/v2/locations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION,
      },
    });

    const data = await response.json() as { locations?: Array<{ id: string; name: string }>; errors?: Array<{ detail: string }> };

    if (!response.ok) {
      const errorMessage = data.errors?.[0]?.detail || 'Failed to fetch locations';
      throw new Error(errorMessage);
    }

    return (data.locations || []).map(loc => ({
      id: loc.id,
      name: loc.name,
    }));
  }

  async pushItem(item: CatalogItem): Promise<string> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const variations = item.variations && item.variations.length > 0
      ? item.variations.map((v, index) => ({
          type: 'ITEM_VARIATION',
          id: `#variation_${index}`,
          item_variation_data: {
            name: v.name,
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: v.price,
              currency: 'USD',
            },
          },
        }))
      : [{
          type: 'ITEM_VARIATION',
          id: '#default_variation',
          item_variation_data: {
            name: 'Regular',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: item.price,
              currency: 'USD',
            },
          },
        }];

    const requestBody = {
      idempotency_key: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      object: {
        type: 'ITEM',
        id: '#new_item',
        item_data: {
          name: item.name,
          description: item.description,
          category_id: item.categoryId,
          variations,
        },
      },
    };

    const response = await fetch(`${this.getBaseUrl()}/v2/catalog/object`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as SquareCatalogObjectResponse | SquareApiErrorResponse;

    if (!response.ok) {
      const errorData = data as SquareApiErrorResponse;
      const errorMessage = errorData.errors?.[0]?.detail || 'Failed to create item';
      throw new Error(errorMessage);
    }

    const successData = data as SquareCatalogObjectResponse;
    return successData.catalog_object?.id || successData.id || '';
  }

  async pushModifier(modifier: CatalogModifier): Promise<string> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    const requestBody = {
      idempotency_key: `modifier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      object: {
        type: 'MODIFIER_LIST',
        id: '#new_modifier_list',
        modifier_list_data: {
          name: modifier.modifierListName || modifier.name,
          modifiers: [{
            type: 'MODIFIER',
            id: '#new_modifier',
            modifier_data: {
              name: modifier.name,
              price_money: {
                amount: modifier.price,
                currency: 'USD',
              },
            },
          }],
        },
      },
    };

    const response = await fetch(`${this.getBaseUrl()}/v2/catalog/object`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as SquareCatalogObjectResponse | SquareApiErrorResponse;

    if (!response.ok) {
      const errorData = data as SquareApiErrorResponse;
      const errorMessage = errorData.errors?.[0]?.detail || 'Failed to create modifier';
      throw new Error(errorMessage);
    }

    const successData = data as SquareCatalogObjectResponse;
    return successData.catalog_object?.id || successData.id || '';
  }

  async updateItem(posItemId: string, item: CatalogItem): Promise<void> {
    if (!this.credentials) {
      throw new Error('Not authenticated');
    }

    // First, fetch the current version of the item
    const getResponse = await fetch(`${this.getBaseUrl()}/v2/catalog/object/${posItemId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION,
      },
    });

    const getData = await getResponse.json() as SquareCatalogGetResponse | SquareApiErrorResponse;

    if (!getResponse.ok) {
      const errorData = getData as SquareApiErrorResponse;
      const errorMessage = errorData.errors?.[0]?.detail || 'Failed to fetch item';
      throw new Error(errorMessage);
    }

    const getSuccessData = getData as SquareCatalogGetResponse;
    const currentVersion = getSuccessData.object?.version;

    // Now update with the version
    const variations = item.variations && item.variations.length > 0
      ? item.variations.map((v, index) => ({
          type: 'ITEM_VARIATION',
          id: `#variation_${index}`,
          item_variation_data: {
            name: v.name,
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: v.price,
              currency: 'USD',
            },
          },
        }))
      : [{
          type: 'ITEM_VARIATION',
          id: '#default_variation',
          item_variation_data: {
            name: 'Regular',
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: item.price,
              currency: 'USD',
            },
          },
        }];

    const requestBody = {
      idempotency_key: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      object: {
        type: 'ITEM',
        id: posItemId,
        version: currentVersion,
        item_data: {
          name: item.name,
          description: item.description,
          category_id: item.categoryId,
          variations,
        },
      },
    };

    const response = await fetch(`${this.getBaseUrl()}/v2/catalog/object`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as SquareApiErrorResponse;
      const errorMessage = errorData.errors?.[0]?.detail || 'Failed to update item';
      throw new Error(errorMessage);
    }
  }

  async createOrder(order: OrderSubmission): Promise<string> {
    if (!this.credentials) {
      throw new Error('Square credentials not set');
    }

    // Get location ID from credentials or fetch first available location
    let locationId = this.credentials.locationId;
    if (!locationId) {
      // Fetch first location if not set
      const locationsResponse = await fetch(`${this.getBaseUrl()}/v2/locations`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Square-Version': SQUARE_API_VERSION,
        },
      });

      const locationsData = await locationsResponse.json() as { locations?: Array<{ id: string }> };
      if (!locationsResponse.ok) {
        throw new Error('Failed to fetch locations');
      }

      locationId = locationsData.locations?.[0]?.id;
      if (!locationId) {
        throw new Error('No locations found for this merchant');
      }
    }

    // Build line items for Square order
    const lineItems = order.items.map((item) => {
      const lineItem: Record<string, unknown> = {
        quantity: item.quantity.toString(),
      };

      // If we have a catalog item ID, use it
      if (item.posItemId) {
        lineItem.catalog_object_id = item.posItemId;

        // Add variation ID if available
        if (item.variationId) {
          lineItem.catalog_object_id = item.variationId;
        }

        // Add modifiers if available
        if (item.modifierIds && item.modifierIds.length > 0) {
          lineItem.modifiers = item.modifierIds.map((modId) => ({
            catalog_object_id: modId,
          }));
        }
      } else {
        // Create ad-hoc line item if no catalog ID
        lineItem.name = 'Custom Drink';
        lineItem.base_price_money = {
          amount: 0,
          currency: 'USD',
        };
      }

      return lineItem;
    });

    // Build the order request
    const orderRequest: Record<string, unknown> = {
      order: {
        location_id: locationId,
        line_items: lineItems,
        fulfillments: [
          {
            type: 'PICKUP',
            state: 'PROPOSED',
            pickup_details: {
              recipient: {
                display_name: order.customerName,
                email_address: order.customerEmail,
                phone_number: order.customerPhone,
              },
              schedule_type: 'ASAP',
              note: 'Mobile order',
            },
          },
        ],
      },
      idempotency_key: `order-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    };

    // Submit order to Square
    const response = await fetch(`${this.getBaseUrl()}/v2/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION,
      },
      body: JSON.stringify(orderRequest),
    });

    interface SquareOrderResponse {
      order?: {
        id?: string;
        state?: string;
        fulfillments?: Array<{ state?: string }>;
      };
    }

    const data = await response.json() as SquareOrderResponse | SquareApiErrorResponse;

    if (!response.ok) {
      const errorData = data as SquareApiErrorResponse;
      const errorMessage = errorData.errors?.[0]?.detail || 'Failed to create order in Square';
      console.error('Square order creation failed:', errorData);
      throw new Error(errorMessage);
    }

    const orderData = data as SquareOrderResponse;

    // Return the Square order ID
    const orderId = orderData.order?.id;
    if (!orderId) {
      throw new Error('No order ID returned from Square');
    }

    return orderId;
  }

  async getOrderStatus(posOrderId: string): Promise<OrderStatus> {
    if (!this.credentials) {
      throw new Error('Square credentials not set');
    }

    interface SquareOrderResponse {
      order?: {
        state?: string;
        fulfillments?: Array<{ state?: string }>;
      };
    }

    const response = await fetch(`${this.getBaseUrl()}/v2/orders/${posOrderId}`, {
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Square-Version': SQUARE_API_VERSION,
      },
    });

    const data = await response.json() as SquareOrderResponse | SquareApiErrorResponse;

    if (!response.ok) {
      const errorData = data as SquareApiErrorResponse;
      throw new Error(errorData.errors?.[0]?.detail || 'Failed to get order status');
    }

    const orderData = data as SquareOrderResponse;

    // Map Square order state to our OrderStatus
    const squareState = orderData.order?.state;
    const fulfillmentState = orderData.order?.fulfillments?.[0]?.state;

    switch (squareState) {
      case 'OPEN':
        switch (fulfillmentState) {
          case 'PROPOSED':
            return 'PENDING';
          case 'RESERVED':
          case 'PREPARED':
            return 'PREPARING';
          case 'COMPLETED':
            return 'READY';
          default:
            return 'CONFIRMED';
        }
      case 'COMPLETED':
        return 'COMPLETED';
      case 'CANCELED':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  async getPaymentLink(orderId: string): Promise<string> {
    // Stubbed - will be implemented in drink-ux-bd1 (Payment Integration)
    throw new Error('Not yet implemented - see drink-ux-bd1');
  }
}
