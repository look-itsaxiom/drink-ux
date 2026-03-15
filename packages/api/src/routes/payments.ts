import { Router, Response } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import { PrismaClient } from '../../generated/prisma';
import { PaymentService, PaymentError, PaymentResult } from '../services/PaymentService';
import { decryptToken } from '../utils/encryption';

const SQUARE_API_VERSION = '2024-01-18';

/**
 * Build a SquareClient for a given business's credentials.
 * Uses raw fetch against the Square Payments API (matches the interface PaymentService expects).
 */
function createSquarePaymentsClient(accessToken: string, environment: 'sandbox' | 'production') {
  const baseUrl = environment === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';

  return {
    paymentsApi: {
      async createPayment(request: {
        idempotencyKey: string;
        sourceId: string;
        amountMoney: { amount: bigint; currency: string };
        orderId?: string;
        locationId?: string;
        customerId?: string;
      }) {
        const body: Record<string, unknown> = {
          idempotency_key: request.idempotencyKey,
          source_id: request.sourceId,
          amount_money: {
            amount: Number(request.amountMoney.amount),
            currency: request.amountMoney.currency,
          },
        };

        if (request.orderId) body.order_id = request.orderId;
        if (request.locationId) body.location_id = request.locationId;
        if (request.customerId) body.customer_id = request.customerId;

        const res = await fetch(`${baseUrl}/v2/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Square-Version': SQUARE_API_VERSION,
          },
          body: JSON.stringify(body),
        });

        const data = await res.json() as any;

        if (!res.ok) {
          throw data; // PaymentService handles the { errors: [...] } shape
        }

        return {
          result: {
            payment: {
              id: data.payment.id,
              status: data.payment.status,
              amountMoney: data.payment.amount_money
                ? {
                    amount: BigInt(data.payment.amount_money.amount),
                    currency: data.payment.amount_money.currency,
                  }
                : undefined,
            },
          },
        };
      },

      async getPayment(paymentId: string) {
        const res = await fetch(`${baseUrl}/v2/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Square-Version': SQUARE_API_VERSION,
          },
        });

        const data = await res.json() as any;

        if (!res.ok) {
          throw data;
        }

        return {
          result: {
            payment: {
              id: data.payment.id,
              status: data.payment.status,
              amountMoney: data.payment.amount_money
                ? {
                    amount: BigInt(data.payment.amount_money.amount),
                    currency: data.payment.amount_money.currency,
                  }
                : undefined,
            },
          },
        };
      },
    },

    refundsApi: {
      async refundPayment(request: {
        idempotencyKey: string;
        paymentId: string;
        amountMoney: { amount: bigint; currency: string };
        reason?: string;
      }) {
        const body: Record<string, unknown> = {
          idempotency_key: request.idempotencyKey,
          payment_id: request.paymentId,
          amount_money: {
            amount: Number(request.amountMoney.amount),
            currency: request.amountMoney.currency,
          },
        };

        if (request.reason) body.reason = request.reason;

        const res = await fetch(`${baseUrl}/v2/refunds`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Square-Version': SQUARE_API_VERSION,
          },
          body: JSON.stringify(body),
        });

        const data = await res.json() as any;

        if (!res.ok) {
          throw data;
        }

        return {
          result: {
            refund: {
              id: data.refund.id,
              status: data.refund.status,
              paymentId: data.refund.payment_id,
              amountMoney: data.refund.amount_money
                ? {
                    amount: BigInt(data.refund.amount_money.amount),
                    currency: data.refund.amount_money.currency,
                  }
                : undefined,
            },
          },
        };
      },
    },
  };
}

interface PayOrderRequest {
  sourceId: string;
  amountCents: number;
}

const ENCRYPTION_KEY = process.env.POS_TOKEN_ENCRYPTION_KEY || 'test-key-must-be-32-chars-long!!';
const SQUARE_ENVIRONMENT = (process.env.SQUARE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';

/**
 * Create payment routes
 */
export function createPaymentRouter(prisma: PrismaClient): Router {
  const router = Router();

  // =============================================================================
  // POST /api/orders/:orderId/pay - Process payment for an order
  // =============================================================================
  router.post('/:orderId/pay', async (req, res: Response) => {
    try {
      const { orderId } = req.params;
      const { sourceId, amountCents } = req.body as PayOrderRequest;

      // Validate input
      if (!sourceId) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'sourceId is required (payment token from Square Web Payments SDK)' },
        };
        return res.status(400).json(response);
      }

      if (!amountCents || amountCents <= 0) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'amountCents is required and must be positive' },
        };
        return res.status(400).json(response);
      }

      // Look up order + business to get Square credentials
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { business: true },
      });

      if (!order) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        };
        return res.status(404).json(response);
      }

      if (!order.business.posAccessToken) {
        const response: ApiResponse<never> = {
          success: false,
          error: { code: 'PAYMENT_NOT_CONFIGURED', message: 'This business has not configured payment processing' },
        };
        return res.status(400).json(response);
      }

      // Create a Square client with decrypted business credentials
      const accessToken = decryptToken(order.business.posAccessToken, ENCRYPTION_KEY);
      const squareClient = createSquarePaymentsClient(accessToken, SQUARE_ENVIRONMENT);
      const paymentService = new PaymentService(prisma, squareClient);

      // Process payment
      const result: PaymentResult = await paymentService.processPayment({
        orderId,
        sourceId,
        amountCents,
      });

      // On successful payment, transition order to CONFIRMED
      if (result.success) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CONFIRMED' },
        });
      }

      const response: ApiResponse<{ payment: PaymentResult }> = {
        success: true,
        data: { payment: result },
      };
      return res.json(response);
    } catch (error) {
      if (error instanceof PaymentError) {
        const statusCode = error.code === 'ORDER_NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.detail,
          },
        };
        return res.status(statusCode).json(response);
      }

      console.error('Payment error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while processing the payment',
        },
      };
      return res.status(500).json(response);
    }
  });

  return router;
}
