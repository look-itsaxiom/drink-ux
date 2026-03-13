import { PrismaClient, PaymentStatus, Order } from '../../generated/prisma';
import { randomUUID } from 'crypto';

/**
 * Custom error class for payment errors
 */
export class PaymentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * Input for processing a payment
 */
export interface ProcessPaymentInput {
  /** The order ID to process payment for */
  orderId: string;
  /** Payment token from Square Web Payments SDK */
  sourceId: string;
  /** Amount to charge in dollars */
  amount: number;
  /** Currency code (default: USD) */
  currency?: string;
  /** Optional customer ID for Square */
  customerId?: string;
}

/**
 * Result from payment operations
 */
export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  status?: string;
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}

/**
 * Result from refund operations
 */
export interface RefundResult {
  success: boolean;
  refundId?: string;
  status?: string;
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}

/**
 * Square payment response structure
 */
interface SquarePayment {
  id: string;
  status: string;
  amountMoney?: {
    amount: bigint;
    currency: string;
  };
}

/**
 * Square refund response structure
 */
interface SquareRefund {
  id: string;
  status: string;
  paymentId: string;
  amountMoney?: {
    amount: bigint;
    currency: string;
  };
}

/**
 * Square API error structure
 */
interface SquareApiError {
  errors?: Array<{
    category: string;
    code: string;
    detail: string;
  }>;
}

/**
 * Square client interface
 */
interface SquareClient {
  paymentsApi: {
    createPayment(request: {
      idempotencyKey: string;
      sourceId: string;
      amountMoney: { amount: bigint; currency: string };
      orderId?: string;
      locationId?: string;
      customerId?: string;
    }): Promise<{ result: { payment: SquarePayment } }>;

    getPayment(paymentId: string): Promise<{ result: { payment: SquarePayment } }>;
  };

  refundsApi: {
    refundPayment(request: {
      idempotencyKey: string;
      paymentId: string;
      amountMoney: { amount: bigint; currency: string };
      reason?: string;
    }): Promise<{ result: { refund: SquareRefund } }>;
  };
}

/**
 * Map Square error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  CARD_DECLINED_INSUFFICIENT_FUNDS: 'Your card was declined due to insufficient funds.',
  CARD_EXPIRED: 'Your card has expired. Please use a different card.',
  CARD_DECLINED: 'Your card was declined. Please try a different card.',
  CVV_FAILURE: 'The CVV number is incorrect. Please check and try again.',
  INVALID_CARD_DATA: 'The card information is invalid. Please check and try again.',
  INVALID_EXPIRATION: 'The card expiration date is invalid.',
  INVALID_CARD: 'The card number is invalid.',
  ADDRESS_VERIFICATION_FAILURE: 'Address verification failed. Please check your billing address.',
  GENERIC_DECLINE: 'Your card was declined. Please try a different card.',
};

/**
 * Payment Service - handles payment processing via Square Payments API
 */
