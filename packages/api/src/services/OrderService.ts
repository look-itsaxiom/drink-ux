import { PrismaClient, OrderStatus, Order, OrderItem, Business, AccountState } from '../../generated/prisma';
import { POSAdapter, OrderSubmission } from '../adapters/pos/POSAdapter';

/**
 * Custom error class for order errors
 */
export class OrderError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

/**
 * Input for creating an order
 */
export interface CreateOrderInput {
  businessId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: OrderItemInput[];
  notes?: string;
}

/**
 * Input for a single order item.
 *
 * Supports two flows:
 * - **Legacy**: `baseId` is a Drink-UX Base model ID, modifiers are Modifier model IDs.
 *   Prices are looked up from the database (in cents).
 * - **Mapped (new)**: `baseId` is a Square item ID that exists in ItemMapping.
 *   `modifiers` are Square modifier IDs. `unitPriceCents` and `itemName` should be
 *   provided since prices come from the live Square catalog.
 */
export interface OrderItemInput {
  baseId: string;
  quantity: number;
  size: string;           // Variation name (e.g., "Small", "12oz", "Regular")
  temperature: string;    // Free-form (e.g., "HOT", "ICED", or empty)
  modifiers: string[];
  notes?: string;
  /** Client-provided unit price in cents (mapped flow). Includes base + size + modifiers. */
  unitPriceCents?: number;
  /** Client-provided item name (mapped flow). */
  itemName?: string;
  /** Client-provided modifier details (mapped flow). */
  modifierDetails?: Array<{ id: string; name: string; priceCents: number }>;
}

/**
 * Modifier info stored with order item
 */
export interface ModifierInfo {
  id: string;
  name: string;
  priceCents: number;
}

/**
 * Order item result
 */
export interface OrderItemResult {
  id: string;
  name: string;
  quantity: number;
  size: string;
  temperature: string;
  unitPriceCents: number;
  totalPriceCents: number;
  modifiers: ModifierInfo[];
  notes?: string;
}

/**
 * Order result returned from service methods
 */
export interface OrderResult {
  id: string;
  orderNumber: string;
  pickupCode: string;
  status: OrderStatus;
  estimatedReadyAt?: Date;
  items: OrderItemResult[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  posOrderId?: string;
  cancelReason?: string;
  cancelledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

/**
 * Options for listing business orders
 */
export interface GetBusinessOrdersOptions {
  status?: OrderStatus[];
  limit?: number;
  offset?: number;
}

/**
 * Calculated item data for internal processing
 */
interface CalculatedItem {
  baseId: string;
  quantity: number;
  size: string;
  temperature: string;
  notes?: string;
  name: string;
  unitPriceCents: number;
  totalPriceCents: number;
  modifiers: ModifierInfo[];
  /** When true, baseId is a Square item ID (no translation needed for POS). */
  isMapped?: boolean;
}

// Default tax rate (8.25%)
const DEFAULT_TAX_RATE = 0.0825;

// Characters to use for pickup code (excluding confusing chars: 0, O, 1, I)
const PICKUP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PICKUP_CODE_LENGTH = 4;

/**
 * Order Service - handles order creation, retrieval, and status management.
 *
 * All prices are stored and processed in integer cents.
 * Supports both the legacy Base/Modifier model flow and the new mapping-layer
 * flow where the mobile app submits Square IDs directly.
 */
export class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly posAdapter: POSAdapter
  ) {}

  /**
   * Create a new order
   */
  async createOrder(input: CreateOrderInput): Promise<OrderResult> {
    const { businessId, customerName, customerPhone, customerEmail, items, notes } = input;

    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new OrderError('INVALID_BUSINESS', 'Business not found');
    }

    // Check if business can accept orders (must be ACTIVE or TRIAL)
    const orderAllowedStates: AccountState[] = ['ACTIVE', 'TRIAL'];
    if (!orderAllowedStates.includes(business.accountState)) {
      throw new OrderError(
        'BUSINESS_NOT_ACCEPTING_ORDERS',
        'This shop is not currently accepting orders'
      );
    }

