import mongoSanitize from 'express-mongo-sanitize';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * MongoDB sanitization middleware
 * Prevents NoSQL injection attacks by removing $ and . from user input
 */
export const sanitizeMongoData = mongoSanitize({
    // Replace prohibited characters instead of removing them
    replaceWith: '_',

    // Also sanitize these keys
    onSanitize: ({ req, key }) => {
        logger.warn('Sanitized potentially malicious input', {
            key,
            ip: req.ip,
            path: req.path,
            correlationId: req.correlationId,
        });
    },
});

/**
 * Additional input sanitization middleware
 * Sanitizes common XSS patterns and trims whitespace
 */
export const sanitizeInput = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    // Sanitize body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }

    // // Sanitize query parameters
    // if (req.query) {
    //     req.query = sanitizeObject(req.query);
    // }

    // Sanitize URL parameters
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }

    next();
};

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    // Handle objects
    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }

    // Handle strings
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    // Return other types as-is
    return obj;
}

/**
 * Sanitize a string value
 * - Trim whitespace
 * - Remove null bytes
 * - Basic XSS prevention
 */
function sanitizeString(str: string): string {
    // Trim whitespace
    let sanitized = str.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove common XSS patterns (basic protection, CSP is primary defense)
    sanitized = sanitized.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ''
    );
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    return sanitized;
}

/**
 * Validate and sanitize email addresses
 */
export const sanitizeEmail = (email: string): string => {
    if (!email) return email;

    // Convert to lowercase
    let sanitized = email.toLowerCase().trim();

    // Remove any potentially dangerous characters
    sanitized = sanitized.replace(/[<>]/g, '');

    return sanitized;
};

/**
 * Validate and sanitize MongoDB ObjectIDs
 */
export const sanitizeObjectId = (id: string): string => {
    if (!id) return id;

    // Remove any non-alphanumeric characters except the allowed ones
    return id.replace(/[^a-f0-9]/gi, '');
};

/**
 * Sanitize file paths to prevent directory traversal
 */
export const sanitizeFilePath = (path: string): string => {
    if (!path) return path;

    // Remove directory traversal attempts
    let sanitized = path.replace(/\.\./g, '');

    // Remove leading/trailing slashes
    sanitized = sanitized.replace(/^\/+|\/+$/g, '');

    return sanitized;
};

/**
 * HTML entity encoder for output
 * Use this when rendering user input in HTML
 */
export const encodeHTML = (str: string): string => {
    const htmlEntities: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return str.replace(/[&<>"'\/]/g, match => htmlEntities[match]);
};
