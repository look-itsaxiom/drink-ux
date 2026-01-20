/**
 * Business Service
 * Handles fetching business configuration data by subdomain
 */

import { AccountState, BusinessTheme } from '@drink-ux/shared';
import { apiClient } from './api';

/**
 * Catalog summary for quick overview
 */
export interface CatalogSummary {
  categoryCount: number;
  itemCount: number;
}

/**
 * Public business configuration data
 * Matches the API response from GET /api/business/:slug
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
 * Reserved subdomains that should not be treated as business slugs
 */
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app'];

/**
 * Get the subdomain/business slug from the current URL
 * - On localhost, uses ?business=<slug> query parameter
 * - On production, extracts subdomain from hostname
 *
 * @returns The business slug or null if not found
 */
export function getSubdomain(): string | null {
  const hostname = window.location.hostname;

  // Handle localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const params = new URLSearchParams(window.location.search);
    return params.get('business');
  }

  // Extract subdomain from full domain
  const parts = hostname.split('.');

  // Need at least 3 parts for a subdomain (subdomain.domain.tld)
  if (parts.length >= 3) {
    const subdomain = parts[0];

    // Filter out reserved subdomains
    if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      return null;
    }

    return subdomain;
  }

  // No subdomain found
  return null;
}

/**
 * Fetch business configuration by subdomain/slug
 *
 * @param subdomain - The business slug (subdomain)
 * @returns The business configuration data
 * @throws ApiClientError if business not found or other errors
 */
export async function getBusinessBySubdomain(
  subdomain: string
): Promise<BusinessConfigData> {
  return apiClient.get<BusinessConfigData>(`/api/business/${subdomain}`);
}

/**
 * Check if a business is accessible for ordering
 *
 * @param accountState - The business account state
 * @returns True if business can accept orders
 */
export function isBusinessAccessible(accountState: AccountState): boolean {
  return [
    AccountState.ACTIVE,
    AccountState.SETUP_COMPLETE,
    AccountState.ONBOARDING,
  ].includes(accountState);
}

export default {
  getSubdomain,
  getBusinessBySubdomain,
  isBusinessAccessible,
};
