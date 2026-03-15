import { Router, Response } from 'express';
import { ApiResponse } from '@drink-ux/shared';
import { CatalogService, CatalogError } from '../services/CatalogService';
import { requireAuth, AuthenticatedRequest } from '../middleware/session';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

/**
 * Options for the catalog router
 */
export interface CatalogRouterOptions {
  /** Disable rate limiting (for tests) */
  disableRateLimit?: boolean;
}

/**
 * Helper to check if user owns the business
 */
async function verifyBusinessOwnership(
  req: AuthenticatedRequest,
  businessId: string
): Promise<boolean> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });
  return business?.ownerId === req.user?.id;
}

/**
 * Helper to get business ID from entity (category, base, modifier, preset)
 */
async function getEntityBusinessId(
  entityType: 'category' | 'base' | 'modifier' | 'preset',
  entityId: string
): Promise<string | null> {
  switch (entityType) {
    case 'category': {
      const category = await prisma.category.findUnique({
        where: { id: entityId },
        select: { businessId: true },
      });
      return category?.businessId ?? null;
    }
    case 'base': {
      const base = await prisma.base.findUnique({
        where: { id: entityId },
        select: { businessId: true },
      });
      return base?.businessId ?? null;
    }
    case 'modifier': {
      const modifier = await prisma.modifier.findUnique({
        where: { id: entityId },
        select: { businessId: true },
      });
      return modifier?.businessId ?? null;
    }
    case 'preset': {
      const preset = await prisma.preset.findUnique({
        where: { id: entityId },
        select: { businessId: true },
      });
      return preset?.businessId ?? null;
    }
  }
}

/**
 * Creates the catalog router
 * @param catalogService - The catalog service
 * @param options - Optional configuration
 */
