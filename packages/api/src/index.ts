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
import { MappedCatalogService } from "./services/MappedCatalogService";
import { SubscriptionExpiryService } from "./services/SubscriptionExpiryService";

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
import { createMappedCatalogRouter } from "./routes/catalog-mapped";
import { createPaymentRouter } from "./routes/payments";

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
// Priority:
// 1. SQUARE_APPLICATION_ID + SQUARE_APPLICATION_SECRET → full OAuth mode
// 2. SQUARE_ACCESS_TOKEN → dev mode (use token directly)
// 3. Neither → MockPOSAdapter

const squareAppId = process.env.SQUARE_APPLICATION_ID || process.env.SQUARE_APP_ID;
const squareAppSecret = process.env.SQUARE_APPLICATION_SECRET || process.env.SQUARE_APP_SECRET;
const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
const squareMerchantId = process.env.SQUARE_MERCHANT_ID || 'dev-merchant';
const squareLocationId = process.env.SQUARE_LOCATION_ID;

const hasOAuthConfig = !!(squareAppId && squareAppSecret);
const hasDevToken = !!squareAccessToken;

let posAdapter: MockPOSAdapter | SquareAdapter;
let posMode: string;

if (hasOAuthConfig) {
  // Full OAuth mode - SquareAdapter will handle token exchange
  posAdapter = new SquareAdapter();
  posMode = 'Square (OAuth mode)';
} else if (hasDevToken) {
  // Dev mode - use access token directly without OAuth
  posAdapter = new SquareAdapter();
  posAdapter.setCredentials({
    accessToken: squareAccessToken,
    refreshToken: '', // No refresh token in dev mode
    merchantId: squareMerchantId,
    locationId: squareLocationId,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  });
  posMode = 'Square (dev mode - direct token)';
} else {
  // No Square config - use mock adapter
  posAdapter = new MockPOSAdapter();
  posMode = 'Mock (set SQUARE_APPLICATION_ID + SQUARE_APPLICATION_SECRET for OAuth, or SQUARE_ACCESS_TOKEN for dev mode)';
}

// Services that just need prisma
const authService = new AuthService(prisma);
const catalogService = new CatalogService(prisma);
const ejectionService = new EjectionService(prisma);
const accountStateService = new AccountStateService(prisma);
const accountService = new AccountService(prisma);
const itemMappingService = new ItemMappingService(prisma);
const mappedCatalogService = new MappedCatalogService(prisma, posAdapter);
const subscriptionExpiryService = new SubscriptionExpiryService(prisma);

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

// Mapped catalog routes
app.use("/api/catalog", createMappedCatalogRouter(mappedCatalogService));

// Payment routes (processes payment for existing orders)
app.use("/api/orders", createPaymentRouter(prisma));

// Admin: trigger subscription expiry sweep
app.post("/api/admin/subscription-expiry", async (req, res) => {
  try {
    const result = await subscriptionExpiryService.runExpirySweep();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Expiry sweep error:", error);
    res.status(500).json({ success: false, error: { code: "EXPIRY_SWEEP_FAILED", message: "Failed to run expiry sweep" } });
  }
});

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
    console.log(`POS adapter: ${posMode}`);

    // Start periodic subscription expiry checks (every hour)
    subscriptionExpiryService.start();
  });
}

export default app;
