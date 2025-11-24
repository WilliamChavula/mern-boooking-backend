import { beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../src/utils/logger';
import { Role, RoleName } from '../src/models/role.model';
import { Permission, PermissionName } from '../src/models/permission.model';

// Mock the queue helpers to avoid Redis dependency in tests
vi.mock('../src/utils/queue-helpers', () => ({
    queueImageUpload: vi.fn().mockResolvedValue('test-job-id'),
}));

vi.mock('../src/utils/email-helpers', () => ({
    queueBookingConfirmationEmail: vi.fn().mockResolvedValue('test-job-id'),
    queueEmail: vi.fn().mockResolvedValue('test-job-id'),
}));

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

        // Seed permissions
        const readPermission = await Permission.create({
            name: PermissionName.HOTELS_READ,
            description: 'Permission to view/read hotel information',
        });
        const bookPermission = await Permission.create({
            name: PermissionName.HOTELS_BOOK,
            description: 'Permission to book hotel rooms',
        });
        const createPermission = await Permission.create({
            name: PermissionName.HOTELS_CREATE,
            description: 'Permission to create new hotels',
        });
        const editPermission = await Permission.create({
            name: PermissionName.HOTELS_EDIT,
            description: 'Permission to edit existing hotels',
        });

        // Create default roles with permissions for tests
        await Role.create({
            name: RoleName.USER,
            description: 'Regular user - can view and book hotels',
            permissions: [readPermission._id, bookPermission._id],
        });

        await Role.create({
            name: RoleName.HOTEL_STAFF,
            description: 'Hotel staff - can view, book, and create hotels',
            permissions: [
                readPermission._id,
                bookPermission._id,
                createPermission._id,
                editPermission._id,
            ],
        });

        await Role.create({
            name: RoleName.ANONYMOUS,
            description: 'Anonymous user - limited access',
            permissions: [readPermission._id],
        });

        console.log(
            '✓ Created default USER, HOTEL_STAFF and ANONYMOUS roles with permissions'
        );
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
            // Don't delete the Role and Permission collections to keep seeded data
            if (key !== 'roles' && key !== 'permissions') {
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
