import { Router, Request, Response } from 'express';
import { ApiResponse, POSProvider } from '@drink-ux/shared';
import { SquareAdapter, TokenResult } from '../adapters/pos';

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
 * Returns: merchantId, businessId
 */
posRouter.get('/oauth/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  // Handle error case (user denied access)
  if (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'OAUTH_ERROR',
        message: (error_description as string) || (error as string) || 'OAuth authorization failed',
      },
    };
    res.status(400).json(response);
    return;
  }

  if (!code || typeof code !== 'string') {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_CODE',
        message: 'code query parameter is required',
      },
    };
    res.status(400).json(response);
    return;
  }

  if (!state || typeof state !== 'string') {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'MISSING_STATE',
        message: 'state query parameter is required',
      },
    };
    res.status(400).json(response);
    return;
  }

  try {
    const adapter = new SquareAdapter();
    const tokens: TokenResult = await adapter.exchangeCodeForTokens(code);

    // In a real implementation, we would:
    // 1. Look up the business by state (businessId)
    // 2. Encrypt and store the tokens in the database
    // 3. Update the business's POS connection status

    const response: ApiResponse<{ merchantId: string; businessId: string }> = {
      success: true,
      data: {
        merchantId: tokens.merchantId,
        businessId: state, // The state contains the businessId
      },
    };
    res.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'TOKEN_EXCHANGE_FAILED',
        message: errorMessage,
      },
    };
    res.status(errorMessage.includes('expired') ? 400 : 500).json(response);
  }
});
