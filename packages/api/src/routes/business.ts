/**
 * Business routes for multi-tenancy
 * Provides public business config and catalog endpoints
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, AccountState, Business } from '../../generated/prisma';
import { ApiResponse } from '@drink-ux/shared';

/**
 * Business theme configuration
 */
export interface BusinessTheme {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  fontFamily?: string;
  [key: string]: any;
}

/**
 * Catalog summary for quick overview
 */
export interface CatalogSummary {
  categoryCount: number;
  itemCount: number;
}

/**
 * Public business configuration data
 */
export interface BusinessConfigData {
  id: string;
  name: string;
  slug: string;
  accountState: AccountState;
  theme: BusinessTheme | null;
  catalogSummary: CatalogSummary;
}

/**
 * Category with items for catalog response
 */
export interface CategoryWithItems {
  id: string;
  name: string;
  displayOrder: number;
  color: string | null;
  icon: string | null;
  items: CatalogItem[];
}

/**
 * Catalog item (base drink)
 */
export interface CatalogItem {
  id: string;
  name: string;
  basePrice: number;
  temperatureConstraint: string;
  visualColor: string | null;
}

/**
 * Full catalog response data
 */
export interface CatalogData {
  businessId: string;
  categories: CategoryWithItems[];
}

/**
 * Options for business router
 */
export interface BusinessRouterOptions {
  // Reserved for future options
}

/**
 * Account states that are considered accessible for public endpoints
 */
const ACCESSIBLE_STATES: AccountState[] = [
  'ACTIVE',
  'SETUP_COMPLETE',
  'ONBOARDING',
];

/**
 * Creates the business router
 *
 * @param prisma - Prisma client instance
 * @param options - Router options
 */
export function createBusinessRouter(
  prisma: PrismaClient,
  options: BusinessRouterOptions = {}
): Router {
  const router = Router();

  /**
   * GET /api/business/:slug
   * Get business configuration by slug
   */
  router.get('/:slug', async (req: Request, res: Response) => {
    const { slug } = req.params;

    try {
      // Find business by slug (case-sensitive as stored)
      const business = await prisma.business.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              categories: true,
              bases: true,
            },
          },
        },
      });

      // Business not found
      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business '${slug}' not found`,
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check if business is accessible
      if (!ACCESSIBLE_STATES.includes(business.accountState)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business '${slug}' is not currently accessible`,
          },
        };
        res.status(404).json(response);
        return;
      }

      // Build response data (exclude sensitive fields)
      const configData: BusinessConfigData = {
        id: business.id,
        name: business.name,
        slug: business.slug,
        accountState: business.accountState,
        theme: business.theme as BusinessTheme | null,
        catalogSummary: {
          categoryCount: business._count.categories,
          itemCount: business._count.bases,
        },
      };

      const response: ApiResponse<BusinessConfigData> = {
        success: true,
        data: configData,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get business config error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve business configuration',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/business/:slug/catalog
   * Get full catalog for a business
   */
  router.get('/:slug/catalog', async (req: Request, res: Response) => {
    const { slug } = req.params;

    try {
      // Find business by slug
      const business = await prisma.business.findUnique({
        where: { slug },
      });

      // Business not found
      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business '${slug}' not found`,
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check if business is accessible
      if (!ACCESSIBLE_STATES.includes(business.accountState)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business '${slug}' is not currently accessible`,
          },
        };
        res.status(404).json(response);
        return;
      }

      // Get categories with their available items
      const categories = await prisma.category.findMany({
        where: { businessId: business.id },
        orderBy: { displayOrder: 'asc' },
        include: {
          bases: {
            where: { available: true },
            select: {
              id: true,
              name: true,
              basePrice: true,
              temperatureConstraint: true,
              visualColor: true,
            },
          },
        },
      });

      // Transform to response format
      const catalogCategories: CategoryWithItems[] = categories.map((category) => ({
        id: category.id,
        name: category.name,
        displayOrder: category.displayOrder,
        color: category.color,
        icon: category.icon,
        items: category.bases.map((base) => ({
          id: base.id,
          name: base.name,
          basePrice: base.basePrice,
          temperatureConstraint: base.temperatureConstraint,
          visualColor: base.visualColor,
        })),
      }));

      const catalogData: CatalogData = {
        businessId: business.id,
        categories: catalogCategories,
      };

      const response: ApiResponse<CatalogData> = {
        success: true,
        data: catalogData,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get business catalog error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve business catalog',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/business/:slug/catalog/modifiers
   * Get available modifiers for a business
   */
  router.get('/:slug/catalog/modifiers', async (req: Request, res: Response) => {
    const { slug } = req.params;

    try {
      // Find business by slug
      const business = await prisma.business.findUnique({
        where: { slug },
      });

      // Business not found
      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business '${slug}' not found`,
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check if business is accessible
      if (!ACCESSIBLE_STATES.includes(business.accountState)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business '${slug}' is not currently accessible`,
          },
        };
        res.status(404).json(response);
        return;
      }

      // Get available modifiers
      const modifiers = await prisma.modifier.findMany({
        where: {
          businessId: business.id,
          available: true,
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
          available: true,
          visualColor: true,
          visualLayerOrder: true,
          visualAnimationType: true,
        },
      });

      const response: ApiResponse<typeof modifiers> = {
        success: true,
        data: modifiers,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get business modifiers error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve modifiers',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/business/:slug/catalog/presets
   * Get available presets (featured drinks) for a business
   */
  router.get('/:slug/catalog/presets', async (req: Request, res: Response) => {
    const { slug } = req.params;

    try {
      // Find business by slug
      const business = await prisma.business.findUnique({
        where: { slug },
      });

      // Business not found
      if (!business) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business '${slug}' not found`,
          },
        };
        res.status(404).json(response);
        return;
      }

      // Check if business is accessible
      if (!ACCESSIBLE_STATES.includes(business.accountState)) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business '${slug}' is not currently accessible`,
          },
        };
        res.status(404).json(response);
        return;
      }

      // Get available presets with their modifiers
      const presets = await prisma.preset.findMany({
        where: {
          businessId: business.id,
          available: true,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          baseId: true,
          defaultSize: true,
          defaultHot: true,
          price: true,
          available: true,
          imageUrl: true,
          modifiers: {
            select: {
              modifierId: true,
            },
          },
        },
      });

      // Transform to include modifierIds array
      const presetsWithModifierIds = presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        baseId: preset.baseId,
        defaultSize: preset.defaultSize,
        defaultHot: preset.defaultHot,
        price: preset.price,
        available: preset.available,
        imageUrl: preset.imageUrl,
        modifierIds: preset.modifiers.map(m => m.modifierId),
      }));

      const response: ApiResponse<typeof presetsWithModifierIds> = {
        success: true,
        data: presetsWithModifierIds,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get business presets error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve presets',
        },
      };
      res.status(500).json(response);
    }
  });

  return router;
}
