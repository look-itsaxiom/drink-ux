import { Router, Request, Response } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import { WebhookService, SquareWebhookEvent, WebhookProcessResult } from '../services/WebhookService';

/**
 * Response data for successful webhook processing
 */
interface WebhookResponseData extends WebhookProcessResult {}

/**
 * Extended Request with raw body for signature verification
 */
interface RawBodyRequest extends Request {
  body: Buffer | string;
}

/**
 * Creates the subscription webhooks router
 * @param webhookService - The webhook service instance
 */
export function createSubscriptionWebhooksRouter(webhookService: WebhookService): Router {
  const router = Router();

  /**
   * POST /webhooks/square/subscription
   * Receive and process Square subscription webhook events
   *
   * Square sends webhooks with:
   * - x-square-hmacsha256-signature header for verification
   * - JSON body with event data
   */
  router.post('/square/subscription', async (req: RawBodyRequest, res: Response) => {
    // Get raw body as string for signature verification
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : '';

    // Check for empty payload
    if (!rawBody || rawBody.trim() === '') {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'EMPTY_PAYLOAD',
          message: 'Request body is empty',
        },
      };
      res.status(400).json(response);
      return;
    }

    // Get signature from header
    const signature = req.headers['x-square-hmacsha256-signature'] as string | undefined;

    // Check for missing signature
    if (!signature) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing x-square-hmacsha256-signature header',
        },
      };
      res.status(401).json(response);
      return;
    }

    // Verify signature
    const isValidSignature = webhookService.verifySquareSignature(rawBody, signature);
    if (!isValidSignature) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed',
        },
      };
      res.status(401).json(response);
      return;
    }

    // Parse JSON payload
    let event: SquareWebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch (parseError) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Invalid JSON payload',
        },
      };
      res.status(400).json(response);
      return;
    }

    // Validate event structure
    const missingFields = webhookService.validateEventStructure(event);
    if (missingFields.length > 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: `Missing required fields: ${missingFields.join(', ')}`,
        },
      };
      res.status(400).json(response);
      return;
    }

    // Process the event
    try {
      const result = await webhookService.processSubscriptionEvent(event);

      // Log the event for auditing
      await webhookService.logWebhookEvent(event, result);

      const response: ApiResponse<WebhookResponseData> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      // Log the error
      await webhookService.logWebhookEvent(event, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error('Webhook processing error:', error);

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while processing the webhook',
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
