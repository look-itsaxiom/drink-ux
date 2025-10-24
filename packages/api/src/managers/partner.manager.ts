import { Partner } from "@drink-ux/shared";
import { partnerRepository, PartnerWithRelations, CreatePartnerData, UpdatePartnerData } from "../repositories/partner.repository";

export interface GetPartnerOptions {
  includeRelations?: boolean;
}

export interface CreatePartnerInput {
  name: string;
  pointOfContact: string;
}

export interface UpdatePartnerInput {
  name?: string;
  pointOfContact?: string;
}

export class PartnerManager {
  /**
   * Get all partners
   */
  async getAllPartners(options: GetPartnerOptions = {}): Promise<Partner[]> {
    const { includeRelations = true } = options;

    const partners = await partnerRepository.findAll(includeRelations);

    // Transform to match the shared type interface
    return partners.map(this.transformToPartner);
  }

  /**
   * Get a partner by ID
   */
  async getPartnerById(id: string, options: GetPartnerOptions = {}): Promise<Partner | null> {
    if (!id || typeof id !== "string") {
      throw new Error("Valid partner ID is required");
    }

    const { includeRelations = true } = options;

    const partner = await partnerRepository.findById(id, includeRelations);

    if (!partner) {
      return null;
    }

    return this.transformToPartner(partner);
  }

  /**
   * Get a partner by name
   */
  async getPartnerByName(name: string, options: GetPartnerOptions = {}): Promise<Partner | null> {
    if (!name || typeof name !== "string") {
      throw new Error("Valid partner name is required");
    }

    const { includeRelations = true } = options;

    const partner = await partnerRepository.findByName(name, includeRelations);

    if (!partner) {
      return null;
    }

    return this.transformToPartner(partner);
  }

  /**
   * Create a new partner
   */
  async createPartner(input: CreatePartnerInput): Promise<Partner> {
    // Validate input
    this.validateCreateInput(input);

    // Check if partner name already exists
    const existingPartner = await partnerRepository.findByName(input.name);
    if (existingPartner) {
      throw new Error(`A partner with the name "${input.name}" already exists`);
    }

    // Create the partner
    const data: CreatePartnerData = {
      name: input.name.trim(),
      pointOfContact: input.pointOfContact.trim(),
    };

    const createdPartner = await partnerRepository.create(data);

    // Return the created partner with relations
    const partnerWithRelations = await partnerRepository.findById(createdPartner.id, true);
    return this.transformToPartner(partnerWithRelations!);
  }

  /**
   * Update a partner
   */
  async updatePartner(id: string, input: UpdatePartnerInput): Promise<Partner | null> {
    if (!id || typeof id !== "string") {
      throw new Error("Valid partner ID is required");
    }

    // Validate input
    this.validateUpdateInput(input);

    // Check if partner exists
    const existingPartner = await partnerRepository.findById(id, false);
    if (!existingPartner) {
      return null;
    }

    // If updating name, check for conflicts
    if (input.name && input.name !== existingPartner.name) {
      const nameConflict = await partnerRepository.findByName(input.name);
      if (nameConflict && nameConflict.id !== id) {
        throw new Error(`A partner with the name "${input.name}" already exists`);
      }
    }

    // Prepare update data
    const updateData: UpdatePartnerData = {};
    if (input.name !== undefined) {
      updateData.name = input.name.trim();
    }
    if (input.pointOfContact !== undefined) {
      updateData.pointOfContact = input.pointOfContact.trim();
    }

    // Update the partner
    await partnerRepository.updateById(id, updateData);

    // Return the updated partner with relations
    const updatedPartner = await partnerRepository.findById(id, true);
    return this.transformToPartner(updatedPartner!);
  }

  /**
   * Delete a partner
   */
  async deletePartner(id: string): Promise<boolean> {
    if (!id || typeof id !== "string") {
      throw new Error("Valid partner ID is required");
    }

    return await partnerRepository.deleteById(id);
  }

  /**
   * Check if a partner exists
   */
  async partnerExists(id: string): Promise<boolean> {
    if (!id || typeof id !== "string") {
      return false;
    }

    return await partnerRepository.existsById(id);
  }

  /**
   * Get partner statistics
   */
  async getPartnerStats(): Promise<{ totalPartners: number; partnersWithThemes: number; partnersWithPOS: number }> {
    const allPartners = await partnerRepository.findAll(true);

    return {
      totalPartners: allPartners.length,
      partnersWithThemes: allPartners.filter((p) => p.theme).length,
      partnersWithPOS: allPartners.filter((p) => p.posIntegration).length,
    };
  }

  /**
   * Transform database model to shared interface
   */
  private transformToPartner(partner: PartnerWithRelations): Partner {
    return {
      id: partner.id,
      name: partner.name,
      theme: partner.theme
        ? {
            primaryColor: partner.theme.primaryColor,
            secondaryColor: partner.theme.secondaryColor,
            logoUrl: partner.theme.logoUrl || undefined,
            backgroundUrl: partner.theme.backgroundUrl || undefined,
          }
        : undefined,
      posIntegration: partner.posIntegration
        ? {
            id: partner.posIntegration.id,
            businessId: partner.id, // Using partner ID as business ID for now
            provider: partner.posIntegration.provider as any, // Type cast for enum compatibility
            credentials: {}, // This would need to be properly handled based on security requirements
            config: {}, // This would need to be properly handled based on the actual config
            isActive: partner.posIntegration.isActive,
          }
        : undefined,
    };
  }

  /**
   * Validate create input
   */
  private validateCreateInput(input: CreatePartnerInput): void {
    if (!input.name || typeof input.name !== "string" || input.name.trim().length === 0) {
      throw new Error("Partner name is required and must be a non-empty string");
    }

    if (!input.pointOfContact || typeof input.pointOfContact !== "string" || input.pointOfContact.trim().length === 0) {
      throw new Error("Point of contact is required and must be a non-empty string");
    }

    if (input.name.trim().length > 255) {
      throw new Error("Partner name must be 255 characters or less");
    }

    if (input.pointOfContact.trim().length > 255) {
      throw new Error("Point of contact must be 255 characters or less");
    }
  }

  /**
   * Validate update input
   */
  private validateUpdateInput(input: UpdatePartnerInput): void {
    if (Object.keys(input).length === 0) {
      throw new Error("At least one field must be provided for update");
    }

    if (input.name !== undefined) {
      if (typeof input.name !== "string" || input.name.trim().length === 0) {
        throw new Error("Partner name must be a non-empty string");
      }
      if (input.name.trim().length > 255) {
        throw new Error("Partner name must be 255 characters or less");
      }
    }

    if (input.pointOfContact !== undefined) {
      if (typeof input.pointOfContact !== "string" || input.pointOfContact.trim().length === 0) {
        throw new Error("Point of contact must be a non-empty string");
      }
      if (input.pointOfContact.trim().length > 255) {
        throw new Error("Point of contact must be 255 characters or less");
      }
    }
  }
}

export const partnerManager = new PartnerManager();
