import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

import { config } from '../config';
import type { TokenResponseSchema } from '../schemas/users.schema';
import { logger } from '../utils/logger';
import {
    LoginSchema,
    LoginResponse,
    loginSchema,
} from '../schemas/auth.schema';
import { parseZodError } from '../utils/parse-zod-error';

export function verifyToken(
    req: Request,
    res: Response<TokenResponseSchema>,
    next: NextFunction
) {
    const token = req.cookies['auth_token'] as string;
    if (!token) {
        logger.warn('No token provided in request');
        res.status(401).json({
            success: false,
            message: 'No token provided',
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.SECRET_KEY);

        if (!decoded) {
            logger.warn('Invalid token provided');
            res.status(401).json({
                success: false,
                message: 'Invalid token provided',
            });
            return;
        }

        const payload = decoded as JwtPayload;

        req.user = payload.user;
    } catch (e) {
        logger.error('Error verifying token', { error: (e as Error).message });
        res.status(401).json({
            success: false,
            message: 'Unable to validate token',
        });
    } finally {
        next();
    }
}

export const loginPayloadValidatorMiddleware = async (
    req: Request<{}, {}, LoginSchema>,
    res: Response<LoginResponse>,
    next: NextFunction
) => {
    const validated = await loginSchema.safeParseAsync(req.body);
    if (!validated.success) {
        logger.warn('Invalid login payload', { error: validated.error });
        res.status(400).json({
            success: false,
            message: 'Failed to login',
            error: parseZodError(validated.error),
        });

        return;
    }

    next();
};
