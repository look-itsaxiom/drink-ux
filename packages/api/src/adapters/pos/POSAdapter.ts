import { OrderStatus } from '../../../generated/prisma';

/**
 * Credentials needed to authenticate with a POS system
 */
export interface POSCredentials {
  accessToken: string;
  refreshToken: string;
  merchantId: string;
  locationId?: string;
  expiresAt: Date;
}

/**
 * Result from OAuth token exchange or refresh
 */
export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  merchantId: string;
}

/**
 * Raw catalog data as returned from a POS system
 */
export interface RawCatalogData {
  items: RawPOSItem[];
  modifiers: RawPOSModifier[];
  categories: RawPOSCategory[];
  images: RawPOSImage[];
  taxes: RawPOSTax[];
  modifierLists: RawPOSModifierList[];
}

export interface RawPOSItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  categoryId?: string;
  categoryIds?: string[];
  variations?: RawPOSVariation[];
  modifierListIds?: string[];
  modifierListInfo?: RawPOSModifierListInfo[];
  imageIds?: string[];
  taxIds?: string[];
  isDeleted?: boolean;
  presentAtLocationIds?: string[];
  needsReview?: boolean;
}

export interface RawPOSVariation {
  id: string;
  name: string;
  price: number;
}

export interface RawPOSModifier {
  id: string;
  name: string;
  price?: number;
  modifierListId?: string;
  modifierListName?: string;
}

export interface RawPOSModifierList {
  id: string;
  name: string;
  modifiers: RawPOSModifier[];
}

export interface RawPOSModifierListInfo {
  modifierListId: string;
  minSelectedModifiers?: number;
  maxSelectedModifiers?: number;
}

export interface RawPOSCategory {
  id: string;
  name: string;
  ordinal?: number;
}

export interface RawPOSImage {
  id: string;
  url: string;
  name?: string;
}

export interface RawPOSTax {
  id: string;
  name: string;
  percentage?: string;
  enabled?: boolean;
}

/**
 * Location data from a POS system
 */
export interface POSLocation {
  id: string;
  name: string;
}

/**
 * Catalog item to push to POS
 */
export interface CatalogItem {
  name: string;
  description?: string;
  price: number;
  categoryId?: string;
  variations?: Array<{
    name: string;
    price: number;
  }>;
}

/**
 * Catalog modifier to push to POS
 */
export interface CatalogModifier {
  name: string;
  price: number;
  modifierListName?: string;
}

/**
 * Order to submit to POS
 */
export interface OrderSubmission {
  items: Array<{
    posItemId: string;
    quantity: number;
    modifierIds?: string[];
    variationId?: string;
  }>;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * POS Adapter interface - abstracts POS provider operations
 */
export interface POSAdapter {
  /**
   * Set credentials for authenticated API calls
   */
  setCredentials(credentials: POSCredentials): void;

  // OAuth methods
  getAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<TokenResult>;
  refreshTokens(refreshToken: string): Promise<TokenResult>;

  // Catalog read
  importCatalog(): Promise<RawCatalogData>;

  /**
   * Get available locations for the authenticated merchant
   */
  getLocations(): Promise<POSLocation[]>;

  // Catalog write
  pushItem(item: CatalogItem): Promise<string>;
  pushModifier(modifier: CatalogModifier): Promise<string>;
  updateItem(posItemId: string, item: CatalogItem): Promise<void>;

  // Orders (stubbed - implemented in drink-ux-frd)
  createOrder(order: OrderSubmission): Promise<string>;
  getOrderStatus(posOrderId: string): Promise<OrderStatus>;

  // Payment (stubbed - implemented in drink-ux-bd1)
  getPaymentLink(orderId: string): Promise<string>;
}
