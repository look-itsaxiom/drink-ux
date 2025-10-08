import { Router, Request, Response } from 'express';
import { POSIntegration, POSProvider, ApiResponse } from '@drink-ux/shared';

const router = Router();

// GET POS integration status
router.get('/integration/:businessId', (req: Request, res: Response) => {
  // Mock response - in real implementation, fetch from database
  const mockIntegration: POSIntegration = {
    id: '1',
    businessId: req.params.businessId,
    provider: POSProvider.SQUARE,
    credentials: {},
    config: {
      autoSyncMenu: true,
      syncInterval: 60,
    },
    isActive: true,
  };
  
  const response: ApiResponse<POSIntegration> = {
    success: true,
    data: mockIntegration,
  };
  res.json(response);
});

// POST configure POS integration
router.post('/integration', (req: Request, res: Response) => {
  const integration: POSIntegration = req.body;
  
  // Mock response - in real implementation, save to database
  const response: ApiResponse<POSIntegration> = {
    success: true,
    data: integration,
  };
  res.status(201).json(response);
});

// POST sync menu from POS
router.post('/sync/:businessId', (req: Request, res: Response) => {
  // Mock sync response
  const response: ApiResponse<{ synced: number }> = {
    success: true,
    data: { synced: 15 },
  };
  res.json(response);
});

export const posRoutes = router;
