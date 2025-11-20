import { redisService } from './redis.service';
import { logger } from '../utils/logger';

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    prefix?: string;
}

export class CacheService {
    private static readonly DEFAULT_TTL = 3600; // 1 hour
    private static readonly CACHE_PREFIX = 'cache:';

    private static buildKey(key: string, prefix?: string): string {
        const finalPrefix = prefix || this.CACHE_PREFIX;
        return `${finalPrefix}${key}`;
    }

    static async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
        try {
            if (!redisService.isReady()) {
                logger.warn('Redis not ready, cache GET skipped', { key });
                return null;
            }

            const cacheKey = this.buildKey(key, options?.prefix);
            const cached = await redisService.getJSON<T>(cacheKey);

            if (cached) {
                logger.debug('Cache HIT', { key: cacheKey });
                return cached;
            }

            logger.debug('Cache MISS', { key: cacheKey });
            return null;
        } catch (error) {
            logger.error('Cache GET error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    static async set<T>(
        key: string,
        value: T,
        options?: CacheOptions
    ): Promise<boolean> {
        try {
            if (!redisService.isReady()) {
                logger.warn('Redis not ready, cache SET skipped', { key });
                return false;
            }

            const cacheKey = this.buildKey(key, options?.prefix);
            const ttl = options?.ttl || this.DEFAULT_TTL;

            const result = await redisService.setJSON(cacheKey, value, ttl);
            
            if (result) {
                logger.debug('Cache SET', { key: cacheKey, ttl });
            }

            return result;
        } catch (error) {
            logger.error('Cache SET error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    static async del(key: string, options?: CacheOptions): Promise<boolean> {
        try {
            if (!redisService.isReady()) {
                logger.warn('Redis not ready, cache DEL skipped', { key });
                return false;
            }

            const cacheKey = this.buildKey(key, options?.prefix);
            const result = await redisService.del(cacheKey);

            if (result > 0) {
                logger.debug('Cache DEL', { key: cacheKey });
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Cache DEL error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    static async invalidate(pattern: string, options?: CacheOptions): Promise<number> {
        try {
            if (!redisService.isReady()) {
                logger.warn('Redis not ready, cache invalidation skipped', { pattern });
                return 0;
            }

            const cachePattern = this.buildKey(pattern, options?.prefix);
            const count = await redisService.invalidatePattern(cachePattern);

            logger.debug('Cache invalidated', { pattern: cachePattern, count });
            return count;
        } catch (error) {
            logger.error('Cache invalidation error', {
                pattern,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return 0;
        }
    }

    static async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T | null> {
        try {
            // Try to get from cache
            const cached = await this.get<T>(key, options);
            if (cached !== null) {
                return cached;
            }

            // Fetch fresh data
            const data = await fetchFn();
            
            // Store in cache
            await this.set(key, data, options);

            return data;
        } catch (error) {
            logger.error('Cache getOrSet error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    // Cache keys for different entities
    static readonly Keys = {
        hotel: (id: string) => `hotel:${id}`,
        hotels: (query: string) => `hotels:${query}`,
        userHotels: (userId: string) => `user:${userId}:hotels`,
        userBookings: (userId: string) => `user:${userId}:bookings`,
        hotelBookings: (hotelId: string) => `hotel:${hotelId}:bookings`,
    };

    // Cache invalidation patterns
    static readonly Patterns = {
        allHotels: 'cache:hotels:*',
        userHotels: (userId: string) => `cache:user:${userId}:hotels*`,
        hotel: (hotelId: string) => `cache:hotel:${hotelId}*`,
        userBookings: (userId: string) => `cache:user:${userId}:bookings*`,
        hotelBookings: (hotelId: string) => `cache:hotel:${hotelId}:bookings*`,
    };
}
