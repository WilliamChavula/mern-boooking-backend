import express from "express";
import type { Request, Response, NextFunction, Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { v2 as cloudinary } from "cloudinary";

import { connect } from "mongoose";
import { config } from "./config";
import usersRoute from "./routes/users.route";
import authRoute from "./routes/auth.route";
import myHotelRoute from "./routes/my-hotels.route";

// Initialize express app
const app: Express = express();
const port = config.PORT;

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

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

app.use("/api/users", usersRoute);
app.use("/api/auth", authRoute);
app.use("/api/my/hotel", myHotelRoute);

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

    cloudinary.config({
      cloud_name: config.CLOUDINARY_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET,
      secure: true,
    });

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
