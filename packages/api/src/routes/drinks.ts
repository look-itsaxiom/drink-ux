import { Router, Request, Response } from "express";
import { Drink, DrinkCategory, ApiResponse } from "@drink-ux/shared";

const router = Router();

// Mock data for demonstration
const mockDrinks: Drink[] = [
  {
    id: "1",
    name: "Classic Latte",
    description: "Espresso with steamed milk",
    basePrice: 4.5,
    category: DrinkCategory.COFFEE,
    customizations: [],
  },
];

// GET all drinks
router.get("/", (req: Request, res: Response) => {
  const response: ApiResponse<Drink[]> = {
    success: true,
    data: mockDrinks,
  };
  res.json(response);
});

// GET drink by ID
router.get("/:id", (req: Request, res: Response) => {
  const drink = mockDrinks.find((d) => d.id === req.params.id);
  if (drink) {
    const response: ApiResponse<Drink> = {
      success: true,
      data: drink,
    };
    res.json(response);
  } else {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Drink not found" },
    });
  }
});

export const drinkRoutes = router;
