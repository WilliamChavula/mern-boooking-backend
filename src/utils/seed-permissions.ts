import mongoose from 'mongoose';
import { Permission, PermissionName } from '../models/permission.model';
import { Role, RoleName } from '../models/role.model';
import User from '../models/user.model';
import { config } from '../config';
import { logger } from './logger';

/**
 * Seed permissions in the database
 */
const seedPermissions = async () => {
    try {
        const permissionsData = [
            {
                name: PermissionName.HOTELS_READ,
                description: 'Permission to view/read hotel information',
            },
            {
                name: PermissionName.HOTELS_CREATE,
                description: 'Permission to create new hotels',
            },
            {
                name: PermissionName.HOTELS_EDIT,
                description: 'Permission to edit existing hotels',
            },
            {
                name: PermissionName.HOTELS_DELETE,
                description: 'Permission to delete hotels',
            },
            {
                name: PermissionName.HOTELS_BOOK,
                description: 'Permission to book hotel rooms',
            },
        ];

        for (const permData of permissionsData) {
            await Permission.findOneAndUpdate(
                { name: permData.name },
                permData,
                { upsert: true, new: true }
            );
        }

        logger.info('Permissions seeded successfully', {
            count: permissionsData.length,
        });
    } catch (error) {
        logger.error('Error seeding permissions', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Seed roles with their permissions
 */
const seedRoles = async () => {
    try {
        // Get all permissions
        const readPermission = await Permission.findOne({
            name: PermissionName.HOTELS_READ,
        });
        const bookPermission = await Permission.findOne({
            name: PermissionName.HOTELS_BOOK,
        });
        const createPermission = await Permission.findOne({
            name: PermissionName.HOTELS_CREATE,
        });
        const editPermission = await Permission.findOne({
            name: PermissionName.HOTELS_EDIT,
        });
        const deletePermission = await Permission.findOne({
            name: PermissionName.HOTELS_DELETE,
        });

        if (
            !readPermission ||
            !bookPermission ||
            !createPermission ||
            !editPermission ||
            !deletePermission
        ) {
            throw new Error(
                'Permissions not found. Please seed permissions first.'
            );
        }

        // User role: can read and book hotels
        await Role.findOneAndUpdate(
            { name: RoleName.USER },
            {
                name: RoleName.USER,
                description: 'Regular user - can view and book hotels',
                permissions: [readPermission._id, bookPermission._id],
            },
            { upsert: true, new: true }
        );

        // Hotel Staff role: can do all except edit and delete
        await Role.findOneAndUpdate(
            { name: RoleName.HOTEL_STAFF },
            {
                name: RoleName.HOTEL_STAFF,
                description: 'Hotel staff - can view, book, and create hotels',
                permissions: [
                    readPermission._id,
                    bookPermission._id,
                    createPermission._id,
                ],
            },
            { upsert: true, new: true }
        );

        // Hotel Admin role: can do everything
        await Role.findOneAndUpdate(
            { name: RoleName.HOTEL_ADMIN },
            {
                name: RoleName.HOTEL_ADMIN,
                description: 'Hotel administrator - full permissions',
                permissions: [
                    readPermission._id,
                    bookPermission._id,
                    createPermission._id,
                    editPermission._id,
                    deletePermission._id,
                ],
            },
            { upsert: true, new: true }
        );

        logger.info('Roles seeded successfully', { count: 3 });
    } catch (error) {
        logger.error('Error seeding roles', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Seed admin user
 */
const seedAdminUser = async () => {
    try {
        const adminEmail = 'admin@hotel-booking.com';
        const adminRole = await Role.findOne({ name: RoleName.HOTEL_ADMIN });

        if (!adminRole) {
            throw new Error('Admin role not found. Please seed roles first.');
        }

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            logger.info('Admin user already exists', { email: adminEmail });
            return;
        }

        // Create admin user
        const adminUser = await User.create({
            email: adminEmail,
            password: 'Admin@123456', // Will be hashed by the pre-save hook
            firstName: 'System',
            lastName: 'Administrator',
            role: adminRole._id,
        });

        logger.info('Admin user created successfully', {
            userId: adminUser._id,
            email: adminEmail,
        });
        logger.warn(
            'IMPORTANT: Change the default admin password immediately!'
        );
    } catch (error) {
        logger.error('Error seeding admin user', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Main seeding function
 */
export const seedDatabase = async () => {
    try {
        logger.info('Starting database seeding...');

        // Connect to database if not already connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(config.MONGODB_URI);
            logger.info('Connected to MongoDB for seeding');
        }

        // Seed in order: permissions -> roles -> admin user
        await seedPermissions();
        await seedRoles();
        await seedAdminUser();

        logger.info('Database seeding completed successfully');
    } catch (error) {
        logger.error('Database seeding failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Run seeding if this file is executed directly
 */
if (require.main === module) {
    seedDatabase()
        .then(() => {
            logger.info('Seeding script completed');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Seeding script failed', { error });
            process.exit(1);
        });
}

export default {
    seedPermissions,
    seedRoles,
    seedAdminUser,
    seedDatabase,
};
