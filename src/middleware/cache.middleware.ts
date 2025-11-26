import { Request, Response, NextFunction } from 'express';
import { CacheService, CacheOptions } from '../services/cache.service';
import { logger } from '../utils/logger';

export interface CacheMiddlewareOptions extends CacheOptions {
    keyGenerator?: (req: Request) => string;
}

/**
 * Middleware to cache GET request responses
 * Only caches successful responses (200 status)
 */
export const cacheMiddleware = (options: CacheMiddlewareOptions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        try {
            // Generate cache key
            const cacheKey = options.keyGenerator
                ? options.keyGenerator(req)
                : `${req.originalUrl || req.url}`;

            // Try to get from cache
            const cached = await CacheService.get(cacheKey, {
                prefix: options.prefix,
            });

            if (cached) {
                logger.debug('Serving from cache', {
                    key: cacheKey,
                    path: req.path,
                    correlationId: req.correlationId,
                });
                return res.json(cached);
            }

            // Store original res.json
            const originalJson = res.json.bind(res);

            // Override res.json to cache the response
            res.json = function (data: any) {
                // Only cache successful responses
                if (res.statusCode === 200) {
                    CacheService.set(cacheKey, data, {
                        ttl: options.ttl,
                        prefix: options.prefix,
                    }).catch(error => {
                        logger.error('Failed to cache response', {
                            key: cacheKey,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : 'Unknown error',
                        });
                    });
                }
                return originalJson(data);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                path: req.path,
            });
            next();
        }
    };
};

/**
 * Middleware to invalidate cache based on request
 */
export const invalidateCacheMiddleware = (
    getPattern: (req: Request) => string,
    options?: CacheOptions
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Store original methods
            const originalJson = res.json.bind(res);
            const originalSend = res.send.bind(res);

            const invalidateCache = async () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const pattern = getPattern(req);
                    await CacheService.invalidate(pattern, options);
                    logger.debug('Cache invalidated', {
                        pattern,
                        status: res.statusCode,
                        correlationId: req.correlationId,
                    });
                }
            };

            // Override response methods
            res.json = function (data: any) {
                invalidateCache();
                return originalJson(data);
            };

            res.send = function (data: any) {
                invalidateCache();
                return originalSend(data);
            };

            next();
        } catch (error) {
            logger.error('Cache invalidation middleware error', {
                error: error instanceof Error ? error.message : 'Unknown error',
                path: req.path,
            });
            next();
        }
    };
};
