/**
 * Onboarding Service
 *
 * Handles the admin onboarding wizard flow:
 * - Step 1: POS OAuth connection (Square)
 * - Step 2: Path selection (Import/Template/Fresh)
 * - Step 3: Catalog setup per chosen path
 * - Step 4: Branding and theme configuration
 * - Step 5: Review and sync preview
 */

import {
  PrismaClient,
  AccountState,
  Business,
  ItemType,
  Prisma,
} from '../../generated/prisma';
import { POSAdapter, POSCredentials, RawCatalogData } from '../adapters/pos/POSAdapter';
import { templateCatalog } from '../data/templateCatalog';
import { encryptToken, decryptToken } from '../utils/encryption';

// Encryption key for POS tokens - in production, use environment variable
const ENCRYPTION_KEY = process.env.POS_TOKEN_ENCRYPTION_KEY || 'test-key-must-be-32-chars-long!!';

/**
 * Onboarding steps
 */
export enum OnboardingStep {
  POS_CONNECTION = 'POS_CONNECTION',
  PATH_SELECTION = 'PATH_SELECTION',
  CATALOG_SETUP = 'CATALOG_SETUP',
  BRANDING = 'BRANDING',
  REVIEW = 'REVIEW',
}

/**
 * Catalog setup paths
 */
export enum CatalogPath {
  IMPORT = 'IMPORT',
  TEMPLATE = 'TEMPLATE',
  FRESH = 'FRESH',
}

/**
 * Custom error class for onboarding errors
 */
export class OnboardingError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'OnboardingError';
  }
}

/**
 * Onboarding data stored in business record
 */
interface OnboardingData {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  posConnected?: boolean;
  oauthError?: string;
  oauthState?: string;
  selectedPath?: CatalogPath;
  catalogSetupComplete?: boolean;
  catalogIsEmpty?: boolean;
  themePreview?: ThemeData;
}

/**
 * Combined theme storage that includes both onboarding state and actual theme
 */
interface ThemeStorage {
  onboarding?: OnboardingData;
  theme?: ThemeData;
}

/**
 * Theme configuration
 */
interface ThemeData {
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
}

/**
 * Step completion data
 */
export interface StepCompletionData {
  skipped?: boolean;
  path?: CatalogPath;
  theme?: Partial<ThemeData>;
  triggerSync?: boolean;
}

/**
 * Onboarding status response
 */
export interface OnboardingStatus {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  totalSteps: number;
  stepRequirements: Record<OnboardingStep, string>;
  stepData?: Partial<OnboardingData>;
  availablePaths?: CatalogPath[];
  nextStepHint?: string;
}

/**
 * Review summary for final step
 */
export interface ReviewSummary {
  catalog: {
    categoriesCount: number;
    basesCount: number;
    modifiersCount: number;
    presetsCount: number;
  };
  theme: ThemeData | null;
  posStatus: {
    connected: boolean;
    merchantId?: string;
    locationId?: string;
  };
}

/**
 * POS credentials input
 */
export interface POSCredentialsInput {
  accessToken: string;
  refreshToken: string;
  merchantId: string;
  locationId?: string;
  expiresAt: Date;
}

// Step order for navigation
const STEP_ORDER: OnboardingStep[] = [
  OnboardingStep.POS_CONNECTION,
  OnboardingStep.PATH_SELECTION,
  OnboardingStep.CATALOG_SETUP,
  OnboardingStep.BRANDING,
  OnboardingStep.REVIEW,
];

// Step requirements descriptions
const STEP_REQUIREMENTS: Record<OnboardingStep, string> = {
  [OnboardingStep.POS_CONNECTION]: 'Connect your POS (optional - can skip)',
  [OnboardingStep.PATH_SELECTION]: 'Choose how to set up your catalog',
  [OnboardingStep.CATALOG_SETUP]: 'Set up your menu catalog',
  [OnboardingStep.BRANDING]: 'Customize your branding (optional)',
  [OnboardingStep.REVIEW]: 'Review and complete setup',
};