export class PaymentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly squareClient: SquareClient
  ) {}

  /**
   * Process a payment for an order
   */
  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    const { orderId, sourceId, amount, currency = 'USD', customerId } = input;

    // Fetch the order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { business: true },
    });

    if (!order) {
      throw new PaymentError('ORDER_NOT_FOUND', 'Order not found');
    }

    // Check if order is already paid
    if (order.paymentStatus === 'COMPLETED') {
      throw new PaymentError('ORDER_ALREADY_PAID', 'This order has already been paid');
    }

    // Check if payment is already in progress
    if (order.paymentStatus === 'PROCESSING') {
      throw new PaymentError('PAYMENT_IN_PROGRESS', 'A payment is already being processed for this order');
    }

    // Validate amount matches order total
    if (Math.abs(amount - order.total) > 0.01) {
      throw new PaymentError(
        'AMOUNT_MISMATCH',
        'Payment amount does not match order total',
        `Expected ${order.total}, got ${amount}`
      );
    }

    // Mark payment as processing
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'PROCESSING' },
    });

    try {
      // Convert amount to cents
      const amountInCents = Math.round(amount * 100);
      const idempotencyKey = `order-${orderId}-${randomUUID()}`;

      // Create payment with Square
      const response = await this.squareClient.paymentsApi.createPayment({
        idempotencyKey,
        sourceId,
        amountMoney: {
          amount: BigInt(amountInCents),
          currency,
        },
        orderId: order.posOrderId || undefined,
        locationId: order.business.posLocationId || undefined,
        customerId,
      });

      const payment = response.result.payment;

      // Update order with payment info
      await this.linkPaymentToOrder(orderId, payment.id, amount);

      return {
        success: true,
        paymentId: payment.id,
        status: payment.status,
      };
    } catch (error) {
      // Update order payment status to failed
      await this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });

      // Handle Square API errors
      const squareError = error as SquareApiError;
      if (squareError.errors && squareError.errors.length > 0) {
        const firstError = squareError.errors[0];
        const code = this.mapErrorCode(firstError.code);
        const message = ERROR_MESSAGES[firstError.code] || firstError.detail || 'Payment failed';

        throw new PaymentError(code, message, firstError.detail);
      }

      // Handle generic errors
      throw new PaymentError(
        'PAYMENT_FAILED',
        'Payment processing failed. Please try again.',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get payment status from Square
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    try {
      const response = await this.squareClient.paymentsApi.getPayment(paymentId);
      const payment = response.result.payment;

      return {
        success: true,
        paymentId: payment.id,
        status: payment.status,
      };
    } catch (error) {
      const squareError = error as SquareApiError;
      if (squareError.errors && squareError.errors.length > 0) {
        const firstError = squareError.errors[0];
        if (firstError.code === 'NOT_FOUND') {
          throw new PaymentError('PAYMENT_NOT_FOUND', 'Payment not found');
        }
      }

      throw new PaymentError(
        'PAYMENT_STATUS_FAILED',
        'Failed to get payment status',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, reason?: string): Promise<RefundResult> {
    // Find the order with this payment
    const order = await this.prisma.order.findFirst({
      where: { paymentId },
    });

    if (!order) {
      throw new PaymentError('PAYMENT_NOT_FOUND', 'Payment not found');
    }

    // Check if already refunded
    if (order.paymentStatus === 'REFUNDED') {
      throw new PaymentError('ALREADY_REFUNDED', 'This payment has already been refunded');
    }

    // Check if payment was completed
    if (order.paymentStatus !== 'COMPLETED') {
      throw new PaymentError(
        'INVALID_REFUND',
        'Cannot refund a payment that was not completed'
      );
    }

    try {
      const amountInCents = Math.round((order.paymentAmount || order.total) * 100);
      const idempotencyKey = `refund-${paymentId}-${randomUUID()}`;

      const response = await this.squareClient.refundsApi.refundPayment({
        idempotencyKey,
        paymentId,
        amountMoney: {
          amount: BigInt(amountInCents),
          currency: 'USD',
        },
        reason,
      });

      const refund = response.result.refund;

      // Update order payment status
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'REFUNDED' },
      });

      return {
        success: true,
        refundId: refund.id,
        status: 'REFUNDED',
      };
    } catch (error) {
      const squareError = error as SquareApiError;
      if (squareError.errors && squareError.errors.length > 0) {
        const firstError = squareError.errors[0];
        throw new PaymentError(
          firstError.code,
          firstError.detail || 'Refund failed'
        );
      }

      throw new PaymentError(
        'REFUND_FAILED',
        'Failed to process refund',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Link payment to order in database
   */
  private async linkPaymentToOrder(
    orderId: string,
    paymentId: string,
    amount: number
  ): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentId,
        paymentStatus: 'COMPLETED',
        paymentAmount: amount,
        paymentMethod: 'card',
        paidAt: new Date(),
      },
    });
  }

  /**
   * Map Square error codes to our error codes
   */
  private mapErrorCode(squareCode: string): string {
    // Card declined errors
    if (squareCode.includes('DECLINED') || squareCode.includes('DECLINE')) {
      return 'CARD_DECLINED';
    }

    // Expired card
    if (squareCode === 'CARD_EXPIRED') {
      return 'CARD_EXPIRED';
    }

    // Invalid card data
    if (squareCode.includes('INVALID_CARD') || squareCode === 'INVALID_CARD_DATA') {
      return 'INVALID_CARD_DATA';
    }

    // CVV errors
    if (squareCode === 'CVV_FAILURE') {
      return 'CVV_FAILURE';
    }

    // Return original code for unmapped errors
    return squareCode;
  }
}