    // Check if trial has expired
    if (business.accountState === 'TRIAL' && business.trialEndsAt && business.trialEndsAt < new Date()) {
      throw new OrderError(
        'TRIAL_EXPIRED',
        'This shop\'s free trial has expired. Please subscribe to continue accepting orders.'
      );
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new OrderError('EMPTY_ORDER', 'Order must contain at least one item');
    }

    // Validate and calculate item prices
    const calculatedItems = await this.calculateItems(businessId, items);

    // Calculate totals (all in cents)
    const subtotalCents = calculatedItems.reduce((sum: number, item: CalculatedItem) => sum + item.totalPriceCents, 0);
    const taxCents = Math.round(subtotalCents * DEFAULT_TAX_RATE);
    const totalCents = subtotalCents + taxCents;

    // Generate unique identifiers
    const orderNumber = await this.generateOrderNumber(businessId);
    const pickupCode = await this.generateUniquePickupCode(businessId);

    // Create order in database
    const order = await this.prisma.order.create({
      data: {
        businessId,
        orderNumber,
        pickupCode,
        customerName,
        customerPhone,
        customerEmail,
        notes,
        subtotalCents,
        taxCents,
        totalCents,
        status: 'PENDING',
        items: {
          create: calculatedItems.map((item: CalculatedItem) => ({
            baseId: item.baseId,
            name: item.name,
            quantity: item.quantity,
            size: item.size,
            temperature: item.temperature,
            unitPriceCents: item.unitPriceCents,
            totalPriceCents: item.totalPriceCents,
            modifiers: item.modifiers as object[],
            notes: item.notes,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Submit to POS (non-blocking - order is created regardless of POS result)
    let posOrderId: string | undefined;
    try {
      posOrderId = await this.submitToPOS(order, business, calculatedItems);
      if (posOrderId) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { posOrderId },
        });
      }
    } catch (error) {
      // Log error but don't fail the order creation
      console.error('POS submission failed:', error);
    }

    return this.toOrderResult(order, calculatedItems, posOrderId);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<OrderResult | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return null;
    }

    return this.toOrderResult(order);
  }

  /**
   * Get order by pickup code (for customers)
   */
  async getOrderByPickupCode(businessId: string, pickupCode: string): Promise<OrderResult | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        businessId,
        pickupCode: pickupCode.toUpperCase(),
      },
      include: { items: true },
    });

    if (!order) {
      return null;
    }

    return this.toOrderResult(order);
  }

  /**
   * Get orders for a business
   */
  async getBusinessOrders(
    businessId: string,
    options: GetBusinessOrdersOptions = {}
  ): Promise<OrderResult[]> {
    const { status, limit = 50, offset = 0 } = options;

    const where: { businessId: string; status?: { in: OrderStatus[] } } = { businessId };
    if (status && status.length > 0) {
      where.status = { in: status };
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return orders.map((order: Order & { items: OrderItem[] }) => this.toOrderResult(order));
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new OrderError('NOT_FOUND', 'Order not found');
    }

    const updateData: { status: OrderStatus; completedAt?: Date } = { status };

    // Set completedAt when transitioning to COMPLETED
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: { items: true },
    });

    return this.toOrderResult(updated);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<OrderResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new OrderError('NOT_FOUND', 'Order not found');
    }

    // Check if order can be cancelled
    const nonCancellableStatuses: OrderStatus[] = ['READY', 'COMPLETED', 'CANCELLED'];
    if (nonCancellableStatuses.includes(order.status)) {
      throw new OrderError(
        'CANNOT_CANCEL',
        `Cannot cancel order with status: ${order.status}`
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledAt: new Date(),
      },
      include: { items: true },
    });

    return this.toOrderResult(updated);
  }

  /**
   * Sync order status from POS
   */
  async syncOrderStatus(orderId: string): Promise<OrderResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new OrderError('NOT_FOUND', 'Order not found');
    }

    if (!order.posOrderId) {
      throw new OrderError('NO_POS_ORDER', 'Order has no POS reference');
    }

    const posStatus = await this.posAdapter.getOrderStatus(order.posOrderId);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: posStatus,
        posStatus: posStatus,
      },
      include: { items: true },
    });

    return this.toOrderResult(updated);
  }

  /**
   * Calculate item prices and validate references.
   *
   * Supports two resolution strategies:
   * 1. **Mapped flow**: If client provides `unitPriceCents` and the baseId matches an
   *    ItemMapping, trust the client-provided price (it came from Square via
   *    MappedCatalogService). Modifier details are also client-provided.
   * 2. **Legacy flow**: Look up Base and Variation models from the database and
   *    calculate prices using the matched variation.
   */
  private async calculateItems(
    businessId: string,
    items: OrderItemInput[]
  ): Promise<CalculatedItem[]> {
    const result: CalculatedItem[] = [];

    for (const item of items) {
      // Try mapped flow first: check if baseId is a Square item ID in ItemMapping
      const mapping = await this.prisma.itemMapping.findUnique({
        where: {
          businessId_squareItemId: { businessId, squareItemId: item.baseId },
        },
      });

      if (mapping && item.unitPriceCents !== undefined) {
        // Mapped flow: Square IDs with client-provided prices
        result.push(this.calculateMappedItem(item, mapping.displayName || item.itemName || 'Custom Item'));
      } else {
        // Legacy flow: Drink-UX Base/Modifier model IDs
        const legacyItem = await this.calculateLegacyItem(businessId, item);
        result.push(legacyItem);
      }
    }

    return result;
  }

  /**
   * Calculate item using mapped flow (Square IDs, client-provided prices in cents).
   */
  private calculateMappedItem(item: OrderItemInput, name: string): CalculatedItem {
    const unitPriceCents = item.unitPriceCents!;
    const totalPriceCents = unitPriceCents * item.quantity;

    const modifiers: ModifierInfo[] = (item.modifierDetails || []).map(m => ({
      id: m.id,
      name: m.name,
      priceCents: m.priceCents,
    }));

    return {
      baseId: item.baseId,
      quantity: item.quantity,
      size: item.size,
      temperature: item.temperature,
      notes: item.notes,
      name,
      unitPriceCents,
      totalPriceCents,
      modifiers,
      isMapped: true,
    };
  }

  /**
   * Calculate item using legacy flow (Drink-UX Base/Modifier IDs, DB prices in cents).
   */
  private async calculateLegacyItem(
    businessId: string,
    item: OrderItemInput
  ): Promise<CalculatedItem> {
    // Validate base exists
    const base = await this.prisma.base.findFirst({
      where: {
        id: item.baseId,
        businessId,
      },
      include: {
        variations: true,
      },
    });

    if (!base) {
      throw new OrderError('INVALID_ITEM', `Invalid item reference: ${item.baseId}`);
    }

    // Find the matching variation by name, or fall back to base price
    let unitPriceCents = base.priceCents;
    const matchedVariation = base.variations.find(v => v.name === item.size);
    if (matchedVariation) {
      unitPriceCents = matchedVariation.priceCents;
    }

    // Get modifier details and add their prices
    const modifierInfos: ModifierInfo[] = [];
    if (item.modifiers && item.modifiers.length > 0) {
      const modifiers = await this.prisma.modifier.findMany({
        where: {
          id: { in: item.modifiers },
          businessId,
        },
      });

      for (const mod of modifiers) {
        modifierInfos.push({
          id: mod.id,
          name: mod.name,
          priceCents: mod.priceCents,
        });
        unitPriceCents += mod.priceCents;
      }
    }

    const totalPriceCents = unitPriceCents * item.quantity;

    return {
      baseId: item.baseId,
      quantity: item.quantity,
      size: item.size,
      temperature: item.temperature,
      notes: item.notes,
      name: base.name,
      unitPriceCents,
      totalPriceCents,
      modifiers: modifierInfos,
      isMapped: false,
    };
  }

  /**
   * Submit order to POS.
   *
   * For mapped items, Square IDs are used directly (no translation needed).
   * For legacy items, POS IDs are looked up from Base/Variation models.
   */
  private async submitToPOS(
    order: Order,
    business: Business,
    items: CalculatedItem[]
  ): Promise<string | undefined> {
    // Skip POS submission if business isn't connected
    if (!business.posProvider || !business.posAccessToken) {
      return undefined;
    }

    const posItems = [];

    for (const item of items) {
      if (item.isMapped) {
        // Mapped flow: baseId IS the Square item ID, modifier IDs ARE Square modifier IDs
        posItems.push({
          posItemId: item.baseId,
          quantity: item.quantity,
          modifierIds: item.modifiers.length > 0
            ? item.modifiers.map((m: ModifierInfo) => m.id)
            : undefined,
        });
      } else {
        // Legacy flow: look up POS IDs from Base/Variation models
        const base = await this.prisma.base.findUnique({
          where: { id: item.baseId },
          include: { variations: true },
        });

        // Find the variation matching the ordered size for the POS variation ID
        const matchedVariation = base?.variations.find(v => v.name === item.size);

        const modifierIds = item.modifiers.map((m: ModifierInfo) => m.id);
        const modifiers = modifierIds.length > 0
          ? await this.prisma.modifier.findMany({
              where: { id: { in: modifierIds } },
            })
          : [];

        const posModifierIds = modifiers
          .map((m) => m.posModifierId)
          .filter((id): id is string => !!id);

        posItems.push({
          posItemId: base?.posItemId || '',
          variationId: matchedVariation?.posVariationId || undefined,
          quantity: item.quantity,
          modifierIds: posModifierIds.length > 0 ? posModifierIds : undefined,
        });
      }
    }

    const submission: OrderSubmission = {
      items: posItems,
      customerName: order.customerName,
      customerEmail: order.customerEmail || undefined,
      customerPhone: order.customerPhone || undefined,
    };

    return this.posAdapter.createOrder(submission);
  }

  /**
   * Generate a unique order number for the business
   */
  private async generateOrderNumber(businessId: string): Promise<string> {
    // Get today's date for daily reset
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Count orders for this business today
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(dateStr);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const count = await this.prisma.order.count({
      where: {
        businessId,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    // Generate order number: Letter (based on day of week) + sequential number
    const dayLetter = String.fromCharCode(65 + (today.getDay() % 7)); // A-G
    const sequentialNumber = count + 1;

    return `${dayLetter}${sequentialNumber}`;
  }

  /**
   * Generate a unique pickup code
   */
  private async generateUniquePickupCode(businessId: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const code = this.generatePickupCode();

      // Check if code already exists for this business (within recent orders)
      const existing = await this.prisma.order.findFirst({
        where: {
          businessId,
          pickupCode: code,
          status: {
            notIn: ['COMPLETED', 'CANCELLED'],
          },
        },
      });

      if (!existing) {
        return code;
      }

      attempts++;
    }

    // Fallback: use timestamp-based code
    return this.generatePickupCode() + Date.now().toString(36).slice(-2).toUpperCase();
  }

  /**
   * Generate a random pickup code
   */
  private generatePickupCode(): string {
    let code = '';
    for (let i = 0; i < PICKUP_CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * PICKUP_CODE_CHARS.length);
      code += PICKUP_CODE_CHARS[randomIndex];
    }
    return code;
  }

  /**
   * Convert database order to result format
   */
  private toOrderResult(
    order: Order & { items: OrderItem[] },
    calculatedItems?: CalculatedItem[],
    posOrderIdOverride?: string
  ): OrderResult {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      pickupCode: order.pickupCode,
      status: order.status,
      estimatedReadyAt: order.estimatedReadyAt || undefined,
      items: order.items.map((item: OrderItem, index: number) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        size: item.size,
        temperature: item.temperature,
        unitPriceCents: item.unitPriceCents,
        totalPriceCents: item.totalPriceCents,
        modifiers: calculatedItems?.[index]?.modifiers || (item.modifiers as unknown as ModifierInfo[]) || [],
        notes: item.notes || undefined,
      })),
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      customerName: order.customerName,
      customerPhone: order.customerPhone || undefined,
      customerEmail: order.customerEmail || undefined,
      notes: order.notes || undefined,
      posOrderId: posOrderIdOverride || order.posOrderId || undefined,
      cancelReason: order.cancelReason || undefined,
      cancelledAt: order.cancelledAt || undefined,
      completedAt: order.completedAt || undefined,
      createdAt: order.createdAt,
    };
  }

}
