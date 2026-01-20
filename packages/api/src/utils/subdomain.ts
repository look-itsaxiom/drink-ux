/**
 * Subdomain parsing utilities for multi-tenancy
 * Extract tenant slug from request hostname
 */

/**
 * Reserved subdomains that cannot be used as business slugs
 */
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'ftp',
  'smtp',
  'pop',
  'imap',
  'cdn',
  'static',
  'assets',
  'images',
  'docs',
  'help',
  'support',
  'status',
  'blog',
  'news',
]);

/**
 * Result of parsing host for tenant information
 */
export interface TenantParseResult {
  /** The extracted tenant slug, or null if not found */
  slug: string | null;
  /** Whether this is the main domain (no tenant subdomain) */
  isMainDomain: boolean;
  /** Whether the hostname is valid for tenant resolution */
  isValid: boolean;
}

/**
 * Normalizes a hostname for processing
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes port number
 *
 * @param hostname - The raw hostname string
 * @returns Normalized hostname
 */
export function normalizeHostname(hostname: string | null | undefined): string {
  if (!hostname) {
    return '';
  }

  let normalized = hostname.trim().toLowerCase();

  // Remove port if present (handle both IPv4:port and [IPv6]:port)
  if (normalized.includes('[')) {
    // IPv6 address - port comes after the closing bracket
    const bracketEnd = normalized.indexOf(']');
    if (bracketEnd !== -1 && normalized[bracketEnd + 1] === ':') {
      normalized = normalized.substring(0, bracketEnd + 1);
    }
  } else {
    // IPv4 or hostname - port is after the last colon
    const colonIndex = normalized.lastIndexOf(':');
    if (colonIndex !== -1) {
      normalized = normalized.substring(0, colonIndex);
    }
  }

  return normalized;
}

/**
 * Checks if a hostname is an IP address (IPv4 or IPv6)
 *
 * @param hostname - The normalized hostname
 * @returns True if the hostname is an IP address
 */
function isIPAddress(hostname: string): boolean {
  // IPv6 check - wrapped in brackets
  if (hostname.startsWith('[')) {
    return true;
  }

  // IPv4 check - four octets separated by dots
  const parts = hostname.split('.');
  if (parts.length === 4) {
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === String(num);
    });
  }

  return false;
}

/**
 * Validates a slug against naming rules
 * - Only lowercase letters, numbers, hyphens, and underscores
 * - Cannot start or end with hyphen
 * - Cannot be a reserved subdomain
 * - Length between 1-63 characters (DNS label limit)
 *
 * @param slug - The slug to validate
 * @returns True if the slug is valid
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length === 0 || slug.length > 63) {
    return false;
  }

  // Check for reserved subdomains
  if (RESERVED_SUBDOMAINS.has(slug)) {
    return false;
  }

  // Must match pattern: lowercase alphanumeric with hyphens/underscores
  // Cannot start or end with hyphen
  const pattern = /^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]$/;
  return pattern.test(slug);
}

/**
 * Extracts the subdomain (tenant slug) from a hostname
 *
 * Handles various formats:
 * - tenant.drink-ux.com -> tenant
 * - tenant.localhost:3001 -> tenant
 * - www.tenant.drink-ux.com -> tenant (strips www)
 * - drink-ux.com -> null (no subdomain)
 * - localhost -> null (no subdomain)
 *
 * @param hostname - The full hostname from the request
 * @returns The extracted subdomain/slug, or null if not found
 */
export function extractSubdomain(hostname: string | null | undefined): string | null {
  if (!hostname) {
    return null;
  }

  const normalized = normalizeHostname(hostname);

  if (!normalized || normalized.length === 0) {
    return null;
  }

  // Check for IP addresses - no subdomain possible
  if (isIPAddress(normalized)) {
    return null;
  }

  // Split by dots
  const parts = normalized.split('.');

  // Filter out empty parts (handles cases like "..." or "..")
  const validParts = parts.filter((p) => p.length > 0);

  if (validParts.length === 0) {
    return null;
  }

  // Handle localhost special case
  if (validParts[validParts.length - 1] === 'localhost') {
    // subdomain.localhost -> subdomain
    if (validParts.length === 2) {
      const subdomain = validParts[0];
      if (subdomain !== 'www') {
        return subdomain;
      }
    }
    // www.subdomain.localhost -> subdomain
    if (validParts.length === 3 && validParts[0] === 'www') {
      return validParts[1];
    }
    return null;
  }

  // For regular domains, we need at least domain.tld or subdomain.domain.tld
  // Handle multi-part TLDs like .co.uk
  let domainPartCount = 2; // default: domain.com

  // Check for known multi-part TLDs
  if (validParts.length >= 3) {
    const lastTwo = `${validParts[validParts.length - 2]}.${validParts[validParts.length - 1]}`;
    if (['co.uk', 'com.au', 'co.nz', 'org.uk'].includes(lastTwo)) {
      domainPartCount = 3;
    }
  }

  // Need more parts than just the domain for a subdomain
  if (validParts.length <= domainPartCount) {
    return null;
  }

  // Extract subdomain parts (everything before the main domain)
  const subdomainParts = validParts.slice(0, validParts.length - domainPartCount);

  // If first part is www, skip it
  let subdomain: string;
  if (subdomainParts[0] === 'www') {
    if (subdomainParts.length < 2) {
      return null; // Just www, no actual subdomain
    }
    subdomain = subdomainParts[1];
  } else {
    subdomain = subdomainParts[0];
  }

  return subdomain;
}

/**
 * Parses a hostname to extract tenant information
 * Main entry point for tenant resolution middleware
 *
 * @param hostname - The full hostname from the request
 * @returns TenantParseResult with slug, isMainDomain, and isValid flags
 */
export function parseHostForTenant(hostname: string | null | undefined): TenantParseResult {
  if (!hostname) {
    return {
      slug: null,
      isMainDomain: false,
      isValid: false,
    };
  }

  const normalized = normalizeHostname(hostname);

  if (!normalized) {
    return {
      slug: null,
      isMainDomain: false,
      isValid: false,
    };
  }

  // Check for IP addresses
  if (isIPAddress(normalized)) {
    return {
      slug: null,
      isMainDomain: false,
      isValid: false,
    };
  }

  // Extract subdomain
  const subdomain = extractSubdomain(hostname);

  // No subdomain means main domain
  if (subdomain === null) {
    return {
      slug: null,
      isMainDomain: true,
      isValid: true,
    };
  }

  // Check if subdomain is reserved (invalid for tenant use)
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return {
      slug: null,
      isMainDomain: false,
      isValid: false,
    };
  }

  // Valid tenant subdomain
  return {
    slug: subdomain,
    isMainDomain: false,
    isValid: true,
  };
}
