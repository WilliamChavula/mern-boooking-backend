import { CorsOptions } from 'cors';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * List of allowed origins
 * In production, only specific domains should be allowed
 */
const getAllowedOrigins = (): string[] => {
    const origins: string[] = [];

    // Add frontend URL from config
    if (config.FRONTEND_URL) {
        origins.push(config.FRONTEND_URL);
    }

    // In development, allow localhost variations
    if (config.NODE_ENV === 'development') {
        origins.push(
            'http://localhost:3000',
            'http://localhost:5173', // Vite default
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173'
        );
    }

    return origins;
};

/**
 * CORS configuration
 * Controls which domains can access the API
 */
export const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins();

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn('CORS blocked request from unauthorized origin', {
                origin,
                allowedOrigins,
            });
            callback(new Error('Not allowed by CORS'));
        }
    },

    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Allowed headers
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Correlation-ID',
    ],

    // Exposed headers (headers that client can access)
    exposedHeaders: [
        'X-Correlation-ID',
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
    ],

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Cache preflight requests for 1 hour
    maxAge: 3600,

    // Enable preflight for all routes
    preflightContinue: false,

    // Return 204 for successful OPTIONS requests
    optionsSuccessStatus: 204,
};

/**
 * Development CORS configuration
 * More permissive for easier development
 */
export const corsDevOptions: CorsOptions = {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Correlation-ID',
    ],
    exposedHeaders: ['X-Correlation-ID'],
    credentials: true,
    maxAge: 3600,
    optionsSuccessStatus: 204,
};

/**
 * Get appropriate CORS configuration based on environment
 */
export const getCorsOptions = (): CorsOptions => {
    return config.NODE_ENV === 'production' ? corsOptions : corsDevOptions;
};
