import { Router, Request, Response } from 'express';
import { POSIntegration, POSProvider, ApiResponse, POSOrder } from '@drink-ux/shared';
import { posIntegrationManager } from '../managers/posIntegration.manager';

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

// POST test POS connection
router.post('/integration/test', async (req: Request, res: Response) => {
  try {
    const integration: POSIntegration = req.body;
    const result = await posIntegrationManager.testConnection(integration);
    
    const response: ApiResponse<typeof result> = {
      success: result.success,
      data: result,
      error: result.error ? { code: 'CONNECTION_ERROR', message: result.error } : undefined,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'TEST_CONNECTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    res.status(500).json(response);
  }
});

// POST sync menu from POS
router.post('/sync/:businessId', async (req: Request, res: Response) => {
  try {
    // Mock integration - in real implementation, fetch from database
    const mockIntegration: POSIntegration = {
      id: '1',
      businessId: req.params.businessId,
      provider: POSProvider.SQUARE,
      credentials: req.body.credentials || {},
      config: req.body.config || {
        autoSyncMenu: true,
        syncInterval: 60,
      },
      isActive: true,
    };

    const result = await posIntegrationManager.syncMenu(mockIntegration);
    
    const response: ApiResponse<{ synced: number; products?: any[] }> = {
      success: result.success,
      data: { 
        synced: result.productsCount,
        products: result.products,
      },
      error: result.error ? { code: 'SYNC_ERROR', message: result.error } : undefined,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SYNC_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    res.status(500).json(response);
  }
});

// POST submit order to POS
router.post('/order/:businessId', async (req: Request, res: Response) => {
  try {
    const order: POSOrder = req.body.order;
    
    // Mock integration - in real implementation, fetch from database
    const mockIntegration: POSIntegration = {
      id: '1',
      businessId: req.params.businessId,
      provider: POSProvider.SQUARE,
      credentials: req.body.credentials || {},
      config: req.body.config || {},
      isActive: true,
    };

    const result = await posIntegrationManager.submitOrder(mockIntegration, order);
    
    const response: ApiResponse<typeof result> = {
      success: result.success,
      data: result,
      error: result.error ? { code: 'ORDER_SUBMISSION_ERROR', message: result.error } : undefined,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'ORDER_SUBMISSION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    res.status(500).json(response);
  }
});

// GET supported POS providers
router.get('/providers', (req: Request, res: Response) => {
  const providers = posIntegrationManager.getSupportedProviders();
  const response: ApiResponse<{ providers: string[] }> = {
    success: true,
    data: { providers },
  };
  res.json(response);
});

export const posRoutes = router;
