import { Router, Request, Response } from "express";
import { ApiResponse, ClientCompany } from "@drink-ux/shared";
import { clientCompanyManager, CreateClientCompanyInput, UpdateClientCompanyInput } from "../managers/clientCompany.manager";

const router = Router();

/**
 * GET /client-companies
 * Get all client companies
 */
router.get("/", async (req: Request, res: Response<ApiResponse<ClientCompany[]>>) => {
  try {
    const includeRelations = req.query.includeRelations !== "false";
    const companies = await clientCompanyManager.getAllClientCompanies({ includeRelations });

    res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error("Error fetching client companies:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch client companies",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * GET /client-companies/stats
 * Get client company statistics
 */
router.get("/stats", async (req: Request, res: Response<ApiResponse<{ totalCompanies: number; companiesWithThemes: number; companiesWithPOS: number }>>) => {
  try {
    const stats = await clientCompanyManager.getClientCompanyStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching client company stats:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch client company statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * GET /client-companies/:id
 * Get a client company by ID
 */
router.get("/:id", async (req: Request, res: Response<ApiResponse<ClientCompany>>) => {
  try {
    const { id } = req.params;
    const includeRelations = req.query.includeRelations !== "false";

    const company = await clientCompanyManager.getClientCompanyById(id, { includeRelations });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: {
          code: "CLIENT_COMPANY_NOT_FOUND",
          message: `Client company with ID "${id}" not found`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Error fetching client company:", error);

    if (error instanceof Error && error.message.includes("Valid client company ID is required")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_CLIENT_COMPANY_ID",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch client company",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * POST /client-companies
 * Create a new client company
 */
router.post("/", async (req: Request<{}, ApiResponse<ClientCompany>, CreateClientCompanyInput>, res: Response<ApiResponse<ClientCompany>>) => {
  try {
    const input = req.body;
    const company = await clientCompanyManager.createClientCompany(input);

    res.status(201).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Error creating client company:", error);

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
            code: "CLIENT_COMPANY_ALREADY_EXISTS",
            message: error.message,
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create client company",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * PUT /client-companies/:id
 * Update a client company
 */
router.put("/:id", async (req: Request<{ id: string }, ApiResponse<ClientCompany>, UpdateClientCompanyInput>, res: Response<ApiResponse<ClientCompany>>) => {
  try {
    const { id } = req.params;
    const input = req.body;

    const company = await clientCompanyManager.updateClientCompany(id, input);

    if (!company) {
      return res.status(404).json({
        success: false,
        error: {
          code: "CLIENT_COMPANY_NOT_FOUND",
          message: `Client company with ID "${id}" not found`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Error updating client company:", error);

    if (error instanceof Error) {
      // Handle validation errors and conflicts
      if (error.message.includes("Valid client company ID is required")) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CLIENT_COMPANY_ID",
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
            code: "CLIENT_COMPANY_ALREADY_EXISTS",
            message: error.message,
          },
        });
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update client company",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

/**
 * DELETE /client-companies/:id
 * Delete a client company
 */
router.delete("/:id", async (req: Request, res: Response<ApiResponse<{ deleted: boolean }>>) => {
  try {
    const { id } = req.params;
    const deleted = await clientCompanyManager.deleteClientCompany(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: "CLIENT_COMPANY_NOT_FOUND",
          message: `Client company with ID "${id}" not found`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error("Error deleting client company:", error);

    if (error instanceof Error && error.message.includes("Valid client company ID is required")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_CLIENT_COMPANY_ID",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete client company",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
});

export const clientCompanyRoutes = router;
