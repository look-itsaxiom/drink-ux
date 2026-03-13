/**
 * Tenant middleware for multi-tenancy support
 * Extracts tenant from subdomain and attaches business to request
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, AccountState, Business } from '../../generated/prisma';
import { ApiResponse } from '@drink-ux/shared';
import { parseHostForTenant } from '../utils/subdomain';

/**
 * Business data attached to tenant requests
 * Contains only publicly safe fields
 */
export interface TenantBusiness {
  id: string;
  name: string;
  slug: string;
  accountState: AccountState;
  theme: Record<string, unknown> | null;
}

/**
 * Extended Request type with tenant property
 */
export interface TenantRequest extends Request {
  tenant?: TenantBusiness;
  isMainDomain?: boolean;
}

/**
 * Options for tenant middleware
 */
export interface TenantMiddlewareOptions {
  /**
   * Paths that should skip tenant resolution
   * Useful for health checks, public APIs, etc.
   */
  skipPaths?: string[];

  /**
   * Allow requests from main domain without tenant
   * When true, requests without subdomain will continue to next middleware
   * When false (default), requests without subdomain will get 404 if a subdomain pattern is detected
   */
  allowMainDomain?: boolean;
}

/**
 * Account states that are considered accessible for storefront
 */
const ACCESSIBLE_STATES: AccountState[] = [
  'ACTIVE',
  'SETUP_COMPLETE',
  'ONBOARDING',
];

/**
 * Transforms a Prisma Business to TenantBusiness
 */
function toTenantBusiness(business: Business): TenantBusiness {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    accountState: business.accountState,
    theme: business.theme as Record<string, unknown> | null,
  };
}

/**
 * Creates tenant middleware that extracts business from subdomain
 *
 * @param prisma - Prisma client instance
 * @param options - Middleware options
 */
export function tenantMiddleware(
  prisma: PrismaClient,
  options: TenantMiddlewareOptions = {}
) {
  const { skipPaths = [], allowMainDomain = false } = options;

  return async (
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if this path should skip tenant resolution
      const shouldSkip = skipPaths.some((path) =>
        req.path.startsWith(path)
      );

      if (shouldSkip) {
        next();
        return;
      }

      // Get hostname from request
      const hostname = req.hostname || req.get('host') || '';

      // Parse host for tenant information
      const parseResult = parseHostForTenant(hostname);

      // Handle main domain (no subdomain)
      if (parseResult.isMainDomain) {
        req.isMainDomain = true;
        req.tenant = undefined;

        if (allowMainDomain) {
          next();
          return;
        }

        // For allowMainDomain = false, we still continue for main domain
        // Only subdomain requests need tenant resolution
        next();
        return;
      }

      // Handle invalid hostnames (IP addresses, etc.)
      if (!parseResult.isValid && !parseResult.slug) {
        // Treat as main domain for invalid hostnames
        req.isMainDomain = true;
        req.tenant = undefined;
        next();
        return;
      }

      // If we have a slug, look up the business
      if (parseResult.slug) {
        const business = await prisma.business.findUnique({
          where: { slug: parseResult.slug },
        });

        // Business not found
        if (!business) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'TENANT_NOT_FOUND',
              message: `Business '${parseResult.slug}' not found`,
            },
          };
          res.status(404).json(response);
          return;
        }

        // Check if business is in accessible state
        if (!ACCESSIBLE_STATES.includes(business.accountState)) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: 'TENANT_NOT_FOUND',
              message: `Business '${parseResult.slug}' is not currently accessible`,
            },
          };
          res.status(404).json(response);
          return;
        }

        // Attach tenant to request
        req.tenant = toTenantBusiness(business);
        req.isMainDomain = false;
        next();
        return;
      }

      // Fallback - no tenant found
      req.tenant = undefined;
      req.isMainDomain = true;
      next();
    } catch (error) {
      console.error('Tenant middleware error:', error);
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to resolve tenant',
        },
      };
      res.status(500).json(response);
    }
  };
}

/**
 * Middleware that requires a tenant to be present
 * Use after tenantMiddleware to enforce tenant requirement
 */
export function requireTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'This endpoint requires a valid business subdomain',
      },
    };
    res.status(400).json(response);
    return;
  }

  next();
}

/**
 * Middleware that requires specific account states
 * Use after tenantMiddleware
 */
export function requireAccountState(...states: AccountState[]) {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'TENANT_REQUIRED',
          message: 'This endpoint requires a valid business subdomain',
        },
      };
      res.status(400).json(response);
      return;
    }

    if (!states.includes(req.tenant.accountState)) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'ACCOUNT_STATE_INVALID',
          message: `This action requires account to be in one of: ${states.join(', ')}`,
        },
      };
      res.status(403).json(response);
      return;
    }

    next();
  };
}
