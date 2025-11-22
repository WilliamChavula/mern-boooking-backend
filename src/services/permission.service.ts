import { Permission, PermissionName } from '../models/permission.model';
import { Role, RoleName, type RoleType } from '../models/role.model';
import User from '../models/user.model';
import { logger } from '../utils/logger';

/**
 * Get all permissions for a user based on their role
 * @param userId - The user's ID
 * @returns Array of permission names
 */
export const getUserPermissions = async (
    userId: string
): Promise<PermissionName[]> => {
    try {
        const user = await User.findById(userId).populate({
            path: 'role',
            populate: {
                path: 'permissions',
                model: 'Permission',
            },
        });

        if (!user) {
            logger.warn('User not found when fetching permissions', {
                userId,
            });
            return [];
        }

        const role = user.role as RoleType;
        if (!role || !role.permissions) {
            logger.warn('User has no role or permissions', { userId });
            return [];
        }

        const permissions = role.permissions.map(
            (p: any) => p.name as PermissionName
        );

        logger.debug('Retrieved user permissions', { userId, permissions });
        return permissions;
    } catch (error) {
        logger.error('Error fetching user permissions', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return [];
    }
};

/**
 * Check if a user has a specific permission
 * @param userId - The user's ID
 * @param permission - The permission to check
 * @returns True if user has the permission
 */
export const userHasPermission = async (
    userId: string,
    permission: PermissionName
): Promise<boolean> => {
    try {
        const permissions = await getUserPermissions(userId);
        const hasPermission = permissions.includes(permission);

        logger.debug('Permission check result', {
            userId,
            permission,
            hasPermission,
        });

        return hasPermission;
    } catch (error) {
        logger.error('Error checking user permission', {
            userId,
            permission,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return false;
    }
};

/**
 * Assign a role to a user
 * @param userId - The user's ID
 * @param roleName - The role name to assign
 * @returns Updated user
 */
export const assignRoleToUser = async (userId: string, roleName: RoleName) => {
    try {
        const role = await Role.findOne({ name: roleName });
        if (!role) {
            throw new Error(`Role ${roleName} not found`);
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role: role._id },
            { new: true }
        ).populate({
            path: 'role',
            populate: {
                path: 'permissions',
                model: 'Permission',
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        logger.info('Role assigned to user', { userId, roleName });
        return user;
    } catch (error) {
        logger.error('Error assigning role to user', {
            userId,
            roleName,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Create a new role with permissions
 * @param name - Role name
 * @param description - Role description
 * @param permissionNames - Array of permission names
 * @returns Created role
 */
export const createRole = async (
    name: RoleName,
    description: string,
    permissionNames: PermissionName[]
) => {
    try {
        // Find all permissions
        const permissions = await Permission.find({
            name: { $in: permissionNames },
        });

        if (permissions.length !== permissionNames.length) {
            throw new Error('Some permissions not found');
        }

        // Create role
        const role = await Role.create({
            name,
            description,
            permissions: permissions.map(p => p._id),
        });

        logger.info('Role created', {
            name,
            permissionsCount: permissions.length,
        });
        return role;
    } catch (error) {
        logger.error('Error creating role', {
            name,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Get all roles
 * @returns Array of all roles with permissions
 */
export const getAllRoles = async () => {
    try {
        const roles = await Role.find().populate('permissions');
        return roles;
    } catch (error) {
        logger.error('Error fetching roles', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Get a role by name
 * @param name - Role name
 * @returns Role with permissions
 */
export const getRoleByName = async (name: RoleName) => {
    try {
        const role = await Role.findOne({ name }).populate('permissions');
        return role;
    } catch (error) {
        logger.error('Error fetching role', {
            name,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

export default {
    getUserPermissions,
    userHasPermission,
    assignRoleToUser,
    createRole,
    getAllRoles,
    getRoleByName,
};
