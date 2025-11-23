import type { Request, Response, NextFunction } from 'express';
import { PermissionName } from '../models/permission.model';
import {
    userHasPermission,
    anonymousHasPermission,
} from '../services/permission.service';
import { logger } from '../utils/logger';

/**
 * Generic permission checker middleware factory
 * @param requiredPermission - The permission required to access the route
 * @param options - Optional configuration
 * @param options.allowAnonymous - Whether to allow anonymous access if anonymous role has the permission
 * @returns Express middleware function
 */
export const requirePermission = (
    requiredPermission: PermissionName,
    options?: { allowAnonymous?: boolean }
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Handle anonymous user
            if (req.anonymous || !req.user || !req.user.userId) {
                // Check if anonymous access is allowed for this route
                if (options?.allowAnonymous) {
                    const anonymousAllowed =
                        await anonymousHasPermission(requiredPermission);

                    if (anonymousAllowed) {
                        logger.debug('Anonymous access granted', {
                            requiredPermission,
                        });
                        next();
                        return;
                    }
                }

                // Anonymous not allowed or doesn't have permission
                logger.warn(
                    'Unauthorized access attempt - anonymous user denied',
                    {
                        requiredPermission,
                        allowAnonymous: options?.allowAnonymous,
                    }
                );
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const userId = req.user.userId;

            // Check if user has the required permission
            const hasPermission = await userHasPermission(
                userId,
                requiredPermission
            );

            if (!hasPermission) {
                logger.warn('Forbidden access attempt', {
                    userId,
                    requiredPermission,
                });
                res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                });
                return;
            }

            // User has permission, proceed
            next();
        } catch (error) {
            logger.error('Error in permission middleware', {
                error: error instanceof Error ? error.message : 'Unknown error',
                requiredPermission,
            });
            res.status(500).json({
                success: false,
                message: 'Error checking permissions',
            });
        }
    };
};

/**
 * Policy: Can view/read hotels (allows anonymous users)
 */
export const CanViewHotel = requirePermission(PermissionName.HOTELS_READ, {
    allowAnonymous: true,
});

/**
 * Policy: Can book hotels
 */
export const CanBookHotel = requirePermission(PermissionName.HOTELS_BOOK);

/**
 * Policy: Can create hotels
 */
export const CanCreateHotel = requirePermission(PermissionName.HOTELS_CREATE);

/**
 * Policy: Can edit hotels
 */
export const CanEditHotel = requirePermission(PermissionName.HOTELS_EDIT);

/**
 * Policy: Can delete hotels
 */
export const CanDeleteHotel = requirePermission(PermissionName.HOTELS_DELETE);

/**
 * Policy: Can Assign permissions
 */
export const CanAssignPermissions = requirePermission(
    PermissionName.PERMISSIONS_ASSIGN
);

/**
 * Policy: Can Revoke permissions
 */
export const CanRevokePermissions = requirePermission(
    PermissionName.PERMISSIONS_REVOKE
);

/**
 * Middleware to check if user has ANY of the provided permissions
 * @param permissions - Array of permissions, user needs at least one
 * @param options - Optional configuration
 * @param options.allowAnonymous - Whether to allow anonymous access if anonymous role has any permission
 * @returns Express middleware function
 */
export const requireAnyPermission = (
    permissions: PermissionName[],
    options?: { allowAnonymous?: boolean }
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Handle anonymous user
            if (req.anonymous || !req.user || !req.user.userId) {
                if (options?.allowAnonymous) {
                    const anonymousChecks = await Promise.all(
                        permissions.map(permission =>
                            anonymousHasPermission(permission)
                        )
                    );

                    const anonymousHasAny = anonymousChecks.some(
                        hasPermission => hasPermission
                    );

                    if (anonymousHasAny) {
                        logger.debug(
                            'Anonymous access granted (any permission)',
                            {
                                requiredPermissions: permissions,
                            }
                        );
                        next();
                        return;
                    }
                }

                logger.warn(
                    'Unauthorized access attempt - anonymous user denied'
                );
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const userId = req.user.userId;

            // Check if user has any of the required permissions
            const permissionChecks = await Promise.all(
                permissions.map(permission =>
                    userHasPermission(userId, permission)
                )
            );

            const hasAnyPermission = permissionChecks.some(
                hasPermission => hasPermission
            );

            if (!hasAnyPermission) {
                logger.warn(
                    'Forbidden access attempt - no matching permissions',
                    {
                        userId,
                        requiredPermissions: permissions,
                    }
                );
                res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                });
                return;
            }

            next();
        } catch (error) {
            logger.error('Error in any-permission middleware', {
                error: error instanceof Error ? error.message : 'Unknown error',
                permissions,
            });
            res.status(500).json({
                success: false,
                message: 'Error checking permissions',
            });
        }
    };
};

/**
 * Middleware to check if user has ALL of the provided permissions
 * @param permissions - Array of permissions, user needs all of them
 * @param options - Optional configuration
 * @param options.allowAnonymous - Whether to allow anonymous access if anonymous role has all permissions
 * @returns Express middleware function
 */
export const requireAllPermissions = (
    permissions: PermissionName[],
    options?: { allowAnonymous?: boolean }
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Handle anonymous user
            if (req.anonymous || !req.user || !req.user.userId) {
                if (options?.allowAnonymous) {
                    const anonymousChecks = await Promise.all(
                        permissions.map(permission =>
                            anonymousHasPermission(permission)
                        )
                    );

                    const anonymousHasAll = anonymousChecks.every(
                        hasPermission => hasPermission
                    );

                    if (anonymousHasAll) {
                        logger.debug(
                            'Anonymous access granted (all permissions)',
                            {
                                requiredPermissions: permissions,
                            }
                        );
                        next();
                        return;
                    }
                }

                logger.warn(
                    'Unauthorized access attempt - anonymous user denied'
                );
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            const userId = req.user.userId;

            // Check if user has all required permissions
            const permissionChecks = await Promise.all(
                permissions.map(permission =>
                    userHasPermission(userId, permission)
                )
            );

            const hasAllPermissions = permissionChecks.every(
                hasPermission => hasPermission
            );

            if (!hasAllPermissions) {
                logger.warn('Forbidden access attempt - missing permissions', {
                    userId,
                    requiredPermissions: permissions,
                });
                res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                });
                return;
            }

            next();
        } catch (error) {
            logger.error('Error in all-permissions middleware', {
                error: error instanceof Error ? error.message : 'Unknown error',
                permissions,
            });
            res.status(500).json({
                success: false,
                message: 'Error checking permissions',
            });
        }
    };
};

export const CanManagePermissions = requireAllPermissions([
    PermissionName.PERMISSIONS_ASSIGN,
    PermissionName.PERMISSIONS_REVOKE,
]);
