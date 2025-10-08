import { Router, Request, Response } from 'express';
import { Order, OrderStatus, ApiResponse } from '@drink-ux/shared';

const router = Router();

// Mock data
const mockOrders: Order[] = [];

// GET all orders
router.get('/', (req: Request, res: Response) => {
  const response: ApiResponse<Order[]> = {
    success: true,
    data: mockOrders,
  };
  res.json(response);
});

// POST create order
router.post('/', (req: Request, res: Response) => {
  const newOrder: Order = {
    id: Date.now().toString(),
    items: req.body.items || [],
    subtotal: req.body.subtotal || 0,
    tax: req.body.tax || 0,
    total: req.body.total || 0,
    status: OrderStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockOrders.push(newOrder);
  
  const response: ApiResponse<Order> = {
    success: true,
    data: newOrder,
  };
  res.status(201).json(response);
});

export const orderRoutes = router;
