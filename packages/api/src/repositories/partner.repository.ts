import { Partner, PartnerTheme, POSIntegration } from "../../generated/prisma";
import prisma from "../database";

// Base interface for Partner data
export interface PartnerBase {
  id: string;
  name: string;
  pointOfContact: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerWithRelations extends PartnerBase {
  theme?: PartnerTheme | null;
  posIntegration?: POSIntegration | null;
}

export interface CreatePartnerData {
  name: string;
  pointOfContact: string;
}

export interface UpdatePartnerData {
  name?: string;
  pointOfContact?: string;
}

export class PartnerRepository {
  /**
   * Find all partners with optional relations
   */
  async findAll(includeRelations = true): Promise<PartnerWithRelations[]> {
    return await prisma.partner.findMany({
      include: includeRelations
        ? {
            theme: true,
            posIntegration: true,
          }
        : undefined,
    });
  }

  /**
   * Find a partner by ID with optional relations
   */
  async findById(id: string, includeRelations = true): Promise<PartnerWithRelations | null> {
    return await prisma.partner.findUnique({
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
   * Find a partner by name
   */
  async findByName(name: string, includeRelations = true): Promise<PartnerWithRelations | null> {
    return await prisma.partner.findFirst({
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
   * Create a new partner
   */
  async create(data: CreatePartnerData): Promise<Partner> {
    return await prisma.partner.create({
      data,
    });
  }

  /**
   * Update a partner by ID
   */
  async updateById(id: string, data: UpdatePartnerData): Promise<Partner | null> {
    try {
      return await prisma.partner.update({
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
   * Delete a partner by ID
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      await prisma.partner.delete({
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
   * Check if a partner exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    const count = await prisma.partner.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Check if a partner exists by name
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await prisma.partner.count({
      where: { name },
    });
    return count > 0;
  }

  /**
   * Get the total count of partners
   */
  async count(): Promise<number> {
    return await prisma.partner.count();
  }
}

export const partnerRepository = new PartnerRepository();
