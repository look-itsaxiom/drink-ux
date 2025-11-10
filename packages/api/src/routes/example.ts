import { Router, Request, Response } from "express";
import { ApiResponse } from "@drink-ux/shared";
import prisma from "../database";

const router = Router();

// Example GET endpoint
router.get("/", async (req: Request, res: Response) => {
  try {
    const response: ApiResponse<string> = {
      success: true,
      data: "Hello from the API!",
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred",
      },
    };
    res.status(500).json(response);
  }
});

// Example database query
router.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    const response: ApiResponse<typeof users> = {
      success: true,
      data: users,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch users",
      },
    };
    res.status(500).json(response);
  }
});

// Example POST endpoint
router.post("/users", async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Email is required",
        },
      };
      return res.status(400).json(response);
    }

    const user = await prisma.user.create({
      data: { email, name },
    });

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create user",
      },
    };
    res.status(500).json(response);
  }
});

export const exampleRoutes = router;
