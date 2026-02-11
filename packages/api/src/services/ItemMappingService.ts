import { PrismaClient, ItemType, ItemMapping } from '../../generated/prisma';

export class ItemMappingError extends Error {
  constructor(
    message: string,
    public code: 'BUSINESS_NOT_FOUND' | 'DUPLICATE_MAPPING' | 'MAPPING_NOT_FOUND'
  ) {
    super(message);
    this.name = 'ItemMappingError';
  }
}

interface SquareItem {
  id: string;
  name: string;
}

interface UpdateMappingData {
  itemType?: ItemType;
  category?: string;
  displayName?: string;
  displayOrder?: number;
}

export class ItemMappingService {
  constructor(private prisma: PrismaClient) {}

  async createMapping(
    businessId: string,
    squareItemId: string,
    itemType: ItemType,
    category?: string
  ): Promise<ItemMapping> {
    // Check if business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new ItemMappingError('Business not found', 'BUSINESS_NOT_FOUND');
    }

    // Check for duplicate mapping
    const existing = await this.prisma.itemMapping.findUnique({
      where: {
        businessId_squareItemId: { businessId, squareItemId },
      },
    });

    if (existing) {
      throw new ItemMappingError('Mapping already exists', 'DUPLICATE_MAPPING');
    }

    return this.prisma.itemMapping.create({
      data: {
        businessId,
        squareItemId,
        itemType,
        category: category ?? null,
      },
    });
  }

  async getMappings(businessId: string): Promise<ItemMapping[]> {
    return this.prisma.itemMapping.findMany({
      where: { businessId },
    });
  }

  async updateMapping(id: string, data: UpdateMappingData): Promise<ItemMapping> {
    // Check if mapping exists
    const existing = await this.prisma.itemMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ItemMappingError('Mapping not found', 'MAPPING_NOT_FOUND');
    }

    return this.prisma.itemMapping.update({
      where: { id },
      data,
    });
  }

  async deleteMapping(id: string): Promise<void> {
    // Check if mapping exists
    const existing = await this.prisma.itemMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ItemMappingError('Mapping not found', 'MAPPING_NOT_FOUND');
    }

    await this.prisma.itemMapping.delete({
      where: { id },
    });
  }

  async getUnmappedItems(
    businessId: string,
    squareItems: SquareItem[]
  ): Promise<SquareItem[]> {
    if (squareItems.length === 0) {
      return [];
    }

    const mappings = await this.prisma.itemMapping.findMany({
      where: { businessId },
      select: { squareItemId: true },
    });

    const mappedIds = new Set(mappings.map((m) => m.squareItemId));

    return squareItems.filter((item) => !mappedIds.has(item.id));
  }
}
