// Manual mock that preserves ItemMappingError

export class ItemMappingError extends Error {
  constructor(
    message: string,
    public code: 'BUSINESS_NOT_FOUND' | 'DUPLICATE_MAPPING' | 'MAPPING_NOT_FOUND'
  ) {
    super(message);
    this.name = 'ItemMappingError';
  }
}

export const ItemMappingService = jest.fn().mockImplementation(() => ({
  createMapping: jest.fn(),
  getMappings: jest.fn(),
  updateMapping: jest.fn(),
  deleteMapping: jest.fn(),
  getUnmappedItems: jest.fn(),
}));
