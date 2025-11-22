import express, { type Request, type Response, type Router } from 'express';

import usersService from '../services/users.service';

import { config } from '../config';
import {
    createUserSchema,
    type CreateUserResponseSchema,
    type CreateUserSchema,
    type TokenResponseSchema,
    UserResponseSchema,
} from '../schemas/users.schema';
import { parseZodError } from '../utils/parse-zod-error';
import { verifyToken } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router: Router = express.Router();

router.post(
    '/register',
    async (
        req: Request<{}, {}, CreateUserSchema>,
        res: Response<CreateUserResponseSchema>
    ) => {
        try {
            const validated = await createUserSchema.safeParseAsync(req.body);
            if (!validated.success) {
                const issues = parseZodError(validated.error);

                logger.error('User registration failed', {
                    error: issues,
                    email: req.body.email,
                });

                res.status(400).send({
                    success: false,
                    message: 'Failed to create user',
                    error: issues,
                });
                return;
            }

            const token = await usersService.createUser(req.body);

            if (!token) {
                logger.error('User creation failed');
                res.status(500).json({
                    success: false,
                    message: 'Failed to create user',
                });
                return;
            }

            res.cookie('auth_token', token, {
                httpOnly: true,
                secure: config.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
            });

            res.status(201).json({
                success: true,
                message: 'User created successfully',
            });
            return;
        } catch (e) {
            if (e instanceof Error && e.message.includes('Duplicate')) {
                res.status(409).json({
                    success: false,
                    message: 'User with this email already exists',
                });
            }

            if (
                e instanceof Error &&
                e.message.includes('User creation failed')
            ) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid user data provided',
                });
            }

            logger.error('User registration error', {
                error: (e as Error).message,
            });
            res.status(500).json({
                success: false,
                message: 'Something went wrong',
            });
        }
    }
);

router.get(
    '/validate-token',
    verifyToken,
    async (req: Request, res: Response<TokenResponseSchema>) => {
        logger.info('Token validated successfully', {
            userId: req.user.userId,
            email: req.user.email,
        });

        res.status(200).json({
            success: true,
            message: 'User validated successfully',
            data: req.user,
        });

        return;
    }
);

router.get(
    '/me',
    verifyToken,
    async (req: Request, res: Response<UserResponseSchema>) => {
        const userId = req.user.userId;

        try {
            logger.info('Fetching user profile', { userId });
            const user = await usersService.findById(userId);

            if (!user) {
                logger.error('User not found', { userId });
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }

            logger.info('User profile fetched successfully', { userId });
            res.status(200).json({
                success: true,
                message: 'User found successfully',
                data: { ...user, _id: user._id.toString() },
            });
        } catch (e) {
            console.log('Error creating Hotels', e);
            res.status(500).json({
                success: false,
                message: 'Something went wrong',
            });
        }
    }
);

export default router;
