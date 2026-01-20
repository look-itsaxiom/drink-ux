import { PrismaClient, Business, Prisma } from '../../generated/prisma';

/**
 * Custom error class for account-related errors
 */
export class AccountError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AccountError';
  }
}

/**
 * Public business profile (without sensitive fields)
 */
export interface BusinessProfile {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  accountState: string;
  createdAt: Date;
  updatedAt: Date;
  theme?: BusinessTheme | null;
}

/**
 * Business theme/branding configuration
 */
export interface BusinessTheme {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

/**
 * Profile update input
 */
export interface ProfileUpdateInput {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

/**
 * Branding update input
 */
export interface BrandingUpdateInput {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string | null;
}

/**
 * POS connection status
 */
export interface POSStatus {
  connected: boolean;
  provider?: string;
  merchantId?: string;
  locationId?: string;
  lastSyncAt?: Date;
  syncStatus?: string;
  lastError?: string;
}

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  'admin',
  'api',
  'www',
  'app',
  'dashboard',
  'login',
  'signup',
  'settings',
  'account',
  'help',
  'support',
  'about',
  'contact',
  'terms',
  'privacy',
  'static',
  'assets',
  'images',
  'cdn',
];

// Validation patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s()+-]+$/;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const URL_REGEX = /^https?:\/\/.+/;

// Slug constraints
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 64;

/**
 * Account Service - handles business profile, branding, and POS status management
 */
export class AccountService {
  constructor(private readonly prisma: PrismaClient) {}

  // ===========================================================================
  // PROFILE MANAGEMENT
  // ===========================================================================

  /**
   * Get business profile by ID
   */
  async getProfile(businessId: string): Promise<BusinessProfile> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new AccountError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    return this.toBusinessProfile(business);
  }

