import { Router, Request, Response } from 'express';
import { MappedCatalogService, MappedCatalogError, MappedCatalogErrorCode } from '../services/MappedCatalogService';

export function createMappedCatalogRouter(service: MappedCatalogService): Router {
  const router = Router();

  // GET /api/catalog/:businessId/mapped - Get the mapped catalog for a business
  router.get('/:businessId/mapped', async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const catalog = await service.getCatalog(businessId, { allowStale: true });
      res.status(200).json({ success: true, data: catalog });
    } catch (error) {
      const err = error as Error & { code?: MappedCatalogErrorCode };
      
      if (err.code === 'BUSINESS_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Business not found' });
      }
      if (err.code === 'NO_POS_CREDENTIALS') {
        return res.status(424).json({ success: false, error: 'Business has no POS credentials' });
      }
      if (err.code === 'SQUARE_API_ERROR') {
        return res.status(503).json({ success: false, error: 'Catalog temporarily unavailable' });
      }
      
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}
