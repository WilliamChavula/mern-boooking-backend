import { beforeAll, afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { logger } from "../src/utils/logger";

let mongoServer: MongoMemoryServer;

// Setup MongoDB Memory Server before all tests
beforeAll(async () => {
  try {
    // Disable logging during tests
    logger.silent = true;

    // Create MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(mongoUri);

    console.log("✓ Connected to MongoDB Memory Server");
  } catch (error) {
    console.error("Failed to setup test database:", error);
    throw error;
  }
});

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log("✓ Disconnected from MongoDB Memory Server");
  } catch (error) {
    console.error("Failed to cleanup test database:", error);
  }
});
