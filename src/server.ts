import express from "express";
import type { Request, Response, NextFunction, Express } from "express";
import cors from "cors";

import { connect } from "mongoose";
import { config } from "./config.ts";
import usersRoute from "./routes/users.route.ts";
import authRoute from "./routes/auth.route.ts";

// Initialize express app
const app: Express = express();
const port = config.PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

app.use("/api/users", usersRoute);
app.use("/api/auth", authRoute);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    status: "error",
    message: "An unexpected error occurred",
  });
});

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB if connection string is provided
    await connect(config.MONGODB_URI);
    console.log("Connected to MongoDB");

    app.listen(port, (error) => {
      if (error) {
        console.log(error);
      }
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

export { app, startServer };
