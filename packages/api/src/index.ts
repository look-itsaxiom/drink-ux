import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { exampleRoutes } from "./routes/example";

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

// Example routes
app.use("/api/example", exampleRoutes);

// Start server only if not in test mode
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

export default app;
