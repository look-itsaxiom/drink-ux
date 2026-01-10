/**
 * Drink-UX Shared Types
 * Used across mobile, admin, and API packages
 */

// =============================================================================
// BUSINESS & ACCOUNT
// =============================================================================

export enum AccountState {
  ONBOARDING = "onboarding",
  SETUP_COMPLETE = "setup_complete",
  ACTIVE = "active",
  PAUSED = "paused",
  EJECTED = "ejected",
}

export enum POSProvider {
  SQUARE = "square",
  TOAST = "toast",
  CLOVER = "clover",
}

export interface BusinessTheme {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  accountState: AccountState;
  theme?: BusinessTheme;
  posProvider?: POSProvider;
}

export interface BusinessConfig {
  business: Business;
  theme: BusinessTheme;
}

// =============================================================================
// CATALOG - CATEGORIES & BASES
// =============================================================================

export enum DrinkCategory {
  COFFEE = "coffee",
  TEA = "tea",
  ITALIAN_SODA = "italian_soda",
  JUICE = "juice",
  BLENDED = "blended",
  SPECIALTY = "specialty",
}

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  color?: string;
  icon?: string;
}

export enum TemperatureConstraint {
  HOT_ONLY = "hot_only",
  ICED_ONLY = "iced_only",
  BOTH = "both",
}

export interface Base {
  id: string;
  categoryId: string;
  name: string;
  basePrice: number;
  temperatureConstraint: TemperatureConstraint;
  available: boolean;
  visualColor?: string;
  visualOpacity?: number;
}

// =============================================================================
// CATALOG - MODIFIERS
// =============================================================================

export enum ModifierType {
  MILK = "milk",
  SYRUP = "syrup",
  TOPPING = "topping",
}

export interface Modifier {
  id: string;
  type: ModifierType;
  name: string;
  price: number;
  available: boolean;
  visualColor?: string;
  visualLayerOrder?: number;
  visualAnimationType?: string;
}

// =============================================================================
// CATALOG - PRESETS (Named Drinks)
// =============================================================================

export enum CupSize {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
}

export interface Preset {
  id: string;
  name: string;
  baseId: string;
  defaultSize: CupSize;
  defaultHot: boolean;
  price: number;
  available: boolean;
  imageUrl?: string;
  modifierIds: string[];
}

// =============================================================================
// VISUAL DRINK BUILDER
// =============================================================================

export enum ComponentType {
  CUP = "cup",
  BASE = "base",
  MODIFIER = "modifier",
}

export enum CupType {
  PAPER = "paper",
  CERAMIC = "ceramic",
  GLASS = "glass",
}

export enum LidType {
  NONE = "none",
  FLAT = "flat",
  DOME = "dome",
}

export interface VisualProperties {
  color: string;
  opacity?: number;
  layerOrder: number;
  animationType?: string;
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

export interface DrinkBuilderState {
  // Step 1: Category selection
  category?: DrinkCategory;

  // Step 2: Type selection (base)
  drinkType?: DrinkType;

  // Step 3: Modifications
  cupSize?: CupSize;
  isHot?: boolean;
  milk?: ModifierComponent;
  syrups: ModifierComponent[];
  toppings: ModifierComponent[];

  totalPrice: number;
}

// Legacy DrinkType interface (used in mobile UI)
export interface DrinkType {
  id: string;
  name: string;
  category: DrinkCategory;
  description?: string;
  basePrice: number;
  isHot?: boolean; // undefined means both hot/iced available
  imageUrl?: string;
}

// =============================================================================
// ORDERS
// =============================================================================

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PREPARING = "preparing",
  READY = "ready",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  FAILED = "failed",
}

export interface Order {
  id: string;
  businessId: string;
  posOrderId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// =============================================================================
// CUSTOMIZATION (Legacy - used in mobile UI)
// =============================================================================

export enum CustomizationCategory {
  SIZE = "size",
  MILK = "milk",
  FLAVOR = "flavor",
  SWEETENER = "sweetener",
  TOPPING = "topping",
  TEMPERATURE = "temperature",
}

export interface DrinkCustomization {
  id: string;
  name: string;
  category: CustomizationCategory;
  options: CustomizationOption[];
  required: boolean;
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface SelectedCustomization {
  customizationId: string;
  optionId: string;
  optionName: string;
  price: number;
}

// Legacy Drink interface
export interface Drink {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: DrinkCategory;
  imageUrl?: string;
  customizations: DrinkCustomization[];
}

// =============================================================================
// INTENT CLARIFICATION
// =============================================================================

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

// =============================================================================
// API RESPONSE
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
