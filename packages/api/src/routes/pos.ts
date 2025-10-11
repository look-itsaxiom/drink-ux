import { Router, Request, Response } from "express";
import {
  POSProvider,
  ApiResponse,
  POSCredentials,
  POSConfig,
  POSConnectionStatus,
  POSSyncResult,
  POSMenuItem,
  POSOrder,
} from "@drink-ux/shared";
import { posManager } from "../managers/pos.manager";

const router = Router();

/**
 * GET /api/pos/providers
 * Get list of supported POS providers
 */
router.get("/providers", (req: Request, res: Response) => {
  const providers = posManager.getSupportedProviders();
  const response: ApiResponse<POSProvider[]> = {
    success: true,
    data: providers,
  };
  res.json(response);
});

/**
 * GET /api/pos/integration/:companyId
 * Get POS integration for a company
 */
router.get("/integration/:companyId", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const integration = await posManager.getIntegrationByCompanyId(companyId);

    if (!integration) {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "POS integration not found for this company",
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: integration.id,
        businessId: companyId,
        provider: integration.provider as POSProvider,
        credentials: {}, // Don't expose credentials
        config: {},
        isActive: integration.isActive,
      },
    });
  } catch (error) {
    console.error("Error fetching POS integration:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch POS integration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * POST /api/pos/test-connection
 * Test connection to a POS system
 */
router.post("/test-connection", async (req: Request, res: Response) => {
  try {
    const { provider, credentials, config } = req.body as {
      provider: POSProvider;
      credentials: POSCredentials;
      config: POSConfig;
    };

    if (!provider || !credentials || !config) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Provider, credentials, and config are required",
        },
      });
      return;
    }

    const status = await posManager.testConnection(provider, credentials, config);
    const response: ApiResponse<POSConnectionStatus> = {
      success: status.connected,
      data: status,
    };

    res.json(response);
  } catch (error) {
    console.error("Error testing connection:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to test connection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * POST /api/pos/integration
 * Create or update POS integration for a company
 */
router.post("/integration", async (req: Request, res: Response) => {
  try {
    const { companyId, provider, credentials, config } = req.body as {
      companyId: string;
      provider: POSProvider;
      credentials: POSCredentials;
      config: POSConfig;
    };

    if (!companyId || !provider || !credentials || !config) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Company ID, provider, credentials, and config are required",
        },
      });
      return;
    }

    const integration = await posManager.upsertIntegration(
      companyId,
      provider,
      credentials,
      config
    );

    if (!integration) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create or update POS integration",
        },
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        id: integration.id,
        businessId: companyId,
        provider: integration.provider as POSProvider,
        credentials: {}, // Don't expose credentials
        config: {},
        isActive: integration.isActive,
      },
    });
  } catch (error) {
    console.error("Error configuring POS integration:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to configure POS integration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * POST /api/pos/sync/:companyId
 * Sync menu from POS system
 */
router.post("/sync/:companyId", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { provider, credentials, config } = req.body as {
      provider: POSProvider;
      credentials: POSCredentials;
      config: POSConfig;
    };

    if (!provider || !credentials || !config) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Provider, credentials, and config are required",
        },
      });
      return;
    }

    const syncResult = await posManager.syncMenu(
      companyId,
      provider,
      credentials,
      config
    );

    const response: ApiResponse<POSSyncResult> = {
      success: true,
      data: syncResult,
    };
    res.json(response);
  } catch (error) {
    console.error("Error syncing menu:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to sync menu",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * POST /api/pos/menu
 * Fetch menu from POS system
 */
router.post("/menu", async (req: Request, res: Response) => {
  try {
    const { provider, credentials, config } = req.body as {
      provider: POSProvider;
      credentials: POSCredentials;
      config: POSConfig;
    };

    if (!provider || !credentials || !config) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Provider, credentials, and config are required",
        },
      });
      return;
    }

    const menuItems = await posManager.fetchMenu(provider, credentials, config);

    const response: ApiResponse<POSMenuItem[]> = {
      success: true,
      data: menuItems,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch menu",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * POST /api/pos/order
 * Submit order to POS system
 */
router.post("/order", async (req: Request, res: Response) => {
  try {
    const { provider, order, credentials, config } = req.body as {
      provider: POSProvider;
      order: POSOrder;
      credentials: POSCredentials;
      config: POSConfig;
    };

    if (!provider || !order || !credentials || !config) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Provider, order, credentials, and config are required",
        },
      });
      return;
    }

    const result = await posManager.submitOrder(
      provider,
      order,
      credentials,
      config
    );

    const response: ApiResponse<{ orderId: string; status: string }> = {
      success: true,
      data: result,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Error submitting order:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to submit order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * GET /api/pos/order/:orderId/status
 * Get order status from POS system
 */
router.get("/order/:orderId/status", async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { provider, credentials, config } = req.query as {
      provider: POSProvider;
      credentials: string;
      config: string;
    };

    if (!provider || !credentials || !config) {
      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Provider, credentials, and config are required in query parameters",
        },
      });
      return;
    }

    const parsedCredentials: POSCredentials = JSON.parse(credentials);
    const parsedConfig: POSConfig = JSON.parse(config);

    const status = await posManager.getOrderStatus(
      provider,
      orderId,
      parsedCredentials,
      parsedConfig
    );

    const response: ApiResponse<{ status: string; details?: any }> = {
      success: true,
      data: status,
    };
    res.json(response);
  } catch (error) {
    console.error("Error getting order status:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get order status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * DELETE /api/pos/integration/:companyId
 * Deactivate POS integration for a company
 */
router.delete("/integration/:companyId", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    await posManager.deactivateIntegration(companyId);

    res.json({
      success: true,
      data: { message: "POS integration deactivated successfully" },
    });
  } catch (error) {
    console.error("Error deactivating POS integration:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to deactivate POS integration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

export const posRoutes = router;
