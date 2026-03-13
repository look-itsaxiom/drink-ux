import crypto from 'crypto';
import { PrismaClient, AccountState, OrderStatus } from '../../generated/prisma';

/**
 * Square webhook event structure
 */
export interface SquareWebhookEvent {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: Record<string, unknown>;
  };
}

/**
 * Subscription object from Square
 */
export interface SquareSubscription {
  id: string;
  customer_id?: string;
  plan_variation_id?: string;
  status: string;
  start_date?: string;
  canceled_date?: string;
}

/**
 * Invoice object from Square
 */
export interface SquareInvoice {
  id: string;
  subscription_id?: string;
  status: string;
  payment_requests?: Array<{
    computed_amount_money?: {
      amount: number;
      currency: string;
    };
  }>;
  automatic_payment_source?: string;
  next_payment_attempt_date?: string | null;
}

/**
 * Square order payload from order.updated webhook
 */
export interface SquareOrderPayload {
  id: string;
  location_id: string;
  state: string;
  version?: number;
  updated_at?: string;
  fulfillments?: Array<{
    uid: string;
    type: string;
    state: string;
    pickup_details?: Record<string, unknown>;
  }>;
}

/**
 * Result of processing a webhook event
 */
export interface WebhookProcessResult {
  success: boolean;
  processed?: boolean;
  handled?: boolean;
  duplicate?: boolean;
  warning?: string;
  message?: string;
  error?: string;
}

/**
 * Configuration for WebhookService
 */
export interface WebhookServiceConfig {
  webhookSignatureKey: string;
  notificationUrl: string;
  gracePeriodDays?: number;
}

/**
 * Custom error for webhook processing
 */
export class WebhookError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

// Default grace period for failed payments (7 days)
const DEFAULT_GRACE_PERIOD_DAYS = 7;

// In-memory store for processed event IDs (in production, use Redis or DB)
const processedEventIds = new Set<string>();

/**
 * Service for handling Square subscription webhooks
 */
