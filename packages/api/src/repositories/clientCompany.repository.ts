import { ClientCompany, ClientTheme, POSIntegration } from "../../generated/prisma";
import prisma from "../database";

// Base interface for ClientCompany data
export interface ClientCompanyBase {
  id: string;
  name: string;
  pointOfContact: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientCompanyWithRelations extends ClientCompanyBase {
  theme?: ClientTheme | null;
  posIntegration?: POSIntegration | null;
}

export interface CreateClientCompanyData {
  name: string;
  pointOfContact: string;
}

export interface UpdateClientCompanyData {
  name?: string;
  pointOfContact?: string;
}

export class ClientCompanyRepository {
  /**
   * Find all client companies with optional relations
   */
  async findAll(includeRelations = true): Promise<ClientCompanyWithRelations[]> {
    return await prisma.clientCompany.findMany({
      include: includeRelations
        ? {
            theme: true,
            posIntegration: true,
          }
        : undefined,
    });
  }

  /**
   * Find a client company by ID with optional relations
   */
  async findById(id: string, includeRelations = true): Promise<ClientCompanyWithRelations | null> {
    return await prisma.clientCompany.findUnique({
      where: { id },
      include: includeRelations
        ? {
            theme: true,
            posIntegration: true,
          }
        : undefined,
    });
  }

  /**
   * Find a client company by name
   */
  async findByName(name: string, includeRelations = true): Promise<ClientCompanyWithRelations | null> {
    return await prisma.clientCompany.findFirst({
      where: { name },
      include: includeRelations
        ? {
            theme: true,
            posIntegration: true,
          }
        : undefined,
    });
  }

  /**
   * Create a new client company
   */
  async create(data: CreateClientCompanyData): Promise<ClientCompany> {
    return await prisma.clientCompany.create({
      data,
    });
  }

  /**
   * Update a client company by ID
   */
  async updateById(id: string, data: UpdateClientCompanyData): Promise<ClientCompany | null> {
    try {
      return await prisma.clientCompany.update({
        where: { id },
        data,
      });
    } catch (error) {
      // If record not found, return null
      if ((error as any).code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a client company by ID
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      await prisma.clientCompany.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      // If record not found, return false
      if ((error as any).code === "P2025") {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if a client company exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    const count = await prisma.clientCompany.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Check if a client company exists by name
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await prisma.clientCompany.count({
      where: { name },
    });
    return count > 0;
  }

  /**
   * Get the total count of client companies
   */
  async count(): Promise<number> {
    return await prisma.clientCompany.count();
  }
}

export const clientCompanyRepository = new ClientCompanyRepository();
