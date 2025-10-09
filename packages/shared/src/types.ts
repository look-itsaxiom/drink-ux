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
 * Visual Drink Builder - Component-based model
 */
export enum ComponentType {
  CUP = 'cup',
  BASE = 'base',
  MODIFIER = 'modifier',
}

export enum CupSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export enum CupType {
  PAPER = 'paper',
  CERAMIC = 'ceramic',
  GLASS = 'glass',
}

export enum LidType {
  NONE = 'none',
  FLAT = 'flat',
  DOME = 'dome',
}

export interface VisualProperties {
  color: string;
  opacity?: number;
  layerOrder: number;
}

export interface DrinkComponent {
  id: string;
  name: string;
  type: ComponentType;
  category: string;
  price: number;
  visual: VisualProperties;
  available: boolean;
}

export interface CupComponent extends DrinkComponent {
  type: ComponentType.CUP;
  size: CupSize;
  cupType: CupType;
  lidType: LidType;
}

export interface BaseComponent extends DrinkComponent {
  type: ComponentType.BASE;
  isHot: boolean;
}

export interface ModifierComponent extends DrinkComponent {
  type: ComponentType.MODIFIER;
  canTransformDrink: boolean;
}

export interface IntentClarification {
  componentId: string;
  prompt: string;
  options: IntentOption[];
}

export interface IntentOption {
  id: string;
  label: string;
  resultingComponents: string[];
}

export interface DrinkBuilderState {
  cup?: CupComponent;
  isHot?: boolean; // true for hot, false for iced
  base?: BaseComponent;
  modifiers: ModifierComponent[];
  totalPrice: number;
  clarificationNeeded?: IntentClarification;
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
