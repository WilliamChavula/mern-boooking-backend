import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { redisRateLimiterService } from '../services/redis-rate-limiter.service';

/**
 * Get Redis store for rate limiting
 * Falls back to memory store if Redis is not available
 */
const getStore = () => {
    try {
        if (redisRateLimiterService.isReady()) {
            return new RedisStore({
                sendCommand: (...args: string[]) =>
                    redisRateLimiterService.getClient().sendCommand(args),
                prefix: 'rate-limit:',
            });
        }
    } catch (error) {
        logger.warn(
            'Redis Rate Limiter not available, using memory store for rate limiting',
            {
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        );
    }
    return undefined; // Use default memory store
};

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    store: getStore(),
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            correlationId: (req as any).correlationId,
        });
        res.status(429).json({
            status: 'error',
            message: 'Too many requests, please try again later.',
            retryAfter: res.getHeader('RateLimit-Reset'),
        });
    },
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    store: getStore(),
    skipSuccessfulRequests: false,
    message: {
        status: 'error',
        message: 'Too many login attempts, please try again later.',
    },
    handler: (req: Request, res: Response) => {
        logger.warn('Auth rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            email: req.body?.email,
            correlationId: (req as any).correlationId,
        });
        res.status(429).json({
            status: 'error',
            message:
                'Too many authentication attempts. Please try again in 15 minutes.',
            retryAfter: res.getHeader('RateLimit-Reset'),
        });
    },
});

/**
 * Registration rate limiter
 * Limits: 3 registrations per hour per IP
 * Prevents spam account creation
 */
export const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    store: getStore(),
    skipSuccessfulRequests: true, // Don't count successful registrations
    message: {
        status: 'error',
        message: 'Too many accounts created from this IP.',
    },
    handler: (req: Request, res: Response) => {
        logger.warn('Registration rate limit exceeded', {
            ip: req.ip,
            email: req.body?.email,
            correlationId: (req as any).correlationId,
        });
        res.status(429).json({
            status: 'error',
            message: 'Too many registration attempts. Please try again later.',
            retryAfter: res.getHeader('RateLimit-Reset'),
        });
    },
});

/**
 * Password reset rate limiter
 * Limits: 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    store: getStore(),
    message: {
        status: 'error',
        message: 'Too many password reset attempts.',
    },
    handler: (req: Request, res: Response) => {
        logger.warn('Password reset rate limit exceeded', {
            ip: req.ip,
            email: req.body?.email,
            correlationId: (req as any).correlationId,
        });
        res.status(429).json({
            status: 'error',
            message:
                'Too many password reset requests. Please try again later.',
            retryAfter: res.getHeader('RateLimit-Reset'),
        });
    },
});

/**
 * Booking creation rate limiter
 * Limits: 10 bookings per hour per IP
 * Prevents booking abuse
 */
export const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    store: getStore(),
    message: {
        status: 'error',
        message: 'Too many booking attempts.',
    },
    handler: (req: Request, res: Response) => {
        logger.warn('Booking rate limit exceeded', {
            ip: req.ip,
            userId: (req as any).user?.userId,
            correlationId: (req as any).correlationId,
        });
        res.status(429).json({
            status: 'error',
            message: 'Too many booking requests. Please try again later.',
            retryAfter: res.getHeader('RateLimit-Reset'),
        });
    },
});
