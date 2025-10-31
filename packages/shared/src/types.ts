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
  SIZE = "size",
  MILK = "milk",
  FLAVOR = "flavor",
  SWEETENER = "sweetener",
  TOPPING = "topping",
  TEMPERATURE = "temperature",
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
  CUP = "cup",
  BASE = "base",
  MODIFIER = "modifier",
}

export enum CupSize {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
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
  // Step 1: Category selection
  category?: DrinkCategory;

  // Step 2: Type selection
  drinkType?: DrinkType;

  // Step 3: Modifications
  cupSize?: CupSize;
  isHot?: boolean; // for drinks that support both
  milk?: ModifierComponent;
  syrups: ModifierComponent[];
  toppings: ModifierComponent[];

  totalPrice: number;
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
  COFFEE = "coffee",
  TEA = "tea",
  ITALIAN_SODA = "italian_soda",
  JUICE = "juice",
  BLENDED = "blended",
  SPECIALTY = "specialty",
}

export interface DrinkType {
  id: string;
  name: string;
  category: DrinkCategory;
  description?: string;
  basePrice: number;
  isHot?: boolean; // undefined means both hot/iced available
  imageUrl?: string;
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
  DRAFT = "draft",
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
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