export function createCatalogRouter(
  catalogService: CatalogService,
  options: CatalogRouterOptions = {}
): Router {
  const router = Router();

  // =============================================================================
  // CATEGORY ROUTES
  // =============================================================================

  /**
   * POST /api/catalog/categories
   * Create a new category
   */
  router.post('/categories', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { businessId, name, displayOrder, color, icon } = req.body;

    try {
      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      const category = await catalogService.createCategory({
        businessId,
        name,
        displayOrder,
        color,
        icon,
      });

      const response: ApiResponse<typeof category> = {
        success: true,
        data: category,
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
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

      console.error('Create category error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/catalog/categories
   * List categories for a business
   */
  router.get('/categories', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { businessId } = req.query;

    try {
      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId as string)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      const categories = await catalogService.listCategories(businessId as string);

      const response: ApiResponse<typeof categories> = {
        success: true,
        data: categories,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('List categories error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/catalog/categories/:id
   * Get a category by ID
   */
  router.get('/categories/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      const category = await catalogService.getCategory(id);

      if (!category) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, category.businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this category',
          },
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse<typeof category> = {
        success: true,
        data: category,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get category error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * PUT /api/catalog/categories/:id
   * Update a category
   */
  router.put('/categories/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, displayOrder, color, icon } = req.body;

    try {
      // Check category exists and get business ID
      const businessId = await getEntityBusinessId('category', id);

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this category',
          },
        };
        res.status(403).json(response);
        return;
      }

      const category = await catalogService.updateCategory(id, {
        name,
        displayOrder,
        color,
        icon,
      });

      const response: ApiResponse<typeof category> = {
        success: true,
        data: category,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(statusCode).json(response);
        return;
      }

      console.error('Update category error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * DELETE /api/catalog/categories/:id
   * Delete a category
   */
  router.delete('/categories/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      // Check category exists and get business ID
      const businessId = await getEntityBusinessId('category', id);

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this category',
          },
        };
        res.status(403).json(response);
        return;
      }

      await catalogService.deleteCategory(id);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Category deleted successfully',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(statusCode).json(response);
        return;
      }

      console.error('Delete category error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/catalog/categories/reorder
   * Reorder categories
   */
  router.post('/categories/reorder', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { businessId, categoryIds } = req.body;

    try {
      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      await catalogService.reorderCategories(businessId, categoryIds);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Categories reordered successfully',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
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

      console.error('Reorder categories error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  // =============================================================================
  // BASE ROUTES
  // =============================================================================

  /**
   * POST /api/catalog/bases
   * Create a new base
   */
  router.post('/bases', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const {
      businessId,
      categoryId,
      name,
      priceCents,
      available,
      visualColor,
      visualOpacity,
    } = req.body;

    try {
      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      const base = await catalogService.createBase({
        businessId,
        categoryId,
        name,
        priceCents,
        available,
        visualColor,
        visualOpacity,
      });

      const response: ApiResponse<typeof base> = {
        success: true,
        data: base,
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
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

      console.error('Create base error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/catalog/bases
   * List bases
   */
  router.get('/bases', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { businessId, categoryId, available } = req.query;

    try {
      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId as string)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      const bases = await catalogService.listBases({
        businessId: businessId as string,
        categoryId: categoryId as string | undefined,
        available: available === 'true' ? true : available === 'false' ? false : undefined,
      });

      const response: ApiResponse<typeof bases> = {
        success: true,
        data: bases,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('List bases error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/catalog/bases/:id
   * Get a base by ID
   */
  router.get('/bases/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      const base = await catalogService.getBase(id);

      if (!base) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Base not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, base.businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this base',
          },
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse<typeof base> = {
        success: true,
        data: base,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get base error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * PUT /api/catalog/bases/:id
   * Update a base
   */
  router.put('/bases/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const {
      name,
      priceCents,
      available,
      visualColor,
      visualOpacity,
      categoryId,
    } = req.body;

    try {
      // Check base exists and get business ID
      const businessId = await getEntityBusinessId('base', id);

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Base not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this base',
          },
        };
        res.status(403).json(response);
        return;
      }

      const base = await catalogService.updateBase(id, {
        name,
        priceCents,
        available,
        visualColor,
        visualOpacity,
        categoryId,
      });

      const response: ApiResponse<typeof base> = {
        success: true,
        data: base,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(statusCode).json(response);
        return;
      }

      console.error('Update base error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * DELETE /api/catalog/bases/:id
   * Delete a base (soft delete)
   */
  router.delete('/bases/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      // Check base exists and get business ID
      const businessId = await getEntityBusinessId('base', id);

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Base not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this base',
          },
        };
        res.status(403).json(response);
        return;
      }

      await catalogService.deleteBase(id);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Base deleted successfully',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(statusCode).json(response);
        return;
      }

      console.error('Delete base error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  // =============================================================================
  // MODIFIER ROUTES
  // =============================================================================

  /**
   * POST /api/catalog/modifiers
   * Create a new modifier
   */
  router.post('/modifiers', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const {
      businessId,
      name,
      modifierGroupId,
      priceCents,
      available,
      visualColor,
      visualLayerOrder,
      visualAnimationType,
    } = req.body;

    try {
      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      const modifier = await catalogService.createModifier({
        businessId,
        name,
        modifierGroupId,
        priceCents,
        available,
        visualColor,
        visualLayerOrder,
        visualAnimationType,
      });

      const response: ApiResponse<typeof modifier> = {
        success: true,
        data: modifier,
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
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

      console.error('Create modifier error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/catalog/modifiers
   * List modifiers
   */
  router.get('/modifiers', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { businessId, modifierGroupId, available } = req.query;

    try {
      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId as string)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      const modifiers = await catalogService.listModifiers({
        businessId: businessId as string,
        modifierGroupId: modifierGroupId as string | undefined,
        available: available === 'true' ? true : available === 'false' ? false : undefined,
      });

      const response: ApiResponse<typeof modifiers> = {
        success: true,
        data: modifiers,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('List modifiers error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/catalog/modifiers/:id
   * Get a modifier by ID
   */
  router.get('/modifiers/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      const modifier = await catalogService.getModifier(id);

      if (!modifier) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Modifier not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, modifier.businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this modifier',
          },
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse<typeof modifier> = {
        success: true,
        data: modifier,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get modifier error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * PUT /api/catalog/modifiers/:id
   * Update a modifier
   */
  router.put('/modifiers/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const {
      name,
      priceCents,
      available,
      visualColor,
      visualLayerOrder,
      visualAnimationType,
    } = req.body;

    try {
      // Check modifier exists and get business ID
      const businessId = await getEntityBusinessId('modifier', id);

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Modifier not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this modifier',
          },
        };
        res.status(403).json(response);
        return;
      }

      const modifier = await catalogService.updateModifier(id, {
        name,
        priceCents,
        available,
        visualColor,
        visualLayerOrder,
        visualAnimationType,
      });

      const response: ApiResponse<typeof modifier> = {
        success: true,
        data: modifier,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(statusCode).json(response);
        return;
      }

      console.error('Update modifier error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * DELETE /api/catalog/modifiers/:id
   * Delete a modifier (soft delete)
   */
  router.delete('/modifiers/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      // Check modifier exists and get business ID
      const businessId = await getEntityBusinessId('modifier', id);

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Modifier not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this modifier',
          },
        };
        res.status(403).json(response);
        return;
      }

      await catalogService.deleteModifier(id);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Modifier deleted successfully',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(statusCode).json(response);
        return;
      }

      console.error('Delete modifier error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  // =============================================================================
  // PRESET ROUTES
  // =============================================================================

  /**
   * GET /api/catalog/presets/suggested-price
   * Calculate suggested price from components
   * NOTE: This must be defined BEFORE /api/catalog/presets/:id
   */
  router.get('/presets/suggested-price', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { baseId, modifierIds } = req.query;

    try {
      // Get base to verify ownership
      const base = await catalogService.getBase(baseId as string);

      if (!base) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Base not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, base.businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this base',
          },
        };
        res.status(403).json(response);
        return;
      }

      const modifierIdArray = modifierIds
        ? (modifierIds as string).split(',').filter(Boolean)
        : [];

      const suggestedPrice = await catalogService.calculateSuggestedPrice(
        baseId as string,
        modifierIdArray
      );

      const response: ApiResponse<{ suggestedPrice: number }> = {
        success: true,
        data: { suggestedPrice },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
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

      console.error('Calculate suggested price error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /api/catalog/presets
   * Create a new preset
   */
  router.post('/presets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const {
      businessId,
      name,
      baseId,
      modifierIds,
      priceCents,
      defaultVariationId,
      defaultHot,
      imageUrl,
    } = req.body;

    try {
      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      const preset = await catalogService.createPreset({
        businessId,
        name,
        baseId,
        modifierIds,
        priceCents,
        defaultVariationId,
        defaultHot,
        imageUrl,
      });

      const response: ApiResponse<typeof preset> = {
        success: true,
        data: preset,
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
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

      console.error('Create preset error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/catalog/presets
   * List presets
   */
  router.get('/presets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { businessId, categoryId, available } = req.query;

    try {
      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId as string)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this business',
          },
        };
        res.status(403).json(response);
        return;
      }

      const presets = await catalogService.listPresets({
        businessId: businessId as string,
        categoryId: categoryId as string | undefined,
        available: available === 'true' ? true : available === 'false' ? false : undefined,
      });

      const response: ApiResponse<typeof presets> = {
        success: true,
        data: presets,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('List presets error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/catalog/presets/:id
   * Get a preset by ID
   */
  router.get('/presets/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { includeModifiers } = req.query;

    try {
      let preset;

      if (includeModifiers === 'true') {
        preset = await catalogService.getPresetWithModifiers(id);
      } else {
        preset = await catalogService.getPreset(id);
      }

      if (!preset) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Preset not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, preset.businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this preset',
          },
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse<typeof preset> = {
        success: true,
        data: preset,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get preset error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * PUT /api/catalog/presets/:id
   * Update a preset
   */
  router.put('/presets/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const {
      name,
      baseId,
      modifierIds,
      priceCents,
      defaultVariationId,
      defaultHot,
      imageUrl,
      available,
    } = req.body;

    try {
      // Check preset exists and get business ID
      const businessId = await getEntityBusinessId('preset', id);

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Preset not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to update this preset',
          },
        };
        res.status(403).json(response);
        return;
      }

      const preset = await catalogService.updatePreset(id, {
        name,
        baseId,
        modifierIds,
        priceCents,
        defaultVariationId,
        defaultHot,
        imageUrl,
        available,
      });

      const response: ApiResponse<typeof preset> = {
        success: true,
        data: preset,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(statusCode).json(response);
        return;
      }

      console.error('Update preset error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * DELETE /api/catalog/presets/:id
   * Delete a preset (soft delete)
   */
  router.delete('/presets/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    try {
      // Check preset exists and get business ID
      const businessId = await getEntityBusinessId('preset', id);

      if (!businessId) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Preset not found',
          },
        };
        res.status(404).json(response);
        return;
      }

      // Verify business ownership
      if (!await verifyBusinessOwnership(req, businessId)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this preset',
          },
        };
        res.status(403).json(response);
        return;
      }

      await catalogService.deletePreset(id);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Preset deleted successfully',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof CatalogError) {
        const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
        res.status(statusCode).json(response);
        return;
      }

      console.error('Delete preset error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
