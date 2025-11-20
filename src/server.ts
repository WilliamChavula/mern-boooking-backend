import express from "express";
import type { Request, Response, NextFunction, Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { v2 as cloudinary } from "cloudinary";

import { connect } from "mongoose";
import { config } from "./config";
import { logger } from "./utils/logger";
import { redisService } from "./services/redis.service";
import { requestLogger } from "./middleware/request-logger.middleware";
import { getHelmetConfig } from "./middleware/helmet.middleware";
import { getCorsOptions } from "./middleware/cors.middleware";
import {
  apiLimiter,
  authLimiter,
  registrationLimiter,
} from "./middleware/rate-limit.middleware";
import {
  sanitizeMongoData,
  sanitizeInput,
} from "./middleware/sanitize.middleware";
import usersRoute from "./routes/users.route";
import authRoute from "./routes/auth.route";
import myHotelRoute from "./routes/my-hotels.route";
import hotelRoute from "./routes/hotels.route";
import myBookings from "./routes/my-bookings.routes";
import healthRoute from "./routes/health.route";

// Initialize express app
const app: Express = express();
const port = config.PORT;

// Trust proxy (required for rate limiting behind reverse proxy/load balancer)
app.set("trust proxy", 1);

// Security: Helmet - Secure HTTP headers
app.use(getHelmetConfig());

// Request logging middleware (should be early)
app.use(requestLogger);

// Security: CORS - Cross-Origin Resource Sharing
app.use(cors(getCorsOptions()));

// Body parsing middleware
app.use(cookieParser());
app.use(express.json({ limit: "10mb" })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Security: Input sanitization
app.use(sanitizeMongoData); // Prevent NoSQL injection
app.use(sanitizeInput); // Additional input sanitization

// Security: Global rate limiting (applies to all routes)
app.use(apiLimiter);

// Health check routes (exempt from rate limiting)
app.use("/api", healthRoute);

// Apply specific rate limiters to authentication routes
app.use("/api/users/register", registrationLimiter);
app.use("/api/auth/login", authLimiter);

// Application routes
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

    // Connect to Redis (optional - server will continue if Redis fails)
    try {
      await redisService.connect();
    } catch (error) {
      logger.warn("Redis connection failed, continuing without Redis", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

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
      await redisService.disconnect();
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
