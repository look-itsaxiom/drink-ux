import { Router, Request, Response } from 'express';
import { ItemMappingService } from '../services/ItemMappingService';
import { ItemType } from '../../generated/prisma';

const VALID_ITEM_TYPES = ['BASE', 'MODIFIER', 'HIDDEN', 'COMBO'];

export function createMappingsRouter(service: ItemMappingService): Router {
  const router = Router();

  // GET /api/mappings/:businessId - Get all mappings for a business
  router.get('/:businessId', async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const mappings = await service.getMappings(businessId);
      res.status(200).json({ success: true, data: mappings });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/mappings/unmapped - Get unmapped items (must be before POST /)
  router.post('/unmapped', async (req: Request, res: Response) => {
    try {
      const { businessId, squareItems } = req.body;

      if (!businessId) {
        return res.status(400).json({ success: false, error: 'businessId is required' });
      }

      if (squareItems === undefined) {
        return res.status(400).json({ success: false, error: 'squareItems is required' });
      }

      if (!Array.isArray(squareItems)) {
        return res.status(400).json({ success: false, error: 'squareItems must be an array' });
      }

      // Validate each item has id and name
      for (const item of squareItems) {
        if (!item.id || !item.name) {
          return res.status(400).json({ success: false, error: 'Each squareItem must have id and name' });
        }
      }

      const unmapped = await service.getUnmappedItems(businessId, squareItems);
      res.status(200).json({ success: true, data: unmapped });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/mappings - Create a new mapping
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { businessId, squareItemId, itemType, category } = req.body;

      if (!businessId) {
        return res.status(400).json({ success: false, error: 'businessId is required' });
      }

      if (!squareItemId) {
        return res.status(400).json({ success: false, error: 'squareItemId is required' });
      }

      if (!itemType) {
        return res.status(400).json({ success: false, error: 'itemType is required' });
      }

      if (!VALID_ITEM_TYPES.includes(itemType)) {
        return res.status(400).json({ success: false, error: 'Invalid itemType' });
      }

      const mapping = await service.createMapping(businessId, squareItemId, itemType as ItemType, category);
      res.status(201).json({ success: true, data: mapping });
    } catch (error) {
      const err = error as Error & { code?: string };
      // Check by code property or by message pattern
      if (err.code === 'BUSINESS_NOT_FOUND' || err.message?.includes('Business not found')) {
        return res.status(404).json({ success: false, error: 'Business not found' });
      }
      if (err.code === 'DUPLICATE_MAPPING' || err.message?.includes('already exists')) {
        return res.status(409).json({ success: false, error: 'Mapping already exists' });
      }
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // PUT /api/mappings/:id - Update a mapping
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { itemType, category, displayName, displayOrder } = req.body;

      // Check if at least one field is provided
      if (itemType === undefined && category === undefined && displayName === undefined && displayOrder === undefined) {
        return res.status(400).json({ success: false, error: 'At least one field must be provided' });
      }

      // Validate itemType if provided
      if (itemType !== undefined && !VALID_ITEM_TYPES.includes(itemType)) {
        return res.status(400).json({ success: false, error: 'Invalid itemType' });
      }

      const updateData: Record<string, unknown> = {};
      if (itemType !== undefined) updateData.itemType = itemType;
      if (category !== undefined) updateData.category = category;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

      const mapping = await service.updateMapping(id, updateData);
      res.status(200).json({ success: true, data: mapping });
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === 'MAPPING_NOT_FOUND' || err.message?.includes('not found')) {
        return res.status(404).json({ success: false, error: 'Mapping not found' });
      }
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // DELETE /api/mappings/:id - Delete a mapping
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await service.deleteMapping(id);
      res.status(200).json({ success: true });
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === 'MAPPING_NOT_FOUND' || err.message?.includes('not found')) {
        return res.status(404).json({ success: false, error: 'Mapping not found' });
      }
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}
