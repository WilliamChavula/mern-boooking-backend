import { beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../src/utils/logger';
import { Role, RoleName } from '../src/models/role.model';

let mongoServer: MongoMemoryServer;

// Setup MongoDB Memory Server before all tests
beforeAll(async () => {
    try {
        // Disable logging during tests
        logger.silent = true;

        // Set test environment
        process.env.NODE_ENV = 'test';

        // Create MongoDB Memory Server
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        // Connect to the in-memory database
        await mongoose.connect(mongoUri);

        console.log('✓ Connected to MongoDB Memory Server');

        // Create default role for tests
        await Role.create({
            name: RoleName.USER,
            description: 'Default user role',
            permissions: [],
        });

        console.log('✓ Created default USER role');
    } catch (error) {
        console.error('Failed to setup test database:', error);
        throw error;
    }
});

// Clean up after each test
afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            // Don't delete the Role collection to keep default role
            if (key !== 'roles') {
                await collections[key].deleteMany({});
            }
        }
    }
});

// Cleanup after all tests
afterAll(async () => {
    try {
        await mongoose.disconnect();
        await mongoServer.stop();
        console.log('✓ Disconnected from MongoDB Memory Server');
    } catch (error) {
        console.error('Failed to cleanup test database:', error);
    }
});
