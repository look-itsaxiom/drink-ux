/**
 * POS Provider types
 */
export enum POSProvider {
  SQUARE = 'square',
  TOAST = 'toast',
  CLOVER = 'clover',
}

/**
 * Drink customization types
 */
export interface DrinkCustomization {
  id: string;
  name: string;
  category: CustomizationCategory;
  options: CustomizationOption[];
  required: boolean;
}

export enum CustomizationCategory {
  SIZE = 'size',
  MILK = 'milk',
  FLAVOR = 'flavor',
  SWEETENER = 'sweetener',
  TOPPING = 'topping',
  TEMPERATURE = 'temperature',
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

/**
 * Drink types
 */
export interface Drink {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: DrinkCategory;
  imageUrl?: string;
  customizations: DrinkCustomization[];
}

export enum DrinkCategory {
  COFFEE = 'coffee',
  ESPRESSO = 'espresso',
  TEA = 'tea',
  SPECIALTY = 'specialty',
  COLD_BREW = 'cold_brew',
  BLENDED = 'blended',
}

/**
 * Order types
 */
export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  drinkId: string;
  drinkName: string;
  quantity: number;
  customizations: SelectedCustomization[];
  itemTotal: number;
}

export interface SelectedCustomization {
  customizationId: string;
  optionId: string;
  optionName: string;
  price: number;
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * POS Integration types
 */
export interface POSIntegration {
  id: string;
  businessId: string;
  provider: POSProvider;
  credentials: POSCredentials;
  config: POSConfig;
  isActive: boolean;
}

export interface POSCredentials {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  merchantId?: string;
}

export interface POSConfig {
  locationId?: string;
  syncInterval?: number; // in minutes
  autoSyncMenu?: boolean;
  webhookUrl?: string;
}

/**
 * Business types
 */
export interface Business {
  id: string;
  name: string;
  logo?: string;
  theme?: BusinessTheme;
  posIntegration?: POSIntegration;
}

export interface BusinessTheme {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  backgroundUrl?: string;
}

/**
 * API Response types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
