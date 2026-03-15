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

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  color?: string;
  icon?: string;
}

export interface Variation {
  id: string;
  baseId: string;
  name: string;         // e.g., "Small", "Medium", "Large", "12oz", "Single"
  priceCents: number;   // Price in cents
  displayOrder: number;
  available: boolean;
}

export interface Base {
  id: string;
  categoryId: string;
  name: string;
  priceCents: number;   // Base price in cents
  available: boolean;
  imageUrl?: string;
  variations: Variation[];
  visualColor?: string;
  visualOpacity?: number;
}

// =============================================================================
// CATALOG - MODIFIER GROUPS & MODIFIERS
// =============================================================================

export interface ModifierGroup {
  id: string;
  name: string;         // e.g., "Milk Options", "Syrups", "Toppings"
  displayOrder: number;
  selectionMode: string; // "single" or "multiple"
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  modifierGroupId: string;
  name: string;
  priceCents: number;   // Price in cents
  available: boolean;
  visualColor?: string;
  visualLayerOrder?: number;
  visualAnimationType?: string;
}

// =============================================================================
// CATALOG - PRESETS (Named Drinks)
// =============================================================================

export interface Preset {
  id: string;
  name: string;
  baseId: string;
  defaultVariationId?: string;
  defaultHot: boolean;
  priceCents: number;    // Price in cents
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
  priceCents: number;
  visual: VisualProperties;
  available: boolean;
}

export interface CupComponent extends DrinkComponent {
  type: ComponentType.CUP;
  size: string; // Variation name
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
  category?: string;

  // Step 2: Type selection (base)
  drinkType?: DrinkType;

  // Step 3: Modifications
  selectedVariation?: Variation;
  isHot?: boolean;
  selectedModifiers: ModifierComponent[]; // All selected modifiers (from any group)

  totalPriceCents: number;
}

// Legacy DrinkType interface (used in mobile UI)
export interface DrinkType {
  id: string;
  name: string;
  category: string;
  description?: string;
  priceCents: number;
  isHot?: boolean; // undefined means both hot/iced available
  imageUrl?: string;
  variations?: Variation[];
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
  unitPriceCents: number;
  totalPriceCents: number;
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
  priceCents: number;
  available: boolean;
}

export interface SelectedCustomization {
  customizationId: string;
  optionId: string;
  optionName: string;
  priceCents: number;
}

// Legacy Drink interface
export interface Drink {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
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
