/**
 * Tests for subdomain parsing utilities
 * TDD: Write tests BEFORE implementation
 */

import {
  extractSubdomain,
  normalizeHostname,
  isValidSlug,
  parseHostForTenant,
} from '../subdomain';

describe('extractSubdomain', () => {
  // Happy path tests
  describe('happy path - extract slug from valid subdomain', () => {
    it('extracts slug from standard subdomain format', () => {
      expect(extractSubdomain('joes-coffee.drink-ux.com')).toBe('joes-coffee');
    });

    it('extracts slug from subdomain with numbers', () => {
      expect(extractSubdomain('cafe123.drink-ux.com')).toBe('cafe123');
    });

    it('extracts slug from subdomain with multiple hyphens', () => {
      expect(extractSubdomain('my-awesome-cafe.drink-ux.com')).toBe('my-awesome-cafe');
    });
  });

  // Success cases - different TLDs and environments
  describe('success cases - handle different TLDs and environments', () => {
    it('handles .io TLD', () => {
      expect(extractSubdomain('coffee-shop.drink-ux.io')).toBe('coffee-shop');
    });

    it('handles .dev TLD', () => {
      expect(extractSubdomain('test-cafe.drink-ux.dev')).toBe('test-cafe');
    });

    it('handles .co.uk TLD', () => {
      expect(extractSubdomain('british-cafe.drink-ux.co.uk')).toBe('british-cafe');
    });

    it('handles hostname with port', () => {
      expect(extractSubdomain('demo-shop.drink-ux.com:3000')).toBe('demo-shop');
    });

    it('handles localhost subdomain pattern for development', () => {
      expect(extractSubdomain('joes-coffee.localhost')).toBe('joes-coffee');
    });

    it('handles localhost with port', () => {
      expect(extractSubdomain('my-cafe.localhost:3001')).toBe('my-cafe');
    });
  });

  // Failure cases - return null for invalid subdomains
  describe('failure cases - return null for invalid subdomains', () => {
    it('returns null for main domain without subdomain', () => {
      expect(extractSubdomain('drink-ux.com')).toBeNull();
    });

    it('returns null for www only (treated as main domain)', () => {
      expect(extractSubdomain('www.drink-ux.com')).toBeNull();
    });

    it('returns null for bare localhost', () => {
      expect(extractSubdomain('localhost')).toBeNull();
    });

    it('returns null for localhost with port only', () => {
      expect(extractSubdomain('localhost:3001')).toBeNull();
    });
  });

  // Error cases - handle malformed hostnames gracefully
  describe('error cases - handle malformed hostnames gracefully', () => {
    it('returns null for empty string', () => {
      expect(extractSubdomain('')).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(extractSubdomain(undefined as any)).toBeNull();
    });

    it('returns null for null', () => {
      expect(extractSubdomain(null as any)).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(extractSubdomain('   ')).toBeNull();
    });

    it('returns null for just a dot', () => {
      expect(extractSubdomain('.')).toBeNull();
    });

    it('returns null for multiple dots without valid parts', () => {
      expect(extractSubdomain('...')).toBeNull();
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles www prefix and extracts actual subdomain', () => {
      expect(extractSubdomain('www.joes-coffee.drink-ux.com')).toBe('joes-coffee');
    });

    it('handles numeric subdomain', () => {
      expect(extractSubdomain('12345.drink-ux.com')).toBe('12345');
    });

    it('handles underscore in subdomain', () => {
      expect(extractSubdomain('joes_coffee.drink-ux.com')).toBe('joes_coffee');
    });

    it('handles very long subdomain (63 chars max for DNS)', () => {
      const longSlug = 'a'.repeat(63);
      expect(extractSubdomain(`${longSlug}.drink-ux.com`)).toBe(longSlug);
    });

    it('normalizes to lowercase', () => {
      expect(extractSubdomain('JoEs-CoFfEe.DRINK-UX.COM')).toBe('joes-coffee');
    });

    it('returns null for IP address (no subdomain possible)', () => {
      expect(extractSubdomain('192.168.1.1')).toBeNull();
    });

    it('returns null for IP address with port', () => {
      expect(extractSubdomain('192.168.1.1:3000')).toBeNull();
    });

    it('returns null for IPv6 address', () => {
      expect(extractSubdomain('[::1]')).toBeNull();
    });

    it('returns null for IPv6 address with port', () => {
      expect(extractSubdomain('[::1]:3000')).toBeNull();
    });
  });
});

