import type { PermissionName } from '../models/permission.model';

declare global {
    namespace Express {
        interface Request {
            correlationId: string;
            user: {
                userId: string;
                email: string;
                permissions?: PermissionName[];
            };
            anonymous?: boolean;
        }
    }
}