export class WebhookService {
  private readonly gracePeriodDays: number;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: WebhookServiceConfig
  ) {
    this.gracePeriodDays = config.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
  }

  /**
   * Verify Square webhook signature
   * @param payload - Raw request body as string
   * @param signature - Signature from x-square-hmacsha256-signature header
   * @returns true if signature is valid
   */
  verifySquareSignature(payload: string, signature: string): boolean {
    if (!signature || !payload) {
      return false;
    }

    try {
      // Square signature format: sha256=<base64-encoded-hmac>
      const expectedPrefix = 'sha256=';
      if (!signature.startsWith(expectedPrefix)) {
        return false;
      }

      // The string to sign is notification URL + payload
      const stringToSign = this.config.notificationUrl + payload;

      // Create HMAC
      const hmac = crypto.createHmac('sha256', this.config.webhookSignatureKey);
      hmac.update(stringToSign);
      const expectedSignature = expectedPrefix + hmac.digest('base64');

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Process a subscription webhook event
   * @param event - Parsed webhook event
   * @returns Processing result
   */
  async processSubscriptionEvent(event: SquareWebhookEvent): Promise<WebhookProcessResult> {
    // Check for duplicate events (idempotency)
    if (processedEventIds.has(event.event_id)) {
      return {
        success: true,
        processed: false,
        duplicate: true,
        message: 'Event already processed',
      };
    }

    // Find business by merchant ID
    const business = await this.prisma.business.findFirst({
      where: { posMerchantId: event.merchant_id },
    });

    // Route to appropriate handler based on event type
    let result: WebhookProcessResult;

    switch (event.type) {
      case 'subscription.created':
        result = await this.handleSubscriptionCreated(event, business);
        break;

      case 'subscription.updated':
        result = await this.handleSubscriptionUpdated(event, business);
        break;

      case 'subscription.canceled':
        result = await this.handleSubscriptionCanceled(event, business);
        break;

      case 'subscription.paused':
        result = await this.handleSubscriptionPaused(event, business);
        break;

      case 'subscription.resumed':
        result = await this.handleSubscriptionResumed(event, business);
        break;

      case 'invoice.payment_made':
        result = await this.handleInvoicePaymentMade(event, business);
        break;

      case 'invoice.payment_failed':
        result = await this.handleInvoicePaymentFailed(event, business);
        break;

      default:
        result = {
          success: true,
          handled: false,
          message: `Event type '${event.type}' is unhandled`,
        };
    }

    // Mark event as processed
    processedEventIds.add(event.event_id);

    // Cleanup old event IDs (keep last 10000)
    if (processedEventIds.size > 10000) {
      const entries = Array.from(processedEventIds);
      for (let i = 0; i < 1000; i++) {
        processedEventIds.delete(entries[i]);
      }
    }

    return result;
  }

  /**
   * Process an order webhook event (order.updated, order.created)
   */
  async processOrderEvent(event: SquareWebhookEvent): Promise<WebhookProcessResult> {
    // Check for duplicate events
    if (processedEventIds.has(event.event_id)) {
      return {
        success: true,
        processed: false,
        duplicate: true,
        message: 'Event already processed',
      };
    }

    if (event.type !== 'order.updated' && event.type !== 'order.created') {
      return {
        success: true,
        handled: false,
        message: `Event type '${event.type}' is not an order event`,
      };
    }

    const orderData = (event.data.object as { order?: SquareOrderPayload })?.order;
    if (!orderData) {
      return {
        success: true,
        processed: true,
        warning: 'Order data missing from event payload',
      };
    }

    // Find the internal order by Square order ID
    const order = await this.prisma.order.findFirst({
      where: { posOrderId: orderData.id },
    });

    if (!order) {
      return {
        success: true,
        processed: true,
        warning: `No internal order found for Square order ID '${orderData.id}'`,
      };
    }

    // Version check: ignore stale updates
    const currentVersion = order.posVersion ?? 0;
    if (orderData.version !== undefined && orderData.version <= currentVersion) {
      processedEventIds.add(event.event_id);
      return {
        success: true,
        processed: false,
        message: `Stale event (version ${orderData.version} <= stored ${currentVersion})`,
      };
    }

    // Map Square state + fulfillment state to internal status
    const newStatus = this.mapSquareOrderStatus(orderData);

    // Only update if status actually changed
    if (newStatus !== order.status) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          posStatus: `${orderData.state}${orderData.fulfillments?.[0]?.state ? '/' + orderData.fulfillments[0].state : ''}`,
          posVersion: orderData.version ?? currentVersion + 1,
        },
      });
    } else {
      // Still update version even if status unchanged
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          posVersion: orderData.version ?? currentVersion + 1,
        },
      });
    }

    processedEventIds.add(event.event_id);

    return {
      success: true,
      processed: true,
      message: `Order ${order.orderNumber} status updated to ${newStatus}`,
    };
  }

  /**
   * Map Square order state + fulfillment state to internal OrderStatus.
   * Uses the mapping from SQUARE_ORDER_WEBHOOKS_RESEARCH.md.
   */
  private mapSquareOrderStatus(order: SquareOrderPayload): OrderStatus {
    const state = order.state;
    const fulfillmentState = order.fulfillments?.[0]?.state;

    if (state === 'CANCELED') return 'CANCELLED';
    if (state === 'COMPLETED') return 'COMPLETED';

    // OPEN state — drill into fulfillment
    if (state === 'OPEN') {
      switch (fulfillmentState) {
        case 'PREPARED':
          return 'READY';
        case 'RESERVED':
          return 'CONFIRMED';
        case 'COMPLETED':
          return 'COMPLETED';
        case 'CANCELED':
          return 'CANCELLED';
        case 'PROPOSED':
        default:
          return 'PENDING';
      }
    }

    // Fallback
    return 'PENDING';
  }

  /**
   * Handle subscription.created event
   */
  private async handleSubscriptionCreated(
    event: SquareWebhookEvent,
    business: { id: string } | null
  ): Promise<WebhookProcessResult> {
    if (!business) {
      return {
        success: true,
        processed: true,
        warning: 'Subscription created but business not found for merchant',
      };
    }

    const subscription = (event.data.object as { subscription?: SquareSubscription })?.subscription;
    if (!subscription) {
      return {
        success: true,
        processed: true,
        warning: 'Subscription data missing from event',
      };
    }

    // Update business with subscription info
    await this.prisma.business.update({
      where: { id: business.id },
      data: {
        subscriptionStatus: subscription.id,
        accountState: this.mapSubscriptionStatusToAccountState(subscription.status),
      },
    });

    // TODO: Send notification (placeholder for future email integration)
    await this.sendNotification(business.id, 'subscription_created', {
      subscriptionId: subscription.id,
    });

    return {
      success: true,
      processed: true,
    };
  }

  /**
   * Handle subscription.updated event
   */
  private async handleSubscriptionUpdated(
    event: SquareWebhookEvent,
    business: { id: string; subscriptionStatus?: string | null } | null
  ): Promise<WebhookProcessResult> {
    if (!business) {
      // Try to find business by subscription ID from the event
      const subscription = (event.data.object as { subscription?: SquareSubscription })?.subscription;
      if (subscription) {
        const businessBySubscription = await this.prisma.business.findFirst({
          where: { subscriptionStatus: { contains: subscription.id } },
        });
        if (businessBySubscription) {
          return this.handleSubscriptionUpdated(event, businessBySubscription);
        }
      }

      return {
        success: true,
        processed: true,
        warning: 'Subscription updated but business not found',
      };
    }

    const subscription = (event.data.object as { subscription?: SquareSubscription })?.subscription;
    if (!subscription) {
      return {
        success: true,
        processed: true,
        warning: 'Subscription data missing from event',
      };
    }

    // Check if subscription ID matches business's recorded subscription
    const currentSubscriptionId = business.subscriptionStatus?.split('|')[0];
    const subscriptionMismatch = currentSubscriptionId && currentSubscriptionId !== subscription.id;

    // Update business account state
    await this.prisma.business.update({
      where: { id: business.id },
      data: {
        accountState: this.mapSubscriptionStatusToAccountState(subscription.status),
      },
    });

    if (subscriptionMismatch) {
      return {
        success: true,
        processed: true,
        warning: `Subscription ID mismatch: event has '${subscription.id}' but business has '${currentSubscriptionId}'`,
      };
    }

    return {
      success: true,
      processed: true,
    };
  }

  /**
   * Handle subscription.canceled event
   */
  private async handleSubscriptionCanceled(
    event: SquareWebhookEvent,
    business: { id: string } | null
  ): Promise<WebhookProcessResult> {
    if (!business) {
      // Try to find by subscription ID
      const subscription = (event.data.object as { subscription?: SquareSubscription })?.subscription;
      if (subscription) {
        const businessBySubscription = await this.prisma.business.findFirst({
          where: { subscriptionStatus: { contains: subscription.id } },
        });
        if (businessBySubscription) {
          return this.handleSubscriptionCanceled(event, businessBySubscription);
        }
      }

      return {
        success: true,
        processed: true,
        warning: 'Subscription canceled but business not found',
      };
    }

    // Set business to PAUSED state
    await this.prisma.business.update({
      where: { id: business.id },
      data: {
        accountState: 'PAUSED',
      },
    });

    // TODO: Send notification
    await this.sendNotification(business.id, 'subscription_canceled', {});

    return {
      success: true,
      processed: true,
    };
  }

  /**
   * Handle subscription.paused event
   */
  private async handleSubscriptionPaused(
    event: SquareWebhookEvent,
    business: { id: string } | null
  ): Promise<WebhookProcessResult> {
    if (!business) {
      return {
        success: true,
        processed: true,
        warning: 'Subscription paused but business not found',
      };
    }

    await this.prisma.business.update({
      where: { id: business.id },
      data: {
        accountState: 'PAUSED',
      },
    });

    // TODO: Send notification
    await this.sendNotification(business.id, 'subscription_paused', {});

    return {
      success: true,
      processed: true,
    };
  }

  /**
   * Handle subscription.resumed event
   */
  private async handleSubscriptionResumed(
    event: SquareWebhookEvent,
    business: { id: string } | null
  ): Promise<WebhookProcessResult> {
    if (!business) {
      return {
        success: true,
        processed: true,
        warning: 'Subscription resumed but business not found',
      };
    }

    // Reactivate business
    await this.prisma.business.update({
      where: { id: business.id },
      data: {
        accountState: 'ACTIVE',
      },
    });

    // TODO: Send notification
    await this.sendNotification(business.id, 'subscription_resumed', {});

    return {
      success: true,
      processed: true,
    };
  }

  /**
   * Handle invoice.payment_made event
   */
  private async handleInvoicePaymentMade(
    event: SquareWebhookEvent,
    business: { id: string; subscriptionStatus: string | null } | null
  ): Promise<WebhookProcessResult> {
    const invoice = (event.data.object as { invoice?: SquareInvoice })?.invoice;

    if (!business && invoice?.subscription_id) {
      // Try to find business by subscription ID
      const businessBySubscription = await this.prisma.business.findFirst({
        where: { subscriptionStatus: { contains: invoice.subscription_id } },
      });
      if (businessBySubscription) {
        return this.handleInvoicePaymentMade(event, businessBySubscription);
      }
    }

    if (!business) {
      return {
        success: true,
        processed: true,
        warning: 'Payment made but business not found',
      };
    }

    // Clear any grace period and ensure business is active
    const currentStatus = business.subscriptionStatus || '';
    const baseSubscriptionId = currentStatus.split('|')[0];

    await this.prisma.business.update({
      where: { id: business.id },
      data: {
        accountState: 'ACTIVE',
        subscriptionStatus: baseSubscriptionId, // Remove grace period info
      },
    });

    // TODO: Send notification
    await this.sendNotification(business.id, 'payment_successful', {
      invoiceId: invoice?.id,
    });

    return {
      success: true,
      processed: true,
    };
  }

  /**
   * Handle invoice.payment_failed event
   */
  private async handleInvoicePaymentFailed(
    event: SquareWebhookEvent,
    business: { id: string; subscriptionStatus: string | null; accountState: AccountState } | null
  ): Promise<WebhookProcessResult> {
    const invoice = (event.data.object as { invoice?: SquareInvoice })?.invoice;

    if (!business && invoice?.subscription_id) {
      // Try to find business by subscription ID
      const businessBySubscription = await this.prisma.business.findFirst({
        where: { subscriptionStatus: { contains: invoice.subscription_id } },
      });
      if (businessBySubscription) {
        return this.handleInvoicePaymentFailed(event, businessBySubscription);
      }
    }

    if (!business) {
      return {
        success: true,
        processed: true,
        warning: 'Payment failed but business not found',
      };
    }

    // Check if already in grace period
    const currentStatus = business.subscriptionStatus || '';
    const isInGracePeriod = currentStatus.includes('grace_period');

    if (!isInGracePeriod) {
      // Start grace period
      const baseSubscriptionId = currentStatus.split('|')[0];
      const gracePeriodStart = new Date().toISOString().split('T')[0];

      await this.prisma.business.update({
        where: { id: business.id },
        data: {
          // Keep business active during grace period
          accountState: 'ACTIVE',
          subscriptionStatus: `${baseSubscriptionId}|grace_period|${gracePeriodStart}`,
        },
      });

      // TODO: Send notification about payment failure and grace period
      await this.sendNotification(business.id, 'payment_failed_grace_period', {
        gracePeriodDays: this.gracePeriodDays,
      });
    } else {
      // Check if grace period has expired
      const parts = currentStatus.split('|');
      if (parts.length >= 3) {
        const gracePeriodStart = new Date(parts[2]);
        const daysSinceStart = Math.floor(
          (Date.now() - gracePeriodStart.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceStart >= this.gracePeriodDays) {
          // Grace period expired - this will be handled by subscription.canceled event
          // Just send a warning notification
          await this.sendNotification(business.id, 'grace_period_expired', {});
        }
      }
    }

    return {
      success: true,
      processed: true,
    };
  }

  /**
   * Map Square subscription status to AccountState
   */
  private mapSubscriptionStatusToAccountState(status: string): AccountState {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'ACTIVE';
      case 'CANCELED':
      case 'PAUSED':
      case 'DEACTIVATED':
        return 'PAUSED';
      case 'PENDING':
        return 'SETUP_COMPLETE';
      default:
        return 'ACTIVE';
    }
  }

  /**
   * Send notification (placeholder for future email integration)
   */
  private async sendNotification(
    businessId: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // TODO: Implement email/notification sending
    // For now, just log the notification
    console.log(`[Notification] Business ${businessId}: ${type}`, data);
  }

  /**
   * Log webhook event for auditing
   * @param event - The webhook event
   * @param result - Processing result
   */
  async logWebhookEvent(
    event: SquareWebhookEvent,
    result: { success: boolean; error?: string; processed?: boolean }
  ): Promise<void> {
    // TODO: Store in database for audit trail
    // For now, just log to console
    console.log(`[Webhook] ${event.type} (${event.event_id}):`, {
      merchantId: event.merchant_id,
      success: result.success,
      error: result.error,
      processed: result.processed,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Validate webhook event structure
   * @param event - Event to validate
   * @returns Array of missing field names, empty if valid
   */
  validateEventStructure(event: unknown): string[] {
    const missingFields: string[] = [];

    if (!event || typeof event !== 'object') {
      return ['event'];
    }

    const e = event as Record<string, unknown>;

    if (!e.event_id) missingFields.push('event_id');
    if (!e.type) missingFields.push('type');
    if (!e.created_at) missingFields.push('created_at');
    if (!e.data) missingFields.push('data');

    return missingFields;
  }
}
