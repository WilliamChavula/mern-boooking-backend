import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * User payload for JWT token
 */
interface UserPayload {
    userId: string;
    email: string;
}

/**
 * Creates a JWT authentication token for a user
 * @param user - User information to encode in the token
 * @returns JWT token string
 * @throws Error if token creation fails
 */
const createAuthenticationToken = async (
    user: UserPayload
): Promise<string> => {
    try {
        // Validate input
        if (!user.userId || !user.email) {
            logger.error('Token creation failed: Missing user data', { user });

            throw new Error('Invalid user data: userId and email are required');
        }

        // Validate SECRET_KEY exists
        if (!config.SECRET_KEY) {
            logger.error('Token creation failed: Missing SECRET_KEY');

            throw new Error('SECRET_KEY is not configured');
        }

        const token = jwt.sign({ user }, config.SECRET_KEY, {
            expiresIn: '1d',
            issuer: 'hotel-booking-api',
            audience: 'hotel-booking-client',
        });

        logger.info('Authentication token created successfully', {
            userId: user.userId,
        });

        return token;
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            logger.error('JWT signing error', { error: error.message });
            throw new Error('Failed to create authentication token');
        }
        logger.error('Token creation error', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Compares a plain text password with a hashed password
 * @param password - Plain text password
 * @param pwdHash - Hashed password to compare against
 * @returns True if passwords match, false otherwise
 * @throws Error if comparison fails
 */
const passwordCompare = async (
    password: string,
    pwdHash: string
): Promise<boolean> => {
    try {
        const isMatch = await bcrypt.compare(password, pwdHash);

        logger.info('Password comparison completed', { isMatch });

        return isMatch;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Password comparison failed: Invalid input', {
                error,
            });
            throw error;
        }
        logger.error('Password comparison error', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to compare passwords');
    }
};

/**
 * Hashes a plain text password
 * @param password - Plain text password to hash
 * @param saltRounds - Number of salt rounds (default: 10)
 * @returns Hashed password
 * @throws Error if hashing fails
 */
const hashPassword = async (
    password: string,
    saltRounds: number = 10
): Promise<string> => {
    try {
        const hash = await bcrypt.hash(password, saltRounds);

        logger.info('Password hashed successfully');

        return hash;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Password hashing failed: Invalid input', {
                error,
            });
            throw error;
        }
        logger.error('Password hashing error', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to hash password');
    }
};

/**
 * Verifies and decodes a JWT token
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
const verifyToken = async (token: string): Promise<UserPayload> => {
    try {
        // Validate SECRET_KEY exists
        if (!config.SECRET_KEY) {
            const error = new Error('SECRET_KEY is not configured');
            logger.error('Token verification failed: Missing SECRET_KEY');
            throw error;
        }

        const decoded = jwt.verify(token, config.SECRET_KEY, {
            issuer: 'hotel-booking-api',
            audience: 'hotel-booking-client',
        }) as { user: UserPayload };

        if (!decoded.user || !decoded.user.userId || !decoded.user.email) {
            const error = new Error('Invalid token payload');
            logger.error('Token verification failed: Malformed payload');
            throw error;
        }

        logger.debug('Token verified successfully', {
            userId: decoded.user.userId,
        });

        return decoded.user;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logger.warn('Token verification failed: Token expired');
            throw new Error('Token has expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            logger.warn('Token verification failed: Invalid token', {
                error: error.message,
            });
            throw new Error('Invalid token');
        }
        logger.error('Token verification error', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

export default {
    createAuthenticationToken,
    passwordCompare,
    hashPassword,
    verifyToken,
};
