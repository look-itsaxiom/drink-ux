import { POSIntegration } from "../../generated/prisma";
import prisma from "../database";

export interface CreatePOSIntegrationData {
  companyId: string;
  provider: string;
  isActive: boolean;
}

export interface UpdatePOSIntegrationData {
  provider?: string;
  isActive?: boolean;
}

/**
 * Repository for POS Integration data access
 */
export class POSIntegrationRepository {
  /**
   * Find POS integration by company ID
   */
  async findByCompanyId(companyId: string): Promise<POSIntegration | null> {
    return await prisma.pOSIntegration.findFirst({
      where: { companyId },
    });
  }

  /**
   * Find POS integration by ID
   */
  async findById(id: string): Promise<POSIntegration | null> {
    return await prisma.pOSIntegration.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new POS integration
   */
  async create(data: CreatePOSIntegrationData): Promise<POSIntegration> {
    return await prisma.pOSIntegration.create({
      data,
    });
  }

  /**
   * Update a POS integration by ID
   */
  async update(id: string, data: UpdatePOSIntegrationData): Promise<POSIntegration | null> {
    try {
      return await prisma.pOSIntegration.update({
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
   * Update last sync time for a company's POS integration
   */
  async updateLastSyncTime(companyId: string): Promise<POSIntegration | null> {
    const integration = await this.findByCompanyId(companyId);
    if (!integration) {
      return null;
    }

    return await prisma.pOSIntegration.update({
      where: { id: integration.id },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * Delete a POS integration
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.pOSIntegration.delete({
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
   * Check if a POS integration exists for a company
   */
  async existsByCompanyId(companyId: string): Promise<boolean> {
    const count = await prisma.pOSIntegration.count({
      where: { companyId },
    });
    return count > 0;
  }
}

export const posIntegrationRepository = new POSIntegrationRepository();
