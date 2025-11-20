import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

const router: Router = Router();

interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: {
      status: "up" | "down";
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: "ok" | "warning" | "critical";
      usage: {
        heapUsed: string;
        heapTotal: string;
        external: string;
        rss: string;
      };
      percentage: number;
    };
  };
}

// Basic health check - for load balancers
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Detailed health check - for monitoring
router.get("/health/detailed", async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Check database connection
    let dbStatus: "up" | "down" = "down";
    let dbResponseTime: number | undefined;
    let dbError: string | undefined;

    try {
      const dbStartTime = Date.now();
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = "up";
    } catch (error) {
      dbError = error instanceof Error ? error.message : "Unknown error";
      logger.error("Database health check failed", { error: dbError });
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const heapUsedPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let memoryStatus: "ok" | "warning" | "critical" = "ok";
    if (heapUsedPercentage > 90) {
      memoryStatus = "critical";
    } else if (heapUsedPercentage > 75) {
      memoryStatus = "warning";
    }

    const healthCheck: HealthCheckResponse = {
      status: dbStatus === "up" ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      checks: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime,
          error: dbError,
        },
        memory: {
          status: memoryStatus,
          usage: {
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
            rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          },
          percentage: parseFloat(heapUsedPercentage.toFixed(2)),
        },
      },
    };

    const statusCode = healthCheck.status === "healthy" ? 200 : 503;
    const totalResponseTime = Date.now() - startTime;

    logger.info("Health check executed", {
      status: healthCheck.status,
      responseTime: `${totalResponseTime}ms`,
    });

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error("Health check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// Readiness check - for Kubernetes
router.get("/ready", async (_req: Request, res: Response) => {
  try {
    // Check if database is ready
    const dbState = mongoose.connection.readyState;
    // 1 = connected, 2 = connecting
    if (dbState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      res.status(200).json({ status: "ready" });
    } else {
      res.status(503).json({ status: "not ready", reason: "database" });
    }
  } catch (error) {
    logger.error("Readiness check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(503).json({ status: "not ready", reason: "database error" });
  }
});

// Liveness check - for Kubernetes
router.get("/live", (_req: Request, res: Response) => {
  res.status(200).json({ status: "alive" });
});

export default router;
