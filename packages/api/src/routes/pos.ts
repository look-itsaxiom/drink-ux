import { Router, Request, Response } from 'express';
import { ApiResponse, POSProvider } from '@drink-ux/shared';
import { SquareAdapter, TokenResult } from '../adapters/pos';
import prisma from '../database';
import { OnboardingService } from '../services/OnboardingService';
import { MockPOSAdapter } from '../adapters/pos/MockPOSAdapter';
import { CatalogTransformService, CatalogTransformResult, AIProvider } from '../services/CatalogTransformService';

// Create services
const posAdapter = new MockPOSAdapter();
const onboardingService = new OnboardingService(prisma, posAdapter);

// Admin frontend URL for redirects
const ADMIN_FRONTEND_URL = process.env.ADMIN_FRONTEND_URL || 'http://localhost:3002';

export const posRouter = Router();

/**
 * GET /api/pos/providers
 * Returns list of supported POS providers
 */
posRouter.get('/providers', (_req: Request, res: Response) => {
  const response: ApiResponse<{ providers: string[] }> = {
    success: true,
    data: {
      providers: Object.values(POSProvider).map(p => p.toUpperCase()),
    },
  };
  res.json(response);
});

/**
 * GET /api/pos/oauth/authorize
 * Initiates OAuth flow with Square
 * Query params: businessId
 * Returns: authorizationUrl, state
 */
posRouter.get('/oauth/authorize', (req: Request, res: Response) => {
  const { businessId } = req.query;

  if (!businessId || typeof businessId !== 'string') {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_BUSINESS_ID',
        message: 'businessId query parameter is required',
      },
    };
    res.status(400).json(response);
    return;
  }

  const adapter = new SquareAdapter();

  // Create state that includes businessId for later retrieval
  const state = businessId;

  const authorizationUrl = adapter.getAuthorizationUrl(state);

  const response: ApiResponse<{ authorizationUrl: string; state: string }> = {
    success: true,
    data: {
      authorizationUrl,
      state,
    },
  };
  res.json(response);
});

/**
 * GET /api/pos/oauth/callback
 * Handles OAuth callback from Square
 * Query params: code, state OR error, error_description, state
 * Redirects to admin frontend with success/error status
 */
