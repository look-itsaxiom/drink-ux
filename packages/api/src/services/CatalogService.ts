import {
  PrismaClient,
  Category,
  Base,
  Modifier,
  Preset,
  PresetModifier,
  TemperatureConstraint,
  ModifierType,
  CupSize,
} from '../../generated/prisma';

/**
 * Custom error class for catalog errors
 */
export class CatalogError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'CatalogError';
  }
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Category creation input
 */
export interface CreateCategoryInput {
  businessId: string;
  name: string;
  displayOrder?: number;
  color?: string;
  icon?: string;
}

/**
 * Category update input
 */
export interface UpdateCategoryInput {
  name?: string;
  displayOrder?: number;
  color?: string;
  icon?: string;
}

/**
 * Base creation input
 */
export interface CreateBaseInput {
  businessId: string;
  categoryId: string;
  name: string;
  basePrice: number;
  temperatureConstraint?: TemperatureConstraint;
  available?: boolean;
  visualColor?: string;
  visualOpacity?: number;
}

/**
 * Base update input
 */
export interface UpdateBaseInput {
  name?: string;
  basePrice?: number;
  temperatureConstraint?: TemperatureConstraint;
  available?: boolean;
  visualColor?: string;
  visualOpacity?: number;
  categoryId?: string;
}

/**
 * Base list filter
 */
export interface ListBasesFilter {
  businessId?: string;
  categoryId?: string;
  available?: boolean;
}

/**
 * Modifier creation input
 */
export interface CreateModifierInput {
  businessId: string;
  name: string;
  type: ModifierType;
  price: number;
  available?: boolean;
  visualColor?: string;
  visualLayerOrder?: number;
  visualAnimationType?: string;
}

/**
 * Modifier update input
 */
export interface UpdateModifierInput {
  name?: string;
  price?: number;
  available?: boolean;
  visualColor?: string;
  visualLayerOrder?: number;
  visualAnimationType?: string;
}

/**
 * Modifier list filter
 */
export interface ListModifiersFilter {
  businessId: string;
  type?: ModifierType;
  available?: boolean;
}

/**
 * Preset creation input
 */
export interface CreatePresetInput {
  businessId: string;
  name: string;
  baseId: string;
  modifierIds?: string[];
  price: number;
  defaultSize?: CupSize;
  defaultHot?: boolean;
  imageUrl?: string;
}

/**
 * Preset update input
 */
export interface UpdatePresetInput {
  name?: string;
  baseId?: string;
  modifierIds?: string[];
  price?: number;
  defaultSize?: CupSize;
  defaultHot?: boolean;
  imageUrl?: string;
  available?: boolean;
}

/**
 * Preset list filter
 */
export interface ListPresetsFilter {
  businessId: string;
  categoryId?: string;
  available?: boolean;
}

/**
 * Preset with modifiers
 */
export interface PresetWithModifiers extends Preset {
  modifiers: (PresetModifier & { modifier: Modifier })[];
  base: Base;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_NAME_LENGTH = 255;
const VALID_TEMPERATURE_CONSTRAINTS = ['HOT_ONLY', 'ICED_ONLY', 'BOTH'];
const VALID_MODIFIER_TYPES = ['MILK', 'SYRUP', 'TOPPING'];
const VALID_CUP_SIZES = ['SMALL', 'MEDIUM', 'LARGE'];

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Catalog Service - handles CRUD operations for catalog entities
 */
export class CatalogService {
  constructor(private readonly prisma: PrismaClient) {}

  // ===========================================================================
  // CATEGORY METHODS
  // ===========================================================================

  /**
   * Create a new category
   */
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const { businessId, name, displayOrder = 0, color, icon } = input;

    // Validate name
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new CatalogError('INVALID_INPUT', 'Category name is required');
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      throw new CatalogError('INVALID_INPUT', `Category name must be ${MAX_NAME_LENGTH} characters or less`);
    }

