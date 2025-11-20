import express from "express";
import type { Request, Response, NextFunction, Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { v2 as cloudinary } from "cloudinary";

import { connect } from "mongoose";
import { config } from "./config";
import { logger } from "./utils/logger";
import { requestLogger } from "./middleware/request-logger.middleware";
import usersRoute from "./routes/users.route";
import authRoute from "./routes/auth.route";
import myHotelRoute from "./routes/my-hotels.route";
import hotelRoute from "./routes/hotels.route";
import myBookings from "./routes/my-bookings.routes";
import healthRoute from "./routes/health.route";

// Initialize express app
const app: Express = express();
const port = config.PORT;

// Request logging middleware (should be first)
app.use(requestLogger);

// Middleware
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check routes
app.use("/api", healthRoute);

app.use("/api/users", usersRoute);
app.use("/api/auth", authRoute);
app.use("/api/my/hotel", myHotelRoute);
app.use("/api/hotels", hotelRoute);
app.use("/api/my-bookings", myBookings);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    correlationId: (req as any).correlationId,
    method: req.method,
    url: req.url,
  });

  res.status(500).json({
    status: "error",
    message: "An unexpected error occurred",
    correlationId: (req as any).correlationId,
  });
});

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB if connection string is provided
    await connect(config.MONGODB_URI);
    logger.info("Connected to MongoDB", {
      database: config.MONGODB_URI.split("@")[1]?.split("/")[0] || "unknown",
    });

    cloudinary.config({
      cloud_name: config.CLOUDINARY_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET,
      secure: true,
    });
    logger.info("Cloudinary configured");

    app.listen(port, (error) => {
      if (error) {
        logger.error("Failed to start server", { error: error.message });
        throw error;
      }
      logger.info(`Server running on port ${port}`, {
        environment: config.NODE_ENV,
        port,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      process.exit(0);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      logger.error("Uncaught Exception", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: any) => {
      logger.error("Unhandled Rejection", {
        reason: reason?.message || reason,
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
};

export { app, startServer };
