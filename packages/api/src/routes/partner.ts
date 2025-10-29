import { Router, Request, Response } from "express";
import { ApiResponse, Partner } from "@drink-ux/shared";
import { partnerManager, CreatePartnerInput, UpdatePartnerInput } from "../managers/partner.manager";

const router = Router();

/**
 * GET /partners
 * Get all partners
 */
router.get("/", async (req: Request, res: Response<ApiResponse<Partner[]>>) => {
  try {
    const includeRelations = req.query.includeRelations !== "false";
    const partners = await partnerManager.getAllPartners({ includeRelations });

    res.status(200).json({
      success: true,
      data: partners,
    });
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch partners",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * GET /partners/stats
 * Get partner statistics
 */
router.get("/stats", async (req: Request, res: Response<ApiResponse<{ totalPartners: number; partnersWithThemes: number; partnersWithPOS: number }>>) => {
  try {
    const stats = await partnerManager.getPartnerStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching partner stats:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch partner statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * GET /partners/:id
 * Get a partner by ID
 */
router.get("/:id", async (req: Request, res: Response<ApiResponse<Partner>>) => {
  try {
    const { id } = req.params;
    const includeRelations = req.query.includeRelations !== "false";

    const partner = await partnerManager.getPartnerById(id, { includeRelations });

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PARTNER_NOT_FOUND",
          message: `Partner with ID "${id}" not found`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    console.error("Error fetching partner:", error);

    if (error instanceof Error && error.message.includes("Valid partner ID is required")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PARTNER_ID",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch partner",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * POST /partners
 * Create a new partner
 */
router.post("/", async (req: Request<{}, ApiResponse<Partner>, CreatePartnerInput>, res: Response<ApiResponse<Partner>>) => {
  try {
    const input = req.body;
    const partner = await partnerManager.createPartner(input);

    res.status(201).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    console.error("Error creating partner:", error);

    if (error instanceof Error) {
      // Handle validation errors and conflicts
      if (error.message.includes("required") || error.message.includes("must be")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
          },
        });
      }

      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: {
            code: "PARTNER_ALREADY_EXISTS",
            message: error.message,
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create partner",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * PUT /partners/:id
 * Update a partner
 */
router.put("/:id", async (req: Request<{ id: string }, ApiResponse<Partner>, UpdatePartnerInput>, res: Response<ApiResponse<Partner>>) => {
  try {
    const { id } = req.params;
    const input = req.body;

    const partner = await partnerManager.updatePartner(id, input);

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PARTNER_NOT_FOUND",
          message: `Partner with ID "${id}" not found`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    console.error("Error updating partner:", error);

    if (error instanceof Error) {
      // Handle validation errors and conflicts
      if (error.message.includes("Valid partner ID is required")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARTNER_ID",
            message: error.message,
          },
        });
      }

      if (error.message.includes("required") || error.message.includes("must be")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
          },
        });
      }

      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: {
            code: "PARTNER_ALREADY_EXISTS",
            message: error.message,
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update partner",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * DELETE /partners/:id
 * Delete a partner
 */
router.delete("/:id", async (req: Request, res: Response<ApiResponse<{ deleted: boolean }>>) => {
  try {
    const { id } = req.params;
    const deleted = await partnerManager.deletePartner(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PARTNER_NOT_FOUND",
          message: `Partner with ID "${id}" not found`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error("Error deleting partner:", error);

    if (error instanceof Error && error.message.includes("Valid partner ID is required")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PARTNER_ID",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete partner",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

export const partnerRoutes = router;