    // Validate business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) {
      throw new CatalogError('INVALID_BUSINESS', 'Business not found');
    }

    // Check for duplicate name within business
    const existingCategory = await this.prisma.category.findUnique({
      where: {
        businessId_name: {
          businessId,
          name: trimmedName,
        },
      },
    });
    if (existingCategory) {
      throw new CatalogError('DUPLICATE_NAME', 'A category with this name already exists');
    }

    // Create category
    return this.prisma.category.create({
      data: {
        businessId,
        name: trimmedName,
        displayOrder,
        color,
        icon,
      },
    });
  }

  /**
   * Update an existing category
   */
  async updateCategory(categoryId: string, input: UpdateCategoryInput): Promise<Category> {
    // Check category exists
    const existing = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!existing) {
      throw new CatalogError('NOT_FOUND', 'Category not found');
    }

    // Validate name if provided
    let trimmedName: string | undefined;
    if (input.name !== undefined) {
      trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new CatalogError('INVALID_INPUT', 'Category name is required');
      }
      if (trimmedName.length > MAX_NAME_LENGTH) {
        throw new CatalogError('INVALID_INPUT', `Category name must be ${MAX_NAME_LENGTH} characters or less`);
      }

      // Check for duplicate name within business
      const duplicate = await this.prisma.category.findFirst({
        where: {
          businessId: existing.businessId,
          name: trimmedName,
          id: { not: categoryId },
        },
      });
      if (duplicate) {
        throw new CatalogError('DUPLICATE_NAME', 'A category with this name already exists');
      }
    }

    // Update category
    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(trimmedName && { name: trimmedName }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.icon !== undefined && { icon: input.icon }),
      },
    });
  }

  /**
   * List categories for a business
   */
  async listCategories(businessId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { businessId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Reorder categories
   */
  async reorderCategories(businessId: string, categoryIds: string[]): Promise<void> {
    // Verify all categories belong to this business
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const invalidCategories = categories.filter(c => c.businessId !== businessId);
    if (invalidCategories.length > 0) {
      throw new CatalogError('INVALID_CATEGORY', 'One or more categories do not belong to this business');
    }

    // Update display order using transaction
    await this.prisma.$transaction(
      categoryIds.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );
  }

  /**
   * Get a category by ID
   */
  async getCategory(categoryId: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id: categoryId },
    });
  }

  /**
   * Delete a category (actually removes it, but checks for active items first)
   */
  async deleteCategory(categoryId: string): Promise<void> {
    // Check category exists
    const existing = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        bases: {
          where: { available: true },
        },
      },
    });
    if (!existing) {
      throw new CatalogError('NOT_FOUND', 'Category not found');
    }

    // Check for active bases
    if (existing.bases.length > 0) {
      throw new CatalogError('HAS_ACTIVE_ITEMS', 'Cannot delete category with active items');
    }

    // Delete the category
    await this.prisma.category.delete({
      where: { id: categoryId },
    });
  }

  // ===========================================================================
  // BASE METHODS
  // ===========================================================================

  /**
   * Create a new base
   */
  async createBase(input: CreateBaseInput): Promise<Base> {
    const {
      businessId,
      categoryId,
      name,
      basePrice,
      temperatureConstraint = 'BOTH',
      available,
      visualColor,
      visualOpacity = 1.0,
    } = input;

    // Validate name
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new CatalogError('INVALID_INPUT', 'Base name is required');
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      throw new CatalogError('INVALID_INPUT', `Base name must be ${MAX_NAME_LENGTH} characters or less`);
    }

    // Validate price
    if (basePrice < 0) {
      throw new CatalogError('INVALID_PRICE', 'Price must be non-negative');
    }

    // Validate temperature constraint
    if (!VALID_TEMPERATURE_CONSTRAINTS.includes(temperatureConstraint)) {
      throw new CatalogError('INVALID_INPUT', 'Invalid temperature constraint');
    }

    // Validate category exists and belongs to business
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new CatalogError('INVALID_CATEGORY', 'Category not found');
    }
    if (category.businessId !== businessId) {
      throw new CatalogError('INVALID_CATEGORY', 'Category does not belong to this business');
    }

    // Check for duplicate name within business
    const existingBase = await this.prisma.base.findUnique({
      where: {
        businessId_name: {
          businessId,
          name: trimmedName,
        },
      },
    });
    if (existingBase) {
      throw new CatalogError('DUPLICATE_NAME', 'A base with this name already exists');
    }

    // Create base
    return this.prisma.base.create({
      data: {
        businessId,
        categoryId,
        name: trimmedName,
        basePrice,
        temperatureConstraint: temperatureConstraint as TemperatureConstraint,
        ...(available !== undefined && { available }),
        visualColor,
        visualOpacity,
      },
    });
  }

  /**
   * Update an existing base
   */
  async updateBase(baseId: string, input: UpdateBaseInput): Promise<Base> {
    // Check base exists
    const existing = await this.prisma.base.findUnique({
      where: { id: baseId },
    });
    if (!existing) {
      throw new CatalogError('NOT_FOUND', 'Base not found');
    }

    // Validate name if provided
    let trimmedName: string | undefined;
    if (input.name !== undefined) {
      trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new CatalogError('INVALID_INPUT', 'Base name is required');
      }
      if (trimmedName.length > MAX_NAME_LENGTH) {
        throw new CatalogError('INVALID_INPUT', `Base name must be ${MAX_NAME_LENGTH} characters or less`);
      }

      // Check for duplicate name within business
      const duplicate = await this.prisma.base.findFirst({
        where: {
          businessId: existing.businessId,
          name: trimmedName,
          id: { not: baseId },
        },
      });
      if (duplicate) {
        throw new CatalogError('DUPLICATE_NAME', 'A base with this name already exists');
      }
    }

    // Validate price if provided
    if (input.basePrice !== undefined && input.basePrice < 0) {
      throw new CatalogError('INVALID_PRICE', 'Price must be non-negative');
    }

    // Validate temperature constraint if provided
    if (input.temperatureConstraint && !VALID_TEMPERATURE_CONSTRAINTS.includes(input.temperatureConstraint)) {
      throw new CatalogError('INVALID_INPUT', 'Invalid temperature constraint');
    }

    // Update base
    return this.prisma.base.update({
      where: { id: baseId },
      data: {
        ...(trimmedName && { name: trimmedName }),
        ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
        ...(input.temperatureConstraint && { temperatureConstraint: input.temperatureConstraint }),
        ...(input.available !== undefined && { available: input.available }),
        ...(input.visualColor !== undefined && { visualColor: input.visualColor }),
        ...(input.visualOpacity !== undefined && { visualOpacity: input.visualOpacity }),
        ...(input.categoryId && { categoryId: input.categoryId }),
      },
    });
  }

  /**
   * List bases
   */
  async listBases(filter: ListBasesFilter): Promise<Base[]> {
    return this.prisma.base.findMany({
      where: {
        ...(filter.businessId && { businessId: filter.businessId }),
        ...(filter.categoryId && { categoryId: filter.categoryId }),
        ...(filter.available !== undefined && { available: filter.available }),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a base by ID
   */
  async getBase(baseId: string): Promise<Base | null> {
    return this.prisma.base.findUnique({
      where: { id: baseId },
    });
  }

  /**
   * Delete a base (soft delete - marks as unavailable)
   */
  async deleteBase(baseId: string): Promise<void> {
    // Check base exists
    const existing = await this.prisma.base.findUnique({
      where: { id: baseId },
    });
    if (!existing) {
      throw new CatalogError('NOT_FOUND', 'Base not found');
    }

    // Soft delete by marking unavailable
    await this.prisma.base.update({
      where: { id: baseId },
      data: { available: false },
    });
  }

  // ===========================================================================
  // MODIFIER METHODS
  // ===========================================================================

  /**
   * Create a new modifier
   */
  async createModifier(input: CreateModifierInput): Promise<Modifier> {
    const {
      businessId,
      name,
      type,
      price,
      available,
      visualColor,
      visualLayerOrder = 0,
      visualAnimationType,
    } = input;

    // Validate name
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new CatalogError('INVALID_INPUT', 'Modifier name is required');
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      throw new CatalogError('INVALID_INPUT', `Modifier name must be ${MAX_NAME_LENGTH} characters or less`);
    }

    // Validate price
    if (price < 0) {
      throw new CatalogError('INVALID_PRICE', 'Price must be non-negative');
    }

    // Validate type
    if (!VALID_MODIFIER_TYPES.includes(type)) {
      throw new CatalogError('INVALID_INPUT', 'Invalid modifier type');
    }

    // Check for duplicate name within business and type
    const existingModifier = await this.prisma.modifier.findUnique({
      where: {
        businessId_type_name: {
          businessId,
          type: type as ModifierType,
          name: trimmedName,
        },
      },
    });
    if (existingModifier) {
      throw new CatalogError('DUPLICATE_NAME', 'A modifier with this name and type already exists');
    }

    // Create modifier
    return this.prisma.modifier.create({
      data: {
        businessId,
        name: trimmedName,
        type: type as ModifierType,
        price,
        ...(available !== undefined && { available }),
        visualColor,
        visualLayerOrder,
        visualAnimationType,
      },
    });
  }

  /**
   * Update an existing modifier
   */
  async updateModifier(modifierId: string, input: UpdateModifierInput): Promise<Modifier> {
    // Check modifier exists
    const existing = await this.prisma.modifier.findUnique({
      where: { id: modifierId },
    });
    if (!existing) {
      throw new CatalogError('NOT_FOUND', 'Modifier not found');
    }

    // Validate name if provided
    let trimmedName: string | undefined;
    if (input.name !== undefined) {
      trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new CatalogError('INVALID_INPUT', 'Modifier name is required');
      }
      if (trimmedName.length > MAX_NAME_LENGTH) {
        throw new CatalogError('INVALID_INPUT', `Modifier name must be ${MAX_NAME_LENGTH} characters or less`);
      }

      // Check for duplicate name within business and type
      const duplicate = await this.prisma.modifier.findFirst({
        where: {
          businessId: existing.businessId,
          type: existing.type,
          name: trimmedName,
          id: { not: modifierId },
        },
      });
      if (duplicate) {
        throw new CatalogError('DUPLICATE_NAME', 'A modifier with this name and type already exists');
      }
    }

    // Validate price if provided
    if (input.price !== undefined && input.price < 0) {
      throw new CatalogError('INVALID_PRICE', 'Price must be non-negative');
    }

    // Update modifier
    return this.prisma.modifier.update({
      where: { id: modifierId },
      data: {
        ...(trimmedName && { name: trimmedName }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.available !== undefined && { available: input.available }),
        ...(input.visualColor !== undefined && { visualColor: input.visualColor }),
        ...(input.visualLayerOrder !== undefined && { visualLayerOrder: input.visualLayerOrder }),
        ...(input.visualAnimationType !== undefined && { visualAnimationType: input.visualAnimationType }),
      },
    });
  }

  /**
   * List modifiers
   */
  async listModifiers(filter: ListModifiersFilter): Promise<Modifier[]> {
    return this.prisma.modifier.findMany({
      where: {
        businessId: filter.businessId,
        ...(filter.type && { type: filter.type }),
        ...(filter.available !== undefined && { available: filter.available }),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a modifier by ID
   */
  async getModifier(modifierId: string): Promise<Modifier | null> {
    return this.prisma.modifier.findUnique({
      where: { id: modifierId },
    });
  }

  /**
   * Delete a modifier (soft delete - marks as unavailable)
   */
  async deleteModifier(modifierId: string): Promise<void> {
    // Check modifier exists
    const existing = await this.prisma.modifier.findUnique({
      where: { id: modifierId },
    });
    if (!existing) {
      throw new CatalogError('NOT_FOUND', 'Modifier not found');
    }

    // Soft delete by marking unavailable
    await this.prisma.modifier.update({
      where: { id: modifierId },
      data: { available: false },
    });
  }

  // ===========================================================================
  // PRESET METHODS
  // ===========================================================================

  /**
   * Create a new preset
   */
  async createPreset(input: CreatePresetInput): Promise<Preset> {
    const {
      businessId,
      name,
      baseId,
      modifierIds = [],
      price,
      defaultSize = 'MEDIUM',
      defaultHot = true,
      imageUrl,
    } = input;

    // Validate name
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new CatalogError('INVALID_INPUT', 'Preset name is required');
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      throw new CatalogError('INVALID_INPUT', `Preset name must be ${MAX_NAME_LENGTH} characters or less`);
    }

    // Validate base ID
    if (!baseId || !baseId.trim()) {
      throw new CatalogError('INVALID_INPUT', 'Base ID is required');
    }

    // Validate base exists and belongs to business
    const base = await this.prisma.base.findUnique({
      where: { id: baseId },
    });
    if (!base) {
      throw new CatalogError('INVALID_BASE', 'Base not found');
    }
    if (base.businessId !== businessId) {
      throw new CatalogError('INVALID_BASE', 'Base does not belong to this business');
    }

    // Validate price
    if (price < 0) {
      throw new CatalogError('INVALID_PRICE', 'Price must be non-negative');
    }

    // Validate default size
    if (!VALID_CUP_SIZES.includes(defaultSize)) {
      throw new CatalogError('INVALID_INPUT', 'Invalid default size');
    }

    // Validate modifiers exist and belong to business
    if (modifierIds.length > 0) {
      const modifiers = await this.prisma.modifier.findMany({
        where: { id: { in: modifierIds } },
      });
      if (modifiers.length !== modifierIds.length) {
        throw new CatalogError('INVALID_MODIFIER', 'One or more modifiers not found');
      }
      const invalidModifiers = modifiers.filter(m => m.businessId !== businessId);
      if (invalidModifiers.length > 0) {
        throw new CatalogError('INVALID_MODIFIER', 'One or more modifiers do not belong to this business');
      }
    }

    // Check for duplicate name within business
    const existingPreset = await this.prisma.preset.findUnique({
      where: {
        businessId_name: {
          businessId,
          name: trimmedName,
        },
      },
    });
    if (existingPreset) {
      throw new CatalogError('DUPLICATE_NAME', 'A preset with this name already exists');
    }

    // Create preset with modifiers in transaction
    return this.prisma.$transaction(async (tx) => {
      const preset = await tx.preset.create({
        data: {
          businessId,
          name: trimmedName,
          baseId,
          price,
          defaultSize: defaultSize as CupSize,
          defaultHot,
          imageUrl,
        },
      });

      // Create preset-modifier relationships
      if (modifierIds.length > 0) {
        await tx.presetModifier.createMany({
          data: modifierIds.map(modifierId => ({
            presetId: preset.id,
            modifierId,
          })),
        });
      }

      return preset;
    });
  }

  /**
   * Update an existing preset
   */
  async updatePreset(presetId: string, input: UpdatePresetInput): Promise<Preset> {
    // Check preset exists
    const existing = await this.prisma.preset.findUnique({
      where: { id: presetId },
    });
    if (!existing) {
      throw new CatalogError('NOT_FOUND', 'Preset not found');
    }

    // Validate name if provided
    let trimmedName: string | undefined;
    if (input.name !== undefined) {
      trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new CatalogError('INVALID_INPUT', 'Preset name is required');
      }
      if (trimmedName.length > MAX_NAME_LENGTH) {
        throw new CatalogError('INVALID_INPUT', `Preset name must be ${MAX_NAME_LENGTH} characters or less`);
      }

      // Check for duplicate name within business
      const duplicate = await this.prisma.preset.findFirst({
        where: {
          businessId: existing.businessId,
          name: trimmedName,
          id: { not: presetId },
        },
      });
      if (duplicate) {
        throw new CatalogError('DUPLICATE_NAME', 'A preset with this name already exists');
      }
    }

    // Validate price if provided
    if (input.price !== undefined && input.price < 0) {
      throw new CatalogError('INVALID_PRICE', 'Price must be non-negative');
    }

    // Validate base if provided
    if (input.baseId) {
      const base = await this.prisma.base.findUnique({
        where: { id: input.baseId },
      });
      if (!base) {
        throw new CatalogError('INVALID_BASE', 'Base not found');
      }
      if (base.businessId !== existing.businessId) {
        throw new CatalogError('INVALID_BASE', 'Base does not belong to this business');
      }
    }

    // Validate modifiers if provided
    if (input.modifierIds !== undefined) {
      if (input.modifierIds.length > 0) {
        const modifiers = await this.prisma.modifier.findMany({
          where: { id: { in: input.modifierIds } },
        });
        if (modifiers.length !== input.modifierIds.length) {
          throw new CatalogError('INVALID_MODIFIER', 'One or more modifiers not found');
        }
        const invalidModifiers = modifiers.filter(m => m.businessId !== existing.businessId);
        if (invalidModifiers.length > 0) {
          throw new CatalogError('INVALID_MODIFIER', 'One or more modifiers do not belong to this business');
        }
      }
    }

    // Update preset in transaction
    return this.prisma.$transaction(async (tx) => {
      // Update modifier relationships if provided
      if (input.modifierIds !== undefined) {
        // Delete existing relationships
        await tx.presetModifier.deleteMany({
          where: { presetId },
        });

        // Create new relationships
        if (input.modifierIds.length > 0) {
          await tx.presetModifier.createMany({
            data: input.modifierIds.map(modifierId => ({
              presetId,
              modifierId,
            })),
          });
        }
      }

      // Update preset
      return tx.preset.update({
        where: { id: presetId },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(input.baseId && { baseId: input.baseId }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.defaultSize && { defaultSize: input.defaultSize }),
          ...(input.defaultHot !== undefined && { defaultHot: input.defaultHot }),
          ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
          ...(input.available !== undefined && { available: input.available }),
        },
      });
    });
  }

  /**
   * List presets
   */
  async listPresets(filter: ListPresetsFilter): Promise<(Preset & { base: Base })[]> {
    const presets = await this.prisma.preset.findMany({
      where: {
        businessId: filter.businessId,
        ...(filter.available !== undefined && { available: filter.available }),
      },
      include: {
        base: true,
      },
      orderBy: { name: 'asc' },
    });

    // Filter by category if specified
    if (filter.categoryId) {
      return presets.filter(p => p.base.categoryId === filter.categoryId);
    }

    return presets;
  }

  /**
   * Get a preset by ID
   */
  async getPreset(presetId: string): Promise<Preset | null> {
    return this.prisma.preset.findUnique({
      where: { id: presetId },
    });
  }

  /**
   * Get a preset with its modifiers
   */
  async getPresetWithModifiers(presetId: string): Promise<PresetWithModifiers | null> {
    return this.prisma.preset.findUnique({
      where: { id: presetId },
      include: {
        base: true,
        modifiers: {
          include: {
            modifier: true,
          },
        },
      },
    });
  }

  /**
   * Delete a preset (soft delete - marks as unavailable)
   */
  async deletePreset(presetId: string): Promise<void> {
    // Check preset exists
    const existing = await this.prisma.preset.findUnique({
      where: { id: presetId },
    });
    if (!existing) {
      throw new CatalogError('NOT_FOUND', 'Preset not found');
    }

    // Soft delete by marking unavailable
    await this.prisma.preset.update({
      where: { id: presetId },
      data: { available: false },
    });
  }

  /**
   * Calculate suggested price from base and modifiers
   */
  async calculateSuggestedPrice(baseId: string, modifierIds: string[]): Promise<number> {
    // Get base price
    const base = await this.prisma.base.findUnique({
      where: { id: baseId },
    });
    if (!base) {
      throw new CatalogError('INVALID_BASE', 'Base not found');
    }

    let totalPrice = base.basePrice;

    // Add modifier prices
    if (modifierIds.length > 0) {
      const modifiers = await this.prisma.modifier.findMany({
        where: { id: { in: modifierIds } },
      });
      totalPrice += modifiers.reduce((sum, m) => sum + m.price, 0);
    }

    // Round to 2 decimal places
    return Math.round(totalPrice * 100) / 100;
  }

  // ===========================================================================
  // AUTHORIZATION HELPER
  // ===========================================================================

  /**
   * Verify user owns the business
   */
  async verifyBusinessOwnership(businessId: string, userId: string): Promise<boolean> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    return business?.ownerId === userId;
  }
}
