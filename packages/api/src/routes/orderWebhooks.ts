import { Router, Request, Response } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import { WebhookService, SquareWebhookEvent, WebhookProcessResult } from '../services/WebhookService';

interface RawBodyRequest extends Request {
  body: Buffer | string;
}

/**
 * Creates the order webhooks router.
 * Handles Square order.updated and order.created events to keep
 * internal order statuses in sync with the POS.
 */
export function createOrderWebhooksRouter(webhookService: WebhookService): Router {
  const router = Router();

  router.post('/square/orders', async (req: RawBodyRequest, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : '';

    if (!rawBody || rawBody.trim() === '') {
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'EMPTY_PAYLOAD', message: 'Request body is empty' },
      };
      res.status(400).json(response);
      return;
    }

    const signature = req.headers['x-square-hmacsha256-signature'] as string | undefined;
    if (!signature) {
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'MISSING_SIGNATURE', message: 'Missing x-square-hmacsha256-signature header' },
      };
      res.status(401).json(response);
      return;
    }

    if (!webhookService.verifySquareSignature(rawBody, signature)) {
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' },
      };
      res.status(401).json(response);
      return;
    }

    let event: SquareWebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Invalid JSON payload' },
      };
      res.status(400).json(response);
      return;
    }

    const missingFields = webhookService.validateEventStructure(event);
    if (missingFields.length > 0) {
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'MISSING_FIELDS', message: `Missing required fields: ${missingFields.join(', ')}` },
      };
      res.status(400).json(response);
      return;
    }

    try {
      const result = await webhookService.processOrderEvent(event);
      await webhookService.logWebhookEvent(event, result);

      const response: ApiResponse<WebhookProcessResult> = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      await webhookService.logWebhookEvent(event, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error('Order webhook processing error:', error);

      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An error occurred while processing the webhook' },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
