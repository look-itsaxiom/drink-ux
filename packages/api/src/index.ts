import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { drinkRoutes } from "./routes/drinks";
import { orderRoutes } from "./routes/orders";
import { posRoutes } from "./routes/pos";
import { partnerRoutes } from "./routes/partner";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/drinks", drinkRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/partners", partnerRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Drink-UX API server running on port ${PORT}`);
});

export default app;