// Color validation regex
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/.+/;

/**
 * Onboarding Service - handles the admin onboarding wizard
 */
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly posAdapter: POSAdapter
  ) {}

  /**
   * Get current onboarding status for a business
   */
  async getOnboardingStatus(businessId: string): Promise<OnboardingStatus | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || business.accountState !== AccountState.ONBOARDING) {
      return null;
    }

    const onboardingData = this.getOnboardingData(business);

    // Determine available paths
    const availablePaths = [CatalogPath.TEMPLATE, CatalogPath.FRESH];
    if (onboardingData.posConnected) {
      availablePaths.unshift(CatalogPath.IMPORT);
    }

    // Generate next step hint based on selected path
    let nextStepHint: string | undefined;
    if (onboardingData.selectedPath) {
      switch (onboardingData.selectedPath) {
        case CatalogPath.IMPORT:
          nextStepHint = 'Your catalog will be imported from your POS';
          break;
        case CatalogPath.TEMPLATE:
          nextStepHint = 'You will start with a template catalog';
          break;
        case CatalogPath.FRESH:
          nextStepHint = 'You will create your catalog from scratch';
          break;
      }
    }

    return {
      currentStep: onboardingData.currentStep,
      completedSteps: onboardingData.completedSteps,
      totalSteps: STEP_ORDER.length,
      stepRequirements: STEP_REQUIREMENTS,
      stepData: onboardingData,
      availablePaths,
      nextStepHint,
    };
  }

  /**
   * Complete a step in the onboarding process
   */
  async completeStep(
    businessId: string,
    step: OnboardingStep,
    data: StepCompletionData
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || business.accountState !== AccountState.ONBOARDING) {
      throw new OnboardingError('NOT_IN_ONBOARDING', 'Business is not in onboarding state');
    }

    const onboardingData = this.getOnboardingData(business);
    const currentStepIndex = STEP_ORDER.indexOf(onboardingData.currentStep);
    const targetStepIndex = STEP_ORDER.indexOf(step);

    // Validate step order
    if (targetStepIndex > currentStepIndex) {
      throw new OnboardingError('STEP_OUT_OF_ORDER', 'Cannot skip to a future step');
    }

    // Execute step-specific logic
    await this.executeStep(businessId, step, data, onboardingData);

    // Mark step as completed and advance
    if (!onboardingData.completedSteps.includes(step)) {
      onboardingData.completedSteps.push(step);
    }

    // Advance to next step if completing current step
    if (step === onboardingData.currentStep) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < STEP_ORDER.length) {
        onboardingData.currentStep = STEP_ORDER[nextIndex];
      }
    }

    // Handle final step (REVIEW) - complete onboarding
    if (step === OnboardingStep.REVIEW) {
      await this.finalizeOnboarding(businessId, data);
      return;
    }

    // Save updated onboarding data
    await this.saveOnboardingData(businessId, onboardingData);
  }

  /**
   * Go back to a previous step
   */
  async goBack(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || business.accountState !== AccountState.ONBOARDING) {
      throw new OnboardingError('NOT_IN_ONBOARDING', 'Business is not in onboarding state');
    }

    const onboardingData = this.getOnboardingData(business);
    const currentStepIndex = STEP_ORDER.indexOf(onboardingData.currentStep);

    if (currentStepIndex === 0) {
      throw new OnboardingError('ALREADY_AT_FIRST_STEP', 'Cannot go back from the first step');
    }

    // Move to previous step
    onboardingData.currentStep = STEP_ORDER[currentStepIndex - 1];

    // Remove from completed steps if it was there
    const prevStepIndex = onboardingData.completedSteps.indexOf(onboardingData.currentStep);
    if (prevStepIndex > -1) {
      onboardingData.completedSteps.splice(prevStepIndex, 1);
    }

    await this.saveOnboardingData(businessId, onboardingData);
  }

  /**
   * Store POS credentials after OAuth callback
   */
  async storePOSCredentials(businessId: string, credentials: POSCredentialsInput): Promise<void> {
    const encryptedAccessToken = encryptToken(credentials.accessToken, ENCRYPTION_KEY);
    const encryptedRefreshToken = encryptToken(credentials.refreshToken, ENCRYPTION_KEY);

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        posAccessToken: encryptedAccessToken,
        posRefreshToken: encryptedRefreshToken,
        posMerchantId: credentials.merchantId,
        posLocationId: credentials.locationId,
        posProvider: 'SQUARE',
      },
    });

    // Update onboarding data to mark POS as connected
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (business && business.accountState === AccountState.ONBOARDING) {
      const onboardingData = this.getOnboardingData(business);
      onboardingData.posConnected = true;
      onboardingData.oauthError = undefined;
      await this.saveOnboardingData(businessId, onboardingData);
    }
  }

  /**
   * Handle OAuth failure
   */
  async handleOAuthFailure(businessId: string, error: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (business && business.accountState === AccountState.ONBOARDING) {
      const onboardingData = this.getOnboardingData(business);
      onboardingData.oauthError = error;
      await this.saveOnboardingData(businessId, onboardingData);
    }
  }

  /**
   * Validate OAuth state parameter
   */
  async validateOAuthState(businessId: string, state: string): Promise<boolean> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new OnboardingError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    const onboardingData = this.getOnboardingData(business);

    if (onboardingData.oauthState !== state) {
      throw new OnboardingError('INVALID_OAUTH_STATE', 'Invalid OAuth state parameter');
    }

    return true;
  }

  /**
   * Get available Square locations
   */
  async getAvailableLocations(businessId: string): Promise<{ id: string; name: string }[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.posAccessToken) {
      return [];
    }

    // Set up adapter credentials
    const credentials: POSCredentials = {
      accessToken: decryptToken(business.posAccessToken, ENCRYPTION_KEY),
      refreshToken: business.posRefreshToken ? decryptToken(business.posRefreshToken, ENCRYPTION_KEY) : '',
      merchantId: business.posMerchantId || '',
      locationId: business.posLocationId || undefined,
      expiresAt: new Date(Date.now() + 3600000),
    };

    this.posAdapter.setCredentials(credentials);

    try {
      const locations = await this.posAdapter.getLocations();
      return locations.map(loc => ({
        id: loc.id,
        name: loc.name,
      }));
    } catch (error) {
      console.error('Failed to fetch locations from POS:', error);
      return [];
    }
  }

  /**
   * Get review summary for the final step
   */
  async getReviewSummary(businessId: string): Promise<ReviewSummary> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new OnboardingError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    const [categoriesCount, basesCount, modifiersCount, presetsCount] = await Promise.all([
      this.prisma.category.count({ where: { businessId } }),
      this.prisma.base.count({ where: { businessId } }),
      this.prisma.modifier.count({ where: { businessId } }),
      this.prisma.preset.count({ where: { businessId } }),
    ]);

    const theme = this.getThemeData(business);

    return {
      catalog: {
        categoriesCount,
        basesCount,
        modifiersCount,
        presetsCount,
      },
      theme,
      posStatus: {
        connected: !!business.posMerchantId,
        merchantId: business.posMerchantId || undefined,
        locationId: business.posLocationId || undefined,
      },
    };
  }

  /**
   * Reset onboarding to start over
   */
  async resetOnboarding(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new OnboardingError('BUSINESS_NOT_FOUND', 'Business not found');
    }

    // Delete catalog data (order matters for FK constraints)
    await this.prisma.$transaction([
      this.prisma.presetModifier.deleteMany({
        where: { preset: { businessId } },
      }),
      this.prisma.preset.deleteMany({ where: { businessId } }),
      this.prisma.variation.deleteMany({ where: { base: { businessId } } }),
      this.prisma.modifier.deleteMany({ where: { businessId } }),
      this.prisma.modifierGroup.deleteMany({ where: { businessId } }),
      this.prisma.base.deleteMany({ where: { businessId } }),
      this.prisma.category.deleteMany({ where: { businessId } }),
    ]);

    // Reset onboarding data
    const freshOnboardingData: OnboardingData = {
      currentStep: OnboardingStep.POS_CONNECTION,
      completedSteps: [],
      posConnected: !!business.posMerchantId,
    };

    await this.saveOnboardingData(businessId, freshOnboardingData);
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Parse onboarding data from business record
   */
  private getOnboardingData(business: Business): OnboardingData {
    const storage = business.theme as ThemeStorage | null;

    if (storage && storage.onboarding && 'currentStep' in storage.onboarding) {
      return storage.onboarding;
    }

    // Default onboarding data
    return {
      currentStep: OnboardingStep.POS_CONNECTION,
      completedSteps: [],
      posConnected: !!business.posMerchantId,
    };
  }

  /**
   * Get theme data from business record
   */
  private getThemeData(business: Business): ThemeData | null {
    const storage = business.theme as ThemeStorage | null;
    return storage?.theme || null;
  }

  /**
   * Save onboarding data to business record (preserving theme)
   */
  private async saveOnboardingData(
    businessId: string,
    data: OnboardingData
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    const existingStorage = (business?.theme as ThemeStorage) || {};

    const newStorage: ThemeStorage = {
      ...existingStorage,
      onboarding: data,
    };

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        theme: newStorage as any,
      },
    });
  }

  /**
   * Save theme data to business record (preserving onboarding data)
   */
  private async saveThemeData(
    businessId: string,
    themeData: ThemeData
  ): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    const existingStorage = (business?.theme as ThemeStorage) || {};

    const newStorage: ThemeStorage = {
      ...existingStorage,
      theme: themeData,
    };

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        theme: newStorage as any,
      },
    });
  }

  /**
   * Execute step-specific logic
   */
  private async executeStep(
    businessId: string,
    step: OnboardingStep,
    data: StepCompletionData,
    onboardingData: OnboardingData
  ): Promise<void> {
    switch (step) {
      case OnboardingStep.POS_CONNECTION:
        // POS connection is handled by OAuth flow, just mark complete
        break;

      case OnboardingStep.PATH_SELECTION:
        await this.executePathSelection(businessId, data, onboardingData);
        break;

      case OnboardingStep.CATALOG_SETUP:
        await this.executeCatalogSetup(businessId, onboardingData);
        break;

      case OnboardingStep.BRANDING:
        await this.executeBranding(businessId, data, onboardingData);
        break;

      case OnboardingStep.REVIEW:
        // Review is handled in completeStep
        break;
    }
  }

  /**
   * Execute path selection step
   */
  private async executePathSelection(
    businessId: string,
    data: StepCompletionData,
    onboardingData: OnboardingData
  ): Promise<void> {
    if (!data.path) {
      throw new OnboardingError('PATH_REQUIRED', 'Catalog path selection is required');
    }

    // Check if import path is allowed
    if (data.path === CatalogPath.IMPORT && !onboardingData.posConnected) {
      throw new OnboardingError(
        'POS_NOT_CONNECTED',
        'Cannot select import path without POS connection'
      );
    }

    onboardingData.selectedPath = data.path;
  }

  /**
   * Execute catalog setup step
   */
  private async executeCatalogSetup(
    businessId: string,
    onboardingData: OnboardingData
  ): Promise<void> {
    const path = onboardingData.selectedPath;

    if (!path) {
      throw new OnboardingError('PATH_NOT_SELECTED', 'Catalog path must be selected first');
    }

    switch (path) {
      case CatalogPath.IMPORT:
        await this.importFromPOS(businessId);
        break;

      case CatalogPath.TEMPLATE:
        await this.createFromTemplate(businessId);
        break;

      case CatalogPath.FRESH:
        // Fresh start - no catalog created
        onboardingData.catalogIsEmpty = true;
        break;
    }

    onboardingData.catalogSetupComplete = true;
  }

  /**
   * Import catalog from POS
   */
  private async importFromPOS(businessId: string): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business?.posAccessToken) {
      throw new OnboardingError('POS_NOT_CONFIGURED', 'POS is not configured');
    }

    // Set up adapter credentials
    const credentials: POSCredentials = {
      accessToken: decryptToken(business.posAccessToken, ENCRYPTION_KEY),
      refreshToken: business.posRefreshToken ? decryptToken(business.posRefreshToken, ENCRYPTION_KEY) : '',
      merchantId: business.posMerchantId || '',
      locationId: business.posLocationId || undefined,
      expiresAt: new Date(Date.now() + 3600000),
    };

    this.posAdapter.setCredentials(credentials);

    // Import catalog
    let catalogData: RawCatalogData;
    try {
      catalogData = await this.posAdapter.importCatalog();
    } catch (error) {
      throw new OnboardingError(
        'POS_IMPORT_FAILED',
        `Failed to import catalog from POS: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Create categories
    const categoryMap = new Map<string, string>(); // Square category ID → DB category ID
    const categoryNameMap = new Map<string, string>(); // Square category ID → category name
    for (const cat of catalogData.categories) {
      const category = await this.prisma.category.create({
        data: {
          businessId,
          name: cat.name,
          displayOrder: cat.ordinal || 0,
          posCategoryId: cat.id,
        },
      });
      categoryMap.set(cat.id, category.id);
      categoryNameMap.set(cat.id, cat.name);
    }

    // Create a default category if none exist
    let defaultCategoryId: string | null = null;
    if (catalogData.categories.length === 0 && catalogData.items.length > 0) {
      const defaultCategory = await this.prisma.category.create({
        data: {
          businessId,
          name: 'Uncategorized',
          displayOrder: 0,
        },
      });
      defaultCategoryId = defaultCategory.id;
    }

    // Create modifier groups from modifier lists
    const modifierGroupMap = new Map<string, string>(); // Square modifier list ID → DB group ID
    for (const modList of catalogData.modifierLists) {
      const group = await this.prisma.modifierGroup.create({
        data: {
          businessId,
          name: modList.name,
          posModifierListId: modList.id,
          selectionMode: this.inferSelectionMode(modList.name),
        },
      });
      modifierGroupMap.set(modList.id, group.id);
    }

    // Create a default modifier group for orphan modifiers
    let defaultGroupId: string | null = null;

    // Build image lookup: Square IMAGE id → URL
    const imageMap = new Map<string, string>();
    for (const img of catalogData.images) {
      imageMap.set(img.id, img.url);
    }

    // Track names for uniqueness
    const usedNames = new Set<string>();

    // Create bases from items (import ALL variations, not just the first one)
    for (const item of catalogData.items) {
      // Skip deleted/disabled items
      if (item.isDeleted) continue;

      let name = item.name;
      let counter = 1;

      // Make name unique
      while (usedNames.has(name)) {
        name = `${item.name} (${counter})`;
        counter++;
      }
      usedNames.add(name);

      // Resolve category: prefer modern category_ids[], fall back to legacy category_id
      const resolvedCategoryIds = item.categoryIds?.length
        ? item.categoryIds
        : item.categoryId
          ? [item.categoryId]
          : [];

      const categoryId = resolvedCategoryIds.length > 0
        ? categoryMap.get(resolvedCategoryIds[0]) || defaultCategoryId
        : defaultCategoryId;

      if (!categoryId) continue;

      // Use the first variation's price as the base price, or 0
      const basePriceCents = item.variations?.[0]?.price || 0;

      // Resolve image URL from Square IMAGE objects
      const imageUrl = item.imageIds?.length
        ? imageMap.get(item.imageIds[0]) || null
        : null;

      const base = await this.prisma.base.create({
        data: {
          businessId,
          categoryId,
          name,
          priceCents: basePriceCents,
          posItemId: item.id,
          imageUrl,
          needsReview: item.needsReview || false,
        },
      });

      // Create a Variation for EACH Square variation (not just the first!)
      if (item.variations && item.variations.length > 0) {
        for (let i = 0; i < item.variations.length; i++) {
          const v = item.variations[i];
          await this.prisma.variation.create({
            data: {
              baseId: base.id,
              name: v.name || 'Regular',
              priceCents: v.price,
              displayOrder: i,
              posVariationId: v.id,
            },
          });
        }
      } else {
        // No variations from POS — create a default one
        await this.prisma.variation.create({
          data: {
            baseId: base.id,
            name: 'Regular',
            priceCents: basePriceCents,
            displayOrder: 0,
          },
        });
      }

      // Create ItemMapping so MappedCatalogService can find this item
      const categoryName = item.categoryId ? categoryNameMap.get(item.categoryId) : 'Uncategorized';
      await this.prisma.itemMapping.create({
        data: {
          businessId,
          squareItemId: item.id,
          itemType: ItemType.BASE,
          category: categoryName || 'Uncategorized',
          displayName: name,
          displayOrder: catalogData.items.indexOf(item),
          temperatureOptions: ['hot', 'iced'],
        },
      });
    }

    // Create modifiers — use modifier group from modifierListId
    for (const mod of catalogData.modifiers) {
      let groupId = mod.modifierListId ? modifierGroupMap.get(mod.modifierListId) : null;

      // If no group found, create/use a default group
      if (!groupId) {
        if (!defaultGroupId) {
          const defaultGroup = await this.prisma.modifierGroup.create({
            data: {
              businessId,
              name: 'Other Options',
              selectionMode: 'multiple',
            },
          });
          defaultGroupId = defaultGroup.id;
        }
        groupId = defaultGroupId;
      }

      await this.prisma.modifier.create({
        data: {
          businessId,
          modifierGroupId: groupId,
          name: mod.name,
          priceCents: mod.price || 0,
          posModifierId: mod.id,
        },
      });

      // Create ItemMapping for modifier so MappedCatalogService can include it
      await this.prisma.itemMapping.create({
        data: {
          businessId,
          squareItemId: mod.id,
          itemType: ItemType.MODIFIER,
          category: mod.modifierListId || 'other',
          displayName: mod.name,
        },
      });
    }
  }

  /**
   * Infer selection mode from modifier list name.
   * Lists with "milk", "cheese", "bread" etc. are typically single-select.
   */
  private inferSelectionMode(name: string): string {
    const lowerName = name.toLowerCase();
    const singleSelectPatterns = ['milk', 'bread', 'cheese', 'protein', 'base', 'size'];
    if (singleSelectPatterns.some(p => lowerName.includes(p))) {
      return 'single';
    }
    return 'multiple';
  }

  /**
   * Create catalog from template
   */
  private async createFromTemplate(businessId: string): Promise<void> {
    const template = templateCatalog;

    // Create categories
    const categoryMap = new Map<string, string>();
    for (const cat of template.categories) {
      const category = await this.prisma.category.create({
        data: {
          businessId,
          name: cat.name,
          displayOrder: cat.displayOrder,
        },
      });
      categoryMap.set(cat.name, category.id);
    }

    // Create modifier groups from template group definitions
    const modifierGroupMap = new Map<string, string>();
    for (const group of template.modifierGroups) {
      const mg = await this.prisma.modifierGroup.create({
        data: {
          businessId,
          name: group.name,
          displayOrder: group.displayOrder,
          selectionMode: group.selectionMode,
        },
      });
      modifierGroupMap.set(group.name, mg.id);
    }

    // Create bases with variations
    for (const base of template.bases) {
      const categoryId = categoryMap.get(base.category);
      if (!categoryId) continue;

      const createdBase = await this.prisma.base.create({
        data: {
          businessId,
          categoryId,
          name: base.name,
          priceCents: base.priceCents,
        },
      });

      // Create variations for each base
      for (let i = 0; i < base.variations.length; i++) {
        const v = base.variations[i];
        await this.prisma.variation.create({
          data: {
            baseId: createdBase.id,
            name: v.name,
            priceCents: v.priceCents,
            displayOrder: i,
          },
        });
      }
    }

    // Create modifiers
    for (const mod of template.modifiers) {
      const groupId = modifierGroupMap.get(mod.group);
      if (!groupId) continue;

      await this.prisma.modifier.create({
        data: {
          businessId,
          modifierGroupId: groupId,
          name: mod.name,
          priceCents: mod.priceCents,
        },
      });
    }
  }

  /**
   * Execute branding step
   */
  private async executeBranding(
    businessId: string,
    data: StepCompletionData,
    onboardingData: OnboardingData
  ): Promise<void> {
    if (data.skipped) {
      // Use default theme
      onboardingData.themePreview = {
        primaryColor: '#6B4226',
        secondaryColor: '#D4A574',
      };
      return;
    }

    const theme = data.theme;
    if (!theme) {
      throw new OnboardingError('THEME_REQUIRED', 'Theme configuration is required');
    }

    // Validate colors
    if (theme.primaryColor && !HEX_COLOR_REGEX.test(theme.primaryColor)) {
      throw new OnboardingError('INVALID_COLOR', 'Primary color must be a valid hex color');
    }

    if (theme.secondaryColor && !HEX_COLOR_REGEX.test(theme.secondaryColor)) {
      throw new OnboardingError('INVALID_COLOR', 'Secondary color must be a valid hex color');
    }

    // Validate logo URL
    if (theme.logoUrl && !URL_REGEX.test(theme.logoUrl)) {
      throw new OnboardingError('INVALID_LOGO_URL', 'Logo URL must be a valid HTTP(S) URL');
    }

    // Save theme to business using saveThemeData
    const themeData: ThemeData = {
      primaryColor: theme.primaryColor || '#6B4226',
      secondaryColor: theme.secondaryColor,
      logoUrl: theme.logoUrl,
    };

    await this.saveThemeData(businessId, themeData);

    onboardingData.themePreview = themeData;
  }

  /**
   * Finalize onboarding
   */
  private async finalizeOnboarding(
    businessId: string,
    data: StepCompletionData
  ): Promise<void> {
    // Validate all required steps are complete
    const status = await this.getOnboardingStatus(businessId);
    if (!status) {
      throw new OnboardingError('NOT_IN_ONBOARDING', 'Business is not in onboarding state');
    }

    const requiredSteps = [
      OnboardingStep.POS_CONNECTION,
      OnboardingStep.PATH_SELECTION,
      OnboardingStep.CATALOG_SETUP,
      OnboardingStep.BRANDING,
    ];

    for (const step of requiredSteps) {
      if (!status.completedSteps.includes(step)) {
        throw new OnboardingError(
          'INCOMPLETE_ONBOARDING',
          `Step ${step} must be completed before finishing onboarding`
        );
      }
    }

    // Get the theme before clearing onboarding data
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    const existingTheme = business ? this.getThemeData(business) : null;

    // Update business state - keep only theme, clear onboarding data
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        accountState: AccountState.SETUP_COMPLETE,
        theme: existingTheme ? (existingTheme as any) : Prisma.JsonNull,
      },
    });

    // Trigger initial sync if POS is connected and requested
    if (data.triggerSync) {
      const updatedBusiness = await this.prisma.business.findUnique({
        where: { id: businessId },
      });

      if (business?.posAccessToken) {
        const credentials: POSCredentials = {
          accessToken: decryptToken(business.posAccessToken, ENCRYPTION_KEY),
          refreshToken: business.posRefreshToken ? decryptToken(business.posRefreshToken, ENCRYPTION_KEY) : '',
          merchantId: business.posMerchantId || '',
          locationId: business.posLocationId || undefined,
          expiresAt: new Date(Date.now() + 3600000),
        };

        this.posAdapter.setCredentials(credentials);
        // The actual sync would be triggered by CatalogSyncService
      }
    }
  }
}
