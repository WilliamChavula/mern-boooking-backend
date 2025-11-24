import { z } from 'zod';
import 'dotenv/config';

const configSchema = z.object({
    PORT: z.coerce.number(),
    MONGODB_URI: z.string(),
    SECRET_KEY: z.string(),
    NODE_ENV: z.enum(['development', 'production', 'test']),
    FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
    CLOUDINARY_API_SECRET: z.string({
        message: 'CLOUDINARY_API_SECRET is Required',
    }),
    CLOUDINARY_NAME: z.string({ message: 'CLOUDINARY_NAME is Required' }),
    CLOUDINARY_API_KEY: z.string({ message: 'CLOUDINARY_API_KEY is Required' }),
    STRIPE_SECRET_KEY: z.string({ message: 'STRIPE_SECRET_KEY is Required' }),
    BACKEND_PROD_URL: z.string(),
    BACKEND_DEV_URL: z.string(),

    // Redis connection URLs - separate instances for different concerns
    REDIS_CACHE_URL: z.string().url('REDIS_CACHE_URL must be a valid URL'),
    REDIS_QUEUE_URL: z.string().url('REDIS_CACHE_URL must be a valid URL'),
    REDIS_RATE_LIMITER_URL: z
        .string()
        .url('REDIS_CACHE_URL must be a valid URL'),
    HOTEL_ADMIN_PASSWORD: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(64, 'Password cannot exceed 64 characters'),
    SUPER_ADMIN_PASSWORD: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(64, 'Password cannot exceed 64 characters'),

    // SMTP Email Configuration
    SMTP_HOST: z.string({ message: 'SMTP_HOST is required' }),
    SMTP_PORT: z.coerce.number({ message: 'SMTP_PORT is required' }),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_USER: z.string({ message: 'SMTP_USER is required' }),
    SMTP_PASS: z.string({ message: 'SMTP_PASS is required' }),
    SMTP_FROM: z.string().email('SMTP_FROM must be a valid email address'),
});

export const config = configSchema.parse(process.env);
