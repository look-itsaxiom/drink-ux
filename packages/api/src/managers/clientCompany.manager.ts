import { ClientCompany } from "@drink-ux/shared";
import {
  clientCompanyRepository,
  ClientCompanyWithRelations,
  CreateClientCompanyData,
  UpdateClientCompanyData,
} from "../repositories/clientCompany.repository";

export interface GetClientCompanyOptions {
  includeRelations?: boolean;
}

export interface CreateClientCompanyInput {
  name: string;
  pointOfContact: string;
}

export interface UpdateClientCompanyInput {
  name?: string;
  pointOfContact?: string;
}

export class ClientCompanyManager {
  /**
   * Get all client companies
   */
  async getAllClientCompanies(options: GetClientCompanyOptions = {}): Promise<ClientCompany[]> {
    const { includeRelations = true } = options;

    const companies = await clientCompanyRepository.findAll(includeRelations);

    // Transform to match the shared type interface
    return companies.map(this.transformToClientCompany);
  }

  /**
   * Get a client company by ID
   */
  async getClientCompanyById(id: string, options: GetClientCompanyOptions = {}): Promise<ClientCompany | null> {
    if (!id || typeof id !== "string") {
      throw new Error("Valid client company ID is required");
    }

    const { includeRelations = true } = options;

    const company = await clientCompanyRepository.findById(id, includeRelations);

    if (!company) {
      return null;
    }

    return this.transformToClientCompany(company);
  }

  /**
   * Get a client company by name
   */
  async getClientCompanyByName(name: string, options: GetClientCompanyOptions = {}): Promise<ClientCompany | null> {
    if (!name || typeof name !== "string") {
      throw new Error("Valid client company name is required");
    }

    const { includeRelations = true } = options;

    const company = await clientCompanyRepository.findByName(name, includeRelations);

    if (!company) {
      return null;
    }

    return this.transformToClientCompany(company);
  }

  /**
   * Create a new client company
   */
  async createClientCompany(input: CreateClientCompanyInput): Promise<ClientCompany> {
    // Validate input
    this.validateCreateInput(input);

    // Check if company name already exists
    const existingCompany = await clientCompanyRepository.findByName(input.name);
    if (existingCompany) {
      throw new Error(`A client company with the name "${input.name}" already exists`);
    }

    // Create the company
    const data: CreateClientCompanyData = {
      name: input.name.trim(),
      pointOfContact: input.pointOfContact.trim(),
    };

    const createdCompany = await clientCompanyRepository.create(data);

    // Return the created company with relations
    const companyWithRelations = await clientCompanyRepository.findById(createdCompany.id, true);
    return this.transformToClientCompany(companyWithRelations!);
  }

  /**
   * Update a client company
   */
  async updateClientCompany(id: string, input: UpdateClientCompanyInput): Promise<ClientCompany | null> {
    if (!id || typeof id !== "string") {
      throw new Error("Valid client company ID is required");
    }

    // Validate input
    this.validateUpdateInput(input);

    // Check if company exists
    const existingCompany = await clientCompanyRepository.findById(id, false);
    if (!existingCompany) {
      return null;
    }

    // If updating name, check for conflicts
    if (input.name && input.name !== existingCompany.name) {
      const nameConflict = await clientCompanyRepository.findByName(input.name);
      if (nameConflict && nameConflict.id !== id) {
        throw new Error(`A client company with the name "${input.name}" already exists`);
      }
    }

    // Prepare update data
    const updateData: UpdateClientCompanyData = {};
    if (input.name !== undefined) {
      updateData.name = input.name.trim();
    }
    if (input.pointOfContact !== undefined) {
      updateData.pointOfContact = input.pointOfContact.trim();
    }

    // Update the company
    await clientCompanyRepository.updateById(id, updateData);

    // Return the updated company with relations
    const updatedCompany = await clientCompanyRepository.findById(id, true);
    return this.transformToClientCompany(updatedCompany!);
  }

  /**
   * Delete a client company
   */
  async deleteClientCompany(id: string): Promise<boolean> {
    if (!id || typeof id !== "string") {
      throw new Error("Valid client company ID is required");
    }

    return await clientCompanyRepository.deleteById(id);
  }

  /**
   * Check if a client company exists
   */
  async clientCompanyExists(id: string): Promise<boolean> {
    if (!id || typeof id !== "string") {
      return false;
    }

    return await clientCompanyRepository.existsById(id);
  }

  /**
   * Get client company statistics
   */
  async getClientCompanyStats(): Promise<{ totalCompanies: number; companiesWithThemes: number; companiesWithPOS: number }> {
    const allCompanies = await clientCompanyRepository.findAll(true);

    return {
      totalCompanies: allCompanies.length,
      companiesWithThemes: allCompanies.filter((c) => c.theme).length,
      companiesWithPOS: allCompanies.filter((c) => c.posIntegration).length,
    };
  }

  /**
   * Transform database model to shared interface
   */
  private transformToClientCompany(company: ClientCompanyWithRelations): ClientCompany {
    return {
      id: company.id,
      name: company.name,
      theme: company.theme
        ? {
            primaryColor: company.theme.primaryColor,
            secondaryColor: company.theme.secondaryColor,
            logoUrl: company.theme.logoUrl || undefined,
            backgroundUrl: company.theme.backgroundUrl || undefined,
          }
        : undefined,
      posIntegration: company.posIntegration
        ? {
            id: company.posIntegration.id,
            businessId: company.id, // Using company ID as business ID for now
            provider: company.posIntegration.provider as any, // Type cast for enum compatibility
            credentials: {}, // This would need to be properly handled based on security requirements
            config: {}, // This would need to be properly handled based on the actual config
            isActive: company.posIntegration.isActive,
          }
        : undefined,
    };
  }

  /**
   * Validate create input
   */
  private validateCreateInput(input: CreateClientCompanyInput): void {
    if (!input.name || typeof input.name !== "string" || input.name.trim().length === 0) {
      throw new Error("Company name is required and must be a non-empty string");
    }

    if (!input.pointOfContact || typeof input.pointOfContact !== "string" || input.pointOfContact.trim().length === 0) {
      throw new Error("Point of contact is required and must be a non-empty string");
    }

    if (input.name.trim().length > 255) {
      throw new Error("Company name must be 255 characters or less");
    }

    if (input.pointOfContact.trim().length > 255) {
      throw new Error("Point of contact must be 255 characters or less");
    }
  }

  /**
   * Validate update input
   */
  private validateUpdateInput(input: UpdateClientCompanyInput): void {
    if (Object.keys(input).length === 0) {
      throw new Error("At least one field must be provided for update");
    }

    if (input.name !== undefined) {
      if (typeof input.name !== "string" || input.name.trim().length === 0) {
        throw new Error("Company name must be a non-empty string");
      }
      if (input.name.trim().length > 255) {
        throw new Error("Company name must be 255 characters or less");
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

export const clientCompanyManager = new ClientCompanyManager();
