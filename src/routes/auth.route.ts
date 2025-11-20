import express, { type Router, type Request, type Response } from 'express';

import { type LoginResponse, type LoginSchema } from '../schemas/auth.schema';
import usersService from '../services/users.service';
import authService from '../services/auth.service';
import { config } from '../config';
import { loginPayloadValidatorMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router: Router = express.Router();

router.post(
    '/login',
    loginPayloadValidatorMiddleware,
    async (req: Request<{}, {}, LoginSchema>, res: Response<LoginResponse>) => {
        const { email, password } = req.body;
        logger.info('User login attempt', { email, ip: req.ip });

        try {
            const user = await usersService.findByEmail(email);

            if (!user) {
                logger.warn('Failed login attempt - user not found', {
                    email: req.body.email,
                    ip: req.ip,
                });

                res.status(400).json({
                    success: false,
                    message: 'invalid credentials',
                });
                return;
            }

            const passwordsMatch = authService.passwordCompare(
                password,
                user.password
            );

            if (!passwordsMatch) {
                logger.warn('Failed login attempt', {
                    email: req.body.email,
                    ip: req.ip,
                });

                res.status(400).json({
                    success: false,
                    message: 'invalid credentials',
                });
                return;
            }

            logger.info('User login successful', {
                userId: user._id,
                email: user.email,
            });

            const token = await authService.createAuthenticationToken({
                userId: user._id.toString(),
                email: user.email,
            });

            res.cookie('auth_token', token, {
                httpOnly: true,
                secure: config.NODE_ENV === 'production',
                sameSite: config.NODE_ENV !== 'production' ? 'lax' : 'none',
                maxAge: 24 * 60 * 60 * 1000,
            });

            res.status(200).json({
                success: true,
                message: 'Login Success',
                data: {
                    token,
                },
            });
            return;
        } catch (e) {
            logger.error('Login error', { error: (e as Error).message });

            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later',
            });
        }
    }
);

router.post('/logout', async (_req: Request, res: Response) => {
    res.cookie('auth_token', '', {
        expires: new Date(0),
        sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
    });

    logger.info('User logged out');

    res.sendStatus(200);
    return;
});

export default router;
