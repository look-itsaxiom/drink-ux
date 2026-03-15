import { Router, Response } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import { OrderStatus } from '../../generated/prisma';
import { OrderService, OrderResult, OrderError, CreateOrderInput, OrderItemInput } from '../services/OrderService';
import { AuthenticatedRequest, requireAuth } from '../middleware/session';

// Valid order statuses
const VALID_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
];

/**
 * Create order router
 */
export function createOrderRouter(orderService: OrderService): Router {
  const router = Router();

  // =============================================================================
  // POST /api/orders - Create a new order (guest checkout)
  // =============================================================================
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId, customerName, customerPhone, customerEmail, items, notes } = req.body;

      // Validate required fields
      if (!businessId || !customerName || !items) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: businessId, customerName, and items are required',
          },
        };
        return res.status(400).json(response);
      }

      // Validate items is non-empty array
      if (!Array.isArray(items) || items.length === 0) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Order must contain at least one item',
          },
        };
        return res.status(400).json(response);
      }

      // Validate each item
      for (const item of items) {
        if (!item.baseId || !item.quantity || !item.size || !item.temperature) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Each item must have baseId, quantity, size, and temperature',
            },
          };
          return res.status(400).json(response);
        }
      }

      const input: CreateOrderInput = {
        businessId,
        customerName,
        customerPhone,
        customerEmail,
        items: items.map((item: OrderItemInput) => ({
          baseId: item.baseId,
          quantity: item.quantity,
          size: item.size,
          temperature: item.temperature,
          modifiers: item.modifiers || [],
          notes: item.notes,
          // Mapped flow fields (optional - sent when using Square IDs)
          unitPriceCents: item.unitPriceCents,
          itemName: item.itemName,
          modifierDetails: item.modifierDetails,
        })),
        notes,
      };

      const order = await orderService.createOrder(input);

      const response: ApiResponse<{ order: OrderResult }> = {
        success: true,
        data: { order },
      };
      return res.status(201).json(response);
    } catch (error) {
      if (error instanceof OrderError) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        return res.status(400).json(response);
      }
      console.error('Error creating order:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating the order',
        },
      };
      return res.status(500).json(response);
    }
  });

  // =============================================================================
  // GET /api/orders/pickup/:pickupCode - Get order by pickup code
  // =============================================================================
  router.get('/pickup/:pickupCode', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { pickupCode } = req.params;
      const { businessId } = req.query;

      if (!businessId || typeof businessId !== 'string') {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'businessId query parameter is required',
          },
        };
        return res.status(400).json(response);
      }

      const order = await orderService.getOrderByPickupCode(businessId, pickupCode);

      if (!order) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Order not found',
          },
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<{ order: OrderResult }> = {
        success: true,
        data: { order },
      };
      return res.json(response);
    } catch (error) {
      console.error('Error getting order by pickup code:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving the order',
        },
      };
      return res.status(500).json(response);
    }
  });

  // =============================================================================
  // GET /api/orders/:orderId - Get order by ID
  // =============================================================================
  router.get('/:orderId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;

      const order = await orderService.getOrder(orderId);

      if (!order) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Order not found',
          },
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<{ order: OrderResult }> = {
        success: true,
        data: { order },
      };
      return res.json(response);
    } catch (error) {
      console.error('Error getting order:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving the order',
        },
      };
      return res.status(500).json(response);
    }
  });

  // =============================================================================
  // PUT /api/orders/:orderId/status - Update order status
  // =============================================================================
  router.put('/:orderId/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      // Validate status
      if (!status || !VALID_STATUSES.includes(status)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          },
        };
        return res.status(400).json(response);
      }

      const order = await orderService.updateOrderStatus(orderId, status);

      const response: ApiResponse<{ order: OrderResult }> = {
        success: true,
        data: { order },
      };
      return res.json(response);
    } catch (error) {
      if (error instanceof OrderError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        return res.status(statusCode).json(response);
      }
      console.error('Error updating order status:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating the order status',
        },
      };
      return res.status(500).json(response);
    }
  });

  // =============================================================================
  // POST /api/orders/:orderId/cancel - Cancel an order
  // =============================================================================
  router.post('/:orderId/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;

      const order = await orderService.cancelOrder(orderId, reason);

      const response: ApiResponse<{ order: OrderResult }> = {
        success: true,
        data: { order },
      };
      return res.json(response);
    } catch (error) {
      if (error instanceof OrderError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        return res.status(statusCode).json(response);
      }
      console.error('Error cancelling order:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while cancelling the order',
        },
      };
      return res.status(500).json(response);
    }
  });

  // =============================================================================
  // POST /api/orders/:orderId/sync - Sync order status from POS
  // =============================================================================
  router.post('/:orderId/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;

      const order = await orderService.syncOrderStatus(orderId);

      const response: ApiResponse<{ order: OrderResult }> = {
        success: true,
        data: { order },
      };
      return res.json(response);
    } catch (error) {
      if (error instanceof OrderError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        return res.status(statusCode).json(response);
      }
      console.error('Error syncing order status:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while syncing the order status',
        },
      };
      return res.status(500).json(response);
    }
  });

  // =============================================================================
  // GET /api/business/:businessId/orders - Get business orders
  // This route is mounted separately in the main app
  // =============================================================================

  return router;
}

/**
 * Create business orders router (for /api/business/:businessId/orders)
 */
export function createBusinessOrdersRouter(orderService: OrderService): Router {
  const router = Router({ mergeParams: true });

  router.get('/:businessId/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const { status, limit, offset } = req.query;

      // Check authorization - user must own this business
      if (req.user?.businessId !== businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this business',
          },
        };
        return res.status(403).json(response);
      }

      // Parse query params
      const options: {
        status?: OrderStatus[];
        limit?: number;
        offset?: number;
      } = {};

      if (status) {
        const statusArray = typeof status === 'string' ? status.split(',') : [status];
        options.status = statusArray.filter((s): s is OrderStatus =>
          VALID_STATUSES.includes(s as OrderStatus)
        );
      }

      if (limit) {
        options.limit = parseInt(limit as string, 10);
      }

      if (offset) {
        options.offset = parseInt(offset as string, 10);
      }

      const orders = await orderService.getBusinessOrders(businessId, options);

      const response: ApiResponse<{ orders: OrderResult[] }> = {
        success: true,
        data: { orders },
      };
      return res.json(response);
    } catch (error) {
      console.error('Error getting business orders:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving orders',
        },
      };
      return res.status(500).json(response);
    }
  });

  return router;
}
