import { Router, Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import {
  OnboardingService,
  OnboardingError,
  OnboardingStep,
  OnboardingStatus,
  CatalogPath,
  ReviewSummary,
} from '../services/OnboardingService';
import { requireAuth, AuthenticatedRequest } from '../middleware/session';

/**
 * Status response data
 */
interface StatusResponseData extends OnboardingStatus {}

/**
 * Step completion response data
 */
interface StepResponseData {
  message: string;
  nextStep?: OnboardingStep;
}

/**
 * Review response data
 */
interface ReviewResponseData extends ReviewSummary {}

/**
 * Reset response data
 */
interface ResetResponseData {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
}

/**
 * Back response data
 */
interface BackResponseData {
  currentStep: OnboardingStep;
}

/**
 * Router options
 */
export interface OnboardingRouterOptions {
  /** Business ID (for testing) - normally determined from authenticated user */
  businessId?: string;
}

/**
 * Extended request with business context
 */
interface OnboardingRequest extends AuthenticatedRequest {
  businessId?: string;
}

/**
 * Valid onboarding steps
 */
const VALID_STEPS = Object.values(OnboardingStep);

/**
 * Valid catalog paths
 */
const VALID_PATHS = Object.values(CatalogPath);

/**
 * Creates the onboarding router
 * @param onboardingService - The onboarding service
 * @param options - Optional configuration
 */
export function createOnboardingRouter(
  onboardingService: OnboardingService,
  options: OnboardingRouterOptions = {}
): Router {
  const router = Router();

  // Middleware to require auth and extract business ID
  const requireOnboardingAuth = async (
    req: OnboardingRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // First check authentication
    if (!req.user) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
      res.status(401).json(response);
      return;
    }

    // Get business ID from options (for testing) or would normally get from user's businesses
    req.businessId = options.businessId;

    if (!req.businessId) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NO_BUSINESS',
          message: 'No business associated with this user',
        },
      };
      res.status(400).json(response);
      return;
    }

    // Check if business is in onboarding state
    const status = await onboardingService.getOnboardingStatus(req.businessId);
    if (!status) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_IN_ONBOARDING',
          message: 'Business is not in onboarding state',
        },
      };
      res.status(403).json(response);
      return;
    }

    next();
  };

  /**
   * GET /api/onboarding/status
   * Get current onboarding status
   */
  router.get('/status', requireOnboardingAuth, async (req: OnboardingRequest, res: Response) => {
    try {
      const status = await onboardingService.getOnboardingStatus(req.businessId!);

      if (!status) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_IN_ONBOARDING',
            message: 'Business is not in onboarding state',
          },
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse<StatusResponseData> = {
        success: true,
        data: status,
      };

      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * POST /api/onboarding/step/:step
   * Complete a step in the onboarding process
   */
  router.post(
    '/step/:step',
    requireOnboardingAuth,
    async (req: OnboardingRequest, res: Response) => {
      const { step } = req.params;
      const stepData = req.body;

      // Validate step
      if (!VALID_STEPS.includes(step as OnboardingStep)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_STEP',
            message: `Invalid step: ${step}. Valid steps are: ${VALID_STEPS.join(', ')}`,
          },
        };
        res.status(400).json(response);
        return;
      }

      try {
        await onboardingService.completeStep(
          req.businessId!,
          step as OnboardingStep,
          stepData
        );

        // Get updated status
        const status = await onboardingService.getOnboardingStatus(req.businessId!);

        const response: ApiResponse<StepResponseData> = {
          success: true,
          data: {
            message: `Step ${step} completed successfully`,
            nextStep: status?.currentStep,
          },
        };

        res.status(200).json(response);
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  /**
   * POST /api/onboarding/path
   * Select catalog setup path (shortcut for PATH_SELECTION step)
   */
  router.post('/path', requireOnboardingAuth, async (req: OnboardingRequest, res: Response) => {
    const { path } = req.body;

    // Validate path
    if (!path) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'PATH_REQUIRED',
          message: 'Catalog path is required',
        },
      };
      res.status(400).json(response);
      return;
    }

    if (!VALID_PATHS.includes(path as CatalogPath)) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: `Invalid path: ${path}. Valid paths are: ${VALID_PATHS.join(', ')}`,
        },
      };
      res.status(400).json(response);
      return;
    }

    try {
      await onboardingService.completeStep(
        req.businessId!,
        OnboardingStep.PATH_SELECTION,
        { path }
      );

      // Get updated status
      const status = await onboardingService.getOnboardingStatus(req.businessId!);

      const response: ApiResponse<StepResponseData> = {
        success: true,
        data: {
          message: `Path ${path} selected successfully`,
          nextStep: status?.currentStep,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * GET /api/onboarding/review
   * Get review summary for the final step
   */
  router.get('/review', requireOnboardingAuth, async (req: OnboardingRequest, res: Response) => {
    try {
      const summary = await onboardingService.getReviewSummary(req.businessId!);

      const response: ApiResponse<ReviewResponseData> = {
        success: true,
        data: summary,
      };

      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * POST /api/onboarding/complete
   * Complete the onboarding process
   */
  router.post(
    '/complete',
    requireOnboardingAuth,
    async (req: OnboardingRequest, res: Response) => {
      const { triggerSync } = req.body;

      try {
        await onboardingService.completeStep(req.businessId!, OnboardingStep.REVIEW, {
          triggerSync,
        });

        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: {
            message: 'Onboarding complete! Your business is ready.',
          },
        };

        res.status(200).json(response);
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  /**
   * POST /api/onboarding/back
   * Go back to previous step
   */
  router.post('/back', requireOnboardingAuth, async (req: OnboardingRequest, res: Response) => {
    try {
      await onboardingService.goBack(req.businessId!);

      // Get updated status
      const status = await onboardingService.getOnboardingStatus(req.businessId!);

      const response: ApiResponse<BackResponseData> = {
        success: true,
        data: {
          currentStep: status!.currentStep,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  });

  /**
   * POST /api/onboarding/reset
   * Reset onboarding to start over
   */
  router.post('/reset', requireOnboardingAuth, async (req: OnboardingRequest, res: Response) => {
    try {
      await onboardingService.resetOnboarding(req.businessId!);

      // Get updated status
      const status = await onboardingService.getOnboardingStatus(req.businessId!);

      const response: ApiResponse<ResetResponseData> = {
        success: true,
        data: {
          currentStep: status!.currentStep,
          completedSteps: status!.completedSteps,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      handleError(res, error);
    }
  });

  return router;
}

/**
 * Handle errors and send appropriate response
 */
function handleError(res: Response, error: unknown): void {
  if (error instanceof OnboardingError) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
    res.status(400).json(response);
    return;
  }

  console.error('Onboarding error:', error);
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  res.status(500).json(response);
}