describe('normalizeHostname', () => {
  it('converts to lowercase', () => {
    expect(normalizeHostname('DRINK-UX.COM')).toBe('drink-ux.com');
  });

  it('trims whitespace', () => {
    expect(normalizeHostname('  drink-ux.com  ')).toBe('drink-ux.com');
  });

  it('removes port from hostname', () => {
    expect(normalizeHostname('drink-ux.com:3000')).toBe('drink-ux.com');
  });

  it('handles empty string', () => {
    expect(normalizeHostname('')).toBe('');
  });

  it('handles null/undefined', () => {
    expect(normalizeHostname(null as any)).toBe('');
    expect(normalizeHostname(undefined as any)).toBe('');
  });
});

describe('isValidSlug', () => {
  describe('valid slugs', () => {
    it('accepts lowercase letters', () => {
      expect(isValidSlug('coffeeshop')).toBe(true);
    });

    it('accepts letters with hyphens', () => {
      expect(isValidSlug('joes-coffee')).toBe(true);
    });

    it('accepts letters with numbers', () => {
      expect(isValidSlug('cafe123')).toBe(true);
    });

    it('accepts underscores', () => {
      expect(isValidSlug('joes_coffee')).toBe(true);
    });

    it('accepts mixed valid characters', () => {
      expect(isValidSlug('joes-coffee_shop-123')).toBe(true);
    });

    it('accepts single character', () => {
      expect(isValidSlug('a')).toBe(true);
    });

    it('accepts maximum length (63 chars)', () => {
      expect(isValidSlug('a'.repeat(63))).toBe(true);
    });
  });

  describe('invalid slugs', () => {
    it('rejects empty string', () => {
      expect(isValidSlug('')).toBe(false);
    });

    it('rejects uppercase letters', () => {
      expect(isValidSlug('CoffeeShop')).toBe(false);
    });

    it('rejects spaces', () => {
      expect(isValidSlug('coffee shop')).toBe(false);
    });

    it('rejects special characters', () => {
      expect(isValidSlug('coffee@shop')).toBe(false);
      expect(isValidSlug('coffee.shop')).toBe(false);
      expect(isValidSlug('coffee!shop')).toBe(false);
    });

    it('rejects starting with hyphen', () => {
      expect(isValidSlug('-coffeeshop')).toBe(false);
    });

    it('rejects ending with hyphen', () => {
      expect(isValidSlug('coffeeshop-')).toBe(false);
    });

    it('rejects too long (over 63 chars)', () => {
      expect(isValidSlug('a'.repeat(64))).toBe(false);
    });

    it('rejects reserved subdomains', () => {
      expect(isValidSlug('www')).toBe(false);
      expect(isValidSlug('api')).toBe(false);
      expect(isValidSlug('admin')).toBe(false);
      expect(isValidSlug('app')).toBe(false);
    });
  });
});

describe('parseHostForTenant', () => {
  // This is the main function used by middleware
  describe('production environment', () => {
    it('returns slug for valid tenant subdomain', () => {
      const result = parseHostForTenant('joes-coffee.drink-ux.com');
      expect(result).toEqual({
        slug: 'joes-coffee',
        isMainDomain: false,
        isValid: true,
      });
    });

    it('identifies main domain without subdomain', () => {
      const result = parseHostForTenant('drink-ux.com');
      expect(result).toEqual({
        slug: null,
        isMainDomain: true,
        isValid: true,
      });
    });

    it('identifies www as main domain', () => {
      const result = parseHostForTenant('www.drink-ux.com');
      expect(result).toEqual({
        slug: null,
        isMainDomain: true,
        isValid: true,
      });
    });
  });

  describe('development environment', () => {
    it('returns slug for localhost subdomain pattern', () => {
      const result = parseHostForTenant('joes-coffee.localhost:3001');
      expect(result).toEqual({
        slug: 'joes-coffee',
        isMainDomain: false,
        isValid: true,
      });
    });

    it('identifies bare localhost as main domain', () => {
      const result = parseHostForTenant('localhost:3001');
      expect(result).toEqual({
        slug: null,
        isMainDomain: true,
        isValid: true,
      });
    });
  });

  describe('invalid inputs', () => {
    it('returns invalid for empty hostname', () => {
      const result = parseHostForTenant('');
      expect(result).toEqual({
        slug: null,
        isMainDomain: false,
        isValid: false,
      });
    });

    it('returns invalid for IP address', () => {
      const result = parseHostForTenant('192.168.1.1');
      expect(result).toEqual({
        slug: null,
        isMainDomain: false,
        isValid: false,
      });
    });

    it('returns invalid for reserved subdomain as slug', () => {
      const result = parseHostForTenant('api.drink-ux.com');
      expect(result).toEqual({
        slug: null,
        isMainDomain: false,
        isValid: false,
      });
    });
  });
});
