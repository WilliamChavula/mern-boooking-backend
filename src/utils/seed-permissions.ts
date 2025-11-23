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
            {
                name: PermissionName.PERMISSIONS_ASSIGN,
                description: 'Permission to assign permissions to roles/users',
            },
            {
                name: PermissionName.PERMISSIONS_REVOKE,
                description:
                    'Permission to revoke permissions from roles/users',
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
        const assignPermission = await Permission.findOne({
            name: PermissionName.PERMISSIONS_ASSIGN,
        });
        const revokePermission = await Permission.findOne({
            name: PermissionName.PERMISSIONS_REVOKE,
        });

        if (
            !readPermission ||
            !bookPermission ||
            !createPermission ||
            !editPermission ||
            !deletePermission ||
            !assignPermission ||
            !revokePermission
        ) {
            throw new Error(
                'Permissions not found. Please seed permissions first.'
            );
        }
        // Anonymous role: can only read hotels
        await Role.findOneAndUpdate(
            { name: RoleName.ANONYMOUS },
            {
                name: RoleName.ANONYMOUS,
                description: 'Anonymous user - limited access',
                permissions: [readPermission._id],
            },
            { upsert: true, new: true }
        );

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

        // Super Admin role: can do everything plus manage permissions
        await Role.findOneAndUpdate(
            { name: RoleName.SUPER_ADMIN },
            {
                name: RoleName.SUPER_ADMIN,
                description: 'Hotel administrator - full permissions',
                permissions: [
                    readPermission._id,
                    bookPermission._id,
                    createPermission._id,
                    editPermission._id,
                    deletePermission._id,
                    assignPermission._id,
                    revokePermission._id,
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
            password: config.HOTEL_ADMIN_PASSWORD,
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

const seedSuperAdminUser = async () => {
    try {
        const superAdminEmail = 'super-admin@hotel-booking.com';
        const superAdminRole = await Role.findOne({
            name: RoleName.SUPER_ADMIN,
        });

        if (!superAdminRole) {
            throw new Error(
                'Super Admin role not found. Please seed roles first.'
            );
        }

        // Check if super admin user already exists
        const existingSuperAdmin = await User.findOne({
            email: superAdminEmail,
        });

        if (existingSuperAdmin) {
            logger.info('Super Admin user already exists', {
                email: superAdminEmail,
            });
            return;
        }

        // Create super admin user
        const superAdminUser = await User.create({
            email: superAdminEmail,
            password: config.SUPER_ADMIN_PASSWORD,
            firstName: 'Super',
            lastName: 'Administrator',
            role: superAdminRole._id,
        });

        logger.info('Super Admin user created successfully', {
            userId: superAdminUser._id,
            email: superAdminEmail,
        });
        logger.warn(
            'IMPORTANT: Change the default super admin password immediately!'
        );
    } catch (error) {
        logger.error('Error seeding super admin user', {
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
        await seedSuperAdminUser();

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
    seedSuperAdminUser,
};
