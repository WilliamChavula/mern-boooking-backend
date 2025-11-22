import { z } from 'zod';
import { PermissionName } from '../models/permission.model';
import { RoleName } from '../models/role.model';

/**
 * Schema for assigning permissions to a user
 */
export const assignPermissionsSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    permissions: z
        .array(z.nativeEnum(PermissionName))
        .min(1, 'At least one permission is required'),
});

export type AssignPermissionsSchema = z.infer<typeof assignPermissionsSchema>;

/**
 * Schema for creating a role
 */
export const createRoleSchema = z.object({
    name: z.nativeEnum(RoleName),
    description: z.string().min(1, 'Role description is required'),
    permissions: z
        .array(z.nativeEnum(PermissionName))
        .min(1, 'At least one permission is required'),
});

export type CreateRoleSchema = z.infer<typeof createRoleSchema>;

/**
 * Schema for updating user role
 */
export const updateUserRoleSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    role: z.nativeEnum(RoleName),
});

export type UpdateUserRoleSchema = z.infer<typeof updateUserRoleSchema>;

/**
 * Schema for checking permissions
 */
export const checkPermissionSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    permission: z.nativeEnum(PermissionName),
});

export type CheckPermissionSchema = z.infer<typeof checkPermissionSchema>;

/**
 * Response schema for permission operations
 */
export const permissionResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.any().optional(),
    error: z.string().optional(),
});

export type PermissionResponseSchema = z.infer<typeof permissionResponseSchema>;