posRouter.get('/oauth/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;
  const businessId = state as string;

  // Handle error case (user denied access)
  if (error) {
    const errorMsg = encodeURIComponent(
      (error_description as string) || (error as string) || 'OAuth authorization failed'
    );
    // Redirect to admin frontend with error
    res.redirect(`${ADMIN_FRONTEND_URL}/onboarding?pos_error=${errorMsg}`);
    return;
  }

  if (!code || typeof code !== 'string') {
    res.redirect(`${ADMIN_FRONTEND_URL}/onboarding?pos_error=missing_code`);
    return;
  }

  if (!state || typeof state !== 'string') {
    res.redirect(`${ADMIN_FRONTEND_URL}/onboarding?pos_error=missing_state`);
    return;
  }

  try {
    const adapter = new SquareAdapter();
    const tokens: TokenResult = await adapter.exchangeCodeForTokens(code);

    // Store the tokens using OnboardingService
    await onboardingService.storePOSCredentials(businessId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      merchantId: tokens.merchantId,
      expiresAt: tokens.expiresAt,
    });

    // Redirect to admin frontend with success
    res.redirect(`${ADMIN_FRONTEND_URL}/onboarding?pos_connected=true&merchant_id=${tokens.merchantId}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('OAuth token exchange failed:', errorMessage);
    const errorMsg = encodeURIComponent(errorMessage);
    res.redirect(`${ADMIN_FRONTEND_URL}/onboarding?pos_error=${errorMsg}`);
  }
});

/**
 * GET /api/pos/oauth/status
 * Check OAuth configuration status
 */
posRouter.get('/oauth/status', (_req: Request, res: Response) => {
  const adapter = new SquareAdapter();
  const isConfigured = adapter.isOAuthConfigured();

  const response: ApiResponse<{ configured: boolean; environment: string }> = {
    success: true,
    data: {
      configured: isConfigured,
      environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    },
  };
  res.json(response);
});

const importCatalogForBusiness = async (businessId: string, res: Response) => {
  try {
    // Get business to check POS connection
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: `Business ${businessId} not found`,
        },
      };
      res.status(404).json(response);
      return;
    }

    if (!business.posAccessToken || !business.posMerchantId) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'POS_NOT_CONNECTED',
          message: 'Business has no POS connection. Please connect Square first.',
        },
      };
      res.status(400).json(response);
      return;
    }

    // Use SquareAdapter to import catalog
    const squareAdapter = new SquareAdapter();

    // Decrypt and set credentials
    const { decryptToken } = await import('../utils/encryption');
    const ENCRYPTION_KEY = process.env.POS_TOKEN_ENCRYPTION_KEY || 'test-key-must-be-32-chars-long!!';

    squareAdapter.setCredentials({
      accessToken: decryptToken(business.posAccessToken, ENCRYPTION_KEY),
      refreshToken: business.posRefreshToken ? decryptToken(business.posRefreshToken, ENCRYPTION_KEY) : '',
      merchantId: business.posMerchantId,
      locationId: business.posLocationId || undefined,
      expiresAt: new Date(Date.now() + 3600000),
    });

    // Import raw catalog from Square
    const rawCatalog = await squareAdapter.importCatalog();

    // Return the raw catalog data for transformation
    const response: ApiResponse<{
      rawCatalog: typeof rawCatalog;
      summary: {
        categories: number;
        items: number;
        modifiers: number;
      };
    }> = {
      success: true,
      data: {
        rawCatalog,
        summary: {
          categories: rawCatalog.categories.length,
          items: rawCatalog.items.length,
          modifiers: rawCatalog.modifiers.length,
        },
      },
    };
    res.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Catalog import failed:', errorMessage);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'IMPORT_FAILED',
        message: errorMessage,
      },
    };
    res.status(500).json(response);
  }
};

/**
 * GET /api/pos/import-catalog
 * Read-only fetch of catalog from POS system
 * Query: businessId
 */
posRouter.get('/import-catalog', async (req: Request, res: Response) => {
  const { businessId } = req.query;

  if (!businessId || typeof businessId !== 'string') {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_BUSINESS_ID',
        message: 'businessId query parameter is required',
      },
    };
    res.status(400).json(response);
    return;
  }

  await importCatalogForBusiness(businessId, res);
});

/**
 * POST /api/pos/import-catalog
 * Import catalog from POS system
 * Body: { businessId: string }
 */
posRouter.post('/import-catalog', async (req: Request, res: Response) => {
  const { businessId } = req.body;

  if (!businessId || typeof businessId !== 'string') {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_BUSINESS_ID',
        message: 'businessId is required in request body',
      },
    };
    res.status(400).json(response);
    return;
  }

  await importCatalogForBusiness(businessId, res);
});

/**
 * POST /api/pos/transform-catalog
 * Use AI to transform raw POS catalog into drink-ux format
 * Body: { rawCatalog: RawCatalogData }
 */
posRouter.post('/transform-catalog', async (req: Request, res: Response) => {
  const { rawCatalog } = req.body;

  if (!rawCatalog) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_CATALOG',
        message: 'rawCatalog is required in request body',
      },
    };
    res.status(400).json(response);
    return;
  }

  try {
    const transformService = new CatalogTransformService();

    // Check if AI is available and which provider
    const aiPowered = transformService.isAvailable();
    const provider = transformService.getProvider();

    // Transform the catalog
    const result = await transformService.transform(rawCatalog);

    const response: ApiResponse<{
      suggestions: CatalogTransformResult;
      aiPowered: boolean;
      provider: string;
    }> = {
      success: true,
      data: {
        suggestions: result,
        aiPowered,
        provider: result.provider || provider,
      },
    };
    res.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Catalog transformation failed:', errorMessage);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'TRANSFORM_FAILED',
        message: errorMessage,
      },
    };
    res.status(500).json(response);
  }
});
