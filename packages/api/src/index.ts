import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Database
import prisma from "./database";

// POS Adapters
import { MockPOSAdapter } from "./adapters/pos/MockPOSAdapter";
import { SquareAdapter } from "./adapters/pos/SquareAdapter";

// Services
import { AuthService } from "./services/AuthService";
import { CatalogService } from "./services/CatalogService";
import { OrderService } from "./services/OrderService";
import { OnboardingService } from "./services/OnboardingService";
import { HealthCheckService } from "./services/HealthCheckService";
import { EjectionService } from "./services/EjectionService";
import { AccountStateService } from "./services/AccountStateService";
import { AccountService } from "./services/AccountService";
import { WebhookService } from "./services/WebhookService";
import { ItemMappingService } from "./services/ItemMappingService";

// Routes
import { createAuthRouter } from "./routes/auth";
import { createCatalogRouter } from "./routes/catalog";
import { createOrderRouter, createBusinessOrdersRouter } from "./routes/orders";
import { createOnboardingRouter } from "./routes/onboarding";
import { createHealthRoutes } from "./routes/health";
import { createBusinessRouter } from "./routes/business";
import { createAccountRouter } from "./routes/account";
import { createEjectionRouter } from "./routes/ejection";
import { createSubscriptionRouter } from "./routes/subscription";
import { createSubscriptionWebhooksRouter } from "./routes/subscriptionWebhooks";
import { catalogSyncRouter } from "./routes/catalogSync";
import { posRouter } from "./routes/pos";
import { createMappingsRouter } from "./routes/mappings";

// Middleware
import { errorHandler } from "./middleware/errorHandler";

const app: Application = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN?.split(",") || [
  "http://localhost:3000",
  "http://localhost:3002",
];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// =============================================================================
// CREATE SERVICES
// =============================================================================

// Create POS adapter based on environment configuration
const squareAppId = process.env.SQUARE_APPLICATION_ID || process.env.SQUARE_APP_ID;
const squareAppSecret = process.env.SQUARE_APPLICATION_SECRET || process.env.SQUARE_APP_SECRET;
const useSquare = squareAppId && squareAppSecret;
const posAdapter = useSquare ? new SquareAdapter() : new MockPOSAdapter();

// Services that just need prisma
const authService = new AuthService(prisma);
const catalogService = new CatalogService(prisma);
const ejectionService = new EjectionService(prisma);
const accountStateService = new AccountStateService(prisma);
const accountService = new AccountService(prisma);
const itemMappingService = new ItemMappingService(prisma);

// Services that need prisma + POS adapter
const orderService = new OrderService(prisma, posAdapter);
const onboardingService = new OnboardingService(prisma, posAdapter);

// Health check service needs a POS adapter with healthCheck method
const healthCheckAdapter = {
  healthCheck: async () => true, // Mock always healthy
};
const healthCheckService = new HealthCheckService(prisma, healthCheckAdapter);

// Services that need additional configuration
const webhookService = new WebhookService(prisma, {
  webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "dev-webhook-key",
  notificationUrl: process.env.WEBHOOK_NOTIFICATION_URL || "http://localhost:3001/api/webhooks",
});

// =============================================================================
// ROUTES
// =============================================================================

// Health check (no auth required)
app.use("/health", createHealthRoutes(healthCheckService));

// Auth routes
app.use("/api/auth", createAuthRouter(authService, { prisma }));

// Business routes (public business info)
app.use("/api/business", createBusinessRouter(prisma));

// Catalog routes (menu management)
app.use("/api/catalog", createCatalogRouter(catalogService));

// Order routes (customer ordering)
app.use("/api/orders", createOrderRouter(orderService));

// Business orders (for admin/business owner)
app.use("/api/business-orders", createBusinessOrdersRouter(orderService));

// Onboarding routes
app.use("/api/onboarding", createOnboardingRouter(onboardingService));

// Account routes (account state management)
app.use("/api/account", createAccountRouter(authService, accountService));

// Ejection routes
app.use("/api/ejection", createEjectionRouter(authService, ejectionService));

// Subscription routes
app.use("/api/subscription", createSubscriptionRouter(prisma));

// Subscription webhooks (from Square)
app.use("/api/webhooks/subscription", createSubscriptionWebhooksRouter(webhookService));

// Catalog sync routes
app.use("/api/catalog-sync", catalogSyncRouter);

// POS routes
app.use("/api/pos", posRouter);

// Mappings routes
app.use("/api/mappings", createMappingsRouter(itemMappingService));

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handler
app.use(errorHandler);

// =============================================================================
// START SERVER
// =============================================================================

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`CORS origins: ${corsOrigins.join(", ")}`);
    console.log(`POS adapter: ${useSquare ? "Square" : "Mock (set SQUARE_APPLICATION_ID and SQUARE_APPLICATION_SECRET for Square)"}`);
  });
}

export default app;
