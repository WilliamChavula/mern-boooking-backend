import express, { type Request, type Response, type Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import { PermissionName } from '../models/permission.model';
import permissionService from '../services/permission.service';
import {
    updateUserRoleSchema,
    type UpdateUserRoleSchema,
    type PermissionResponseSchema,
} from '../schemas/permission.schema';
import { parseZodError } from '../utils/parse-zod-error';
import { logger } from '../utils/logger';
import { CanManagePermissions } from '../middleware/permission.middleware';

const router: Router = express.Router();

/**
 * Get all roles
 * GET /api/permissions/roles
 */
router.get(
    '/roles',
    verifyToken,
    async (_req: Request, res: Response<PermissionResponseSchema>) => {
        try {
            const roles = await permissionService.getAllRoles();

            res.status(200).json({
                success: true,
                message: 'Roles retrieved successfully',
                data: roles,
            });
        } catch (error) {
            logger.error('Error fetching roles', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch roles',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * Get user permissions
 * GET /api/permissions/user/:userId
 */
router.get(
    '/user/:userId',
    verifyToken,
    async (req: Request, res: Response<PermissionResponseSchema>) => {
        try {
            const { userId } = req.params;
            const permissions =
                await permissionService.getUserPermissions(userId);

            res.status(200).json({
                success: true,
                message: 'User permissions retrieved successfully',
                data: { permissions },
            });
        } catch (error) {
            logger.error('Error fetching user permissions', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user permissions',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * Assign role to user (Admin only)
 * PUT /api/permissions/assign-role
 */
router.put(
    '/assign-role',
    verifyToken,
    CanManagePermissions,
    async (
        req: Request<{}, {}, UpdateUserRoleSchema>,
        res: Response<PermissionResponseSchema>
    ) => {
        try {
            const validated = await updateUserRoleSchema.safeParseAsync(
                req.body
            );

            if (!validated.success) {
                const issues = parseZodError(validated.error);
                logger.warn('Invalid role assignment payload', {
                    error: issues,
                });

                res.status(400).json({
                    success: false,
                    message: 'Invalid request data',
                    error: issues.map(e => e.message).join(', '),
                });
                return;
            }

            const { userId, role } = validated.data;
            const user = await permissionService.assignRoleToUser(userId, role);

            res.status(200).json({
                success: true,
                message: 'Role assigned successfully',
                data: user,
            });
        } catch (error) {
            logger.error('Error assigning role', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({
                success: false,
                message: 'Failed to assign role',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * Check if user has permission
 * POST /api/permissions/check
 */
router.post(
    '/check',
    verifyToken,
    async (req: Request, res: Response<PermissionResponseSchema>) => {
        try {
            const { userId, permission } = req.body;

            if (!userId || !permission) {
                res.status(400).json({
                    success: false,
                    message: 'userId and permission are required',
                });
                return;
            }

            const hasPermission = await permissionService.userHasPermission(
                userId,
                permission as PermissionName
            );

            res.status(200).json({
                success: true,
                message: 'Permission check completed',
                data: { hasPermission },
            });
        } catch (error) {
            logger.error('Error checking permission', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({
                success: false,
                message: 'Failed to check permission',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

/**
 * Get current user's permissions
 * GET /api/permissions/me
 */
router.get(
    '/me',
    verifyToken,
    async (req: Request, res: Response<PermissionResponseSchema>) => {
        try {
            if (!req.user || !req.user.userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const permissions = await permissionService.getUserPermissions(
                req.user.userId
            );

            res.status(200).json({
                success: true,
                message: 'Permissions retrieved successfully',
                data: permissions,
            });
        } catch (error) {
            logger.error('Error fetching current user permissions', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch permissions',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

export default router;