  /**
   * Update business profile
   */
  async updateProfile(
    businessId: string,
    input: ProfileUpdateInput
  ): Promise<BusinessProfile> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new AccountError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    // Validate inputs
    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new AccountError('INVALID_NAME', 'Business name cannot be empty');
      }
      input.name = trimmedName;
    }

    if (input.contactEmail !== undefined && input.contactEmail !== null) {
      if (!EMAIL_REGEX.test(input.contactEmail)) {
        throw new AccountError('INVALID_EMAIL', 'Invalid email format');
      }
    }

    if (input.contactPhone !== undefined && input.contactPhone !== null) {
      if (!PHONE_REGEX.test(input.contactPhone)) {
        throw new AccountError('INVALID_PHONE', 'Invalid phone format');
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.contactEmail !== undefined) {
      updateData.contactEmail = input.contactEmail;
    }
    if (input.contactPhone !== undefined) {
      updateData.contactPhone = input.contactPhone;
    }

    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data: updateData,
    });

    return this.toBusinessProfile(updated);
  }

  // ===========================================================================
  // SLUG MANAGEMENT
  // ===========================================================================

  /**
   * Update business slug
   */
  async updateSlug(businessId: string, slug: string): Promise<BusinessProfile> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new AccountError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    // Normalize slug
    const normalizedSlug = this.normalizeSlug(slug);

    // Validate slug
    this.validateSlug(normalizedSlug);

    // Check if updating to same slug (no-op)
    if (business.slug === normalizedSlug) {
      return this.toBusinessProfile(business);
    }

    // Check if reserved
    if (RESERVED_SLUGS.includes(normalizedSlug.toLowerCase())) {
      throw new AccountError('RESERVED_SLUG', 'This slug is reserved and cannot be used');
    }

    // Check if taken by another business
    const existing = await this.prisma.business.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existing && existing.id !== businessId) {
      throw new AccountError('SLUG_TAKEN', 'This slug is already in use');
    }

    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data: { slug: normalizedSlug },
    });

    return this.toBusinessProfile(updated);
  }

  /**
   * Check if a slug is available
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const normalizedSlug = this.normalizeSlug(slug);

    // Check if reserved
    if (RESERVED_SLUGS.includes(normalizedSlug.toLowerCase())) {
      return false;
    }

    // Check if empty after normalization
    if (!normalizedSlug) {
      return false;
    }

    // Check if taken
    const existing = await this.prisma.business.findUnique({
      where: { slug: normalizedSlug },
    });

    return !existing;
  }

  // ===========================================================================
  // BRANDING / THEME
  // ===========================================================================

  /**
   * Get business branding/theme
   */
  async getBranding(businessId: string): Promise<BusinessTheme | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new AccountError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    return this.getThemeFromBusiness(business);
  }

  /**
   * Update business branding/theme
   */
  async updateBranding(
    businessId: string,
    input: BrandingUpdateInput
  ): Promise<BusinessProfile> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new AccountError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    // Validate inputs
    if (input.primaryColor !== undefined && input.primaryColor !== null) {
      if (!HEX_COLOR_REGEX.test(input.primaryColor)) {
        throw new AccountError('INVALID_COLOR', 'Primary color must be a valid hex color');
      }
    }

    if (input.secondaryColor !== undefined && input.secondaryColor !== null) {
      if (!HEX_COLOR_REGEX.test(input.secondaryColor)) {
        throw new AccountError('INVALID_COLOR', 'Secondary color must be a valid hex color');
      }
    }

    if (input.logoUrl !== undefined && input.logoUrl !== null) {
      if (!URL_REGEX.test(input.logoUrl)) {
        throw new AccountError('INVALID_LOGO_URL', 'Logo URL must be a valid HTTP(S) URL');
      }
    }

    // Get existing theme
    const existingTheme = this.getThemeFromBusiness(business) || {};

    // Merge with new values
    const newTheme: BusinessTheme = {
      ...existingTheme,
    };

    if (input.primaryColor !== undefined) {
      newTheme.primaryColor = input.primaryColor || undefined;
    }
    if (input.secondaryColor !== undefined) {
      newTheme.secondaryColor = input.secondaryColor || undefined;
    }
    if (input.logoUrl !== undefined) {
      newTheme.logoUrl = input.logoUrl || undefined;
    }

    // Store theme - preserve any onboarding data if present
    const existingData = business.theme as Record<string, unknown> | null;
    const themeStorage = {
      ...(existingData || {}),
      theme: newTheme,
    } as unknown as Prisma.InputJsonValue;

    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data: {
        theme: themeStorage,
      },
    });

    return this.toBusinessProfile(updated);
  }

  // ===========================================================================
  // POS STATUS
  // ===========================================================================

  /**
   * Get POS connection status
   */
  async getPOSStatus(businessId: string): Promise<POSStatus> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new AccountError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    const connected = !!(business.posProvider && business.posMerchantId);

    return {
      connected,
      provider: business.posProvider || undefined,
      merchantId: business.posMerchantId || undefined,
      locationId: business.posLocationId || undefined,
      lastSyncAt: business.lastSyncedAt || business.posLastSyncAt || undefined,
      syncStatus: business.syncStatus || undefined,
      lastError: business.lastSyncError || undefined,
    };
  }

  // ===========================================================================
  // USER-BUSINESS LOOKUP
  // ===========================================================================

  /**
   * Get the primary business for a user
   */
  async getBusinessForUser(userId: string): Promise<Business | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        businesses: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user || user.businesses.length === 0) {
      return null;
    }

    return user.businesses[0];
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Convert business to public profile
   */
  private toBusinessProfile(business: Business): BusinessProfile {
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      contactEmail: business.contactEmail,
      contactPhone: business.contactPhone,
      accountState: business.accountState,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
      theme: this.getThemeFromBusiness(business),
    };
  }

  /**
   * Extract theme from business record
   */
  private getThemeFromBusiness(business: Business): BusinessTheme | null {
    const themeData = business.theme as Record<string, unknown> | null;

    if (!themeData) {
      return null;
    }

    // Check if theme is nested under 'theme' key (from onboarding)
    if (themeData.theme && typeof themeData.theme === 'object') {
      return themeData.theme as BusinessTheme;
    }

    // Check if it's directly a theme object
    if (themeData.primaryColor || themeData.secondaryColor || themeData.logoUrl) {
      return themeData as unknown as BusinessTheme;
    }

    return null;
  }

  /**
   * Normalize a slug string
   */
  private normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  /**
   * Validate a slug
   */
  private validateSlug(slug: string): void {
    if (!slug) {
      throw new AccountError('INVALID_SLUG', 'Slug cannot be empty');
    }

    if (slug.length < MIN_SLUG_LENGTH) {
      throw new AccountError(
        'INVALID_SLUG',
        `Slug must be at least ${MIN_SLUG_LENGTH} characters`
      );
    }

    if (slug.length > MAX_SLUG_LENGTH) {
      throw new AccountError(
        'INVALID_SLUG',
        `Slug cannot exceed ${MAX_SLUG_LENGTH} characters`
      );
    }
  }
}
