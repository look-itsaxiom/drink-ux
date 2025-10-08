import { Router, Request, Response } from 'express';
import { Business, ApiResponse } from '@drink-ux/shared';

const router = Router();

// GET business by ID
router.get('/:id', (req: Request, res: Response) => {
  // Mock response
  const mockBusiness: Business = {
    id: req.params.id,
    name: 'Sample Coffee Shop',
    theme: {
      primaryColor: '#6B4226',
      secondaryColor: '#D4A574',
    },
  };
  
  const response: ApiResponse<Business> = {
    success: true,
    data: mockBusiness,
  };
  res.json(response);
});

// PUT update business
router.put('/:id', (req: Request, res: Response) => {
  const updatedBusiness: Business = {
    id: req.params.id,
    ...req.body,
  };
  
  const response: ApiResponse<Business> = {
    success: true,
    data: updatedBusiness,
  };
  res.json(response);
});

export const businessRoutes = router;
