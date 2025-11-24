import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { redisCacheService } from '../../src/services/redis-cache.service';
import { CacheService } from '../../src/services/cache.service';

describe('Redis Service', () => {
    beforeAll(async () => {
        // Connect to Redis before tests
        try {
            await redisCacheService.connect();
        } catch (error) {
            console.warn('Redis not available for tests');
        }
    });

    afterAll(async () => {
        // Disconnect after all tests
        await redisCacheService.disconnect();
    });

    beforeEach(async () => {
        // Clear test keys before each test
        if (redisCacheService.isReady()) {
            await redisCacheService.invalidatePattern('test:*');
        }
    });

    describe('Connection', () => {
        it('should connect to Redis', () => {
            if (process.env.REDIS_URL) {
                expect(redisCacheService.isReady()).toBe(true);
            } else {
                console.log('Skipping - REDIS_URL not configured');
            }
        });
    });

    describe('Basic Operations', () => {
        it('should set and get a value', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const key = 'test:basic';
            const value = 'Hello Redis';

            await redisCacheService.set(key, value);
            const result = await redisCacheService.get(key);

            expect(result).toBe(value);
        });

        it('should set value with TTL', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const key = 'test:ttl';
            const value = 'Temporary value';

            await redisCacheService.set(key, value, 1); // 1 second TTL
            const result1 = await redisCacheService.get(key);
            expect(result1).toBe(value);

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));
            const result2 = await redisCacheService.get(key);
            expect(result2).toBeNull();
        });

        it('should delete a value', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const key = 'test:delete';
            const value = 'To be deleted';

            await redisCacheService.set(key, value);
            await redisCacheService.del(key);
            const result = await redisCacheService.get(key);

            expect(result).toBeNull();
        });

        it('should check if key exists', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const key = 'test:exists';

            const exists1 = await redisCacheService.exists(key);
            expect(exists1).toBe(0);

            await redisCacheService.set(key, 'value');
            const exists2 = await redisCacheService.exists(key);
            expect(exists2).toBe(1);
        });
    });

    describe('JSON Operations', () => {
        it('should set and get JSON object', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const key = 'test:json';
            const data = {
                id: '123',
                name: 'Test Hotel',
                rating: 4.5,
                amenities: ['wifi', 'parking'],
            };

            await redisCacheService.setJSON(key, data);
            const result = await redisCacheService.getJSON(key);

            expect(result).toEqual(data);
        });

        it('should return null for non-existent JSON key', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const result = await redisCacheService.getJSON('test:nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('Pattern Invalidation', () => {
        it('should invalidate multiple keys by pattern', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            // Create multiple keys
            await redisCacheService.set('test:pattern:1', 'value1');
            await redisCacheService.set('test:pattern:2', 'value2');
            await redisCacheService.set('test:pattern:3', 'value3');
            await redisCacheService.set('test:other', 'other');

            // Invalidate pattern
            const count =
                await redisCacheService.invalidatePattern('test:pattern:*');
            expect(count).toBe(3);

            // Verify deletion
            const result1 = await redisCacheService.get('test:pattern:1');
            const result2 = await redisCacheService.get('test:other');

            expect(result1).toBeNull();
            expect(result2).toBe('other');
        });
    });
});

describe('Cache Service', () => {
    beforeAll(async () => {
        try {
            await redisCacheService.connect();
        } catch (error) {
            console.warn('Redis not available for tests');
        }
    });

    afterAll(async () => {
        await redisCacheService.disconnect();
    });

    beforeEach(async () => {
        if (redisCacheService.isReady()) {
            await redisCacheService.invalidatePattern('cache:*');
        }
    });

    describe('Cache Operations', () => {
        it('should cache and retrieve data', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const key = 'test-hotel-123';
            const data = { id: '123', name: 'Test Hotel' };

            const setResult = await CacheService.set(key, data);
            expect(setResult).toBe(true);

            const cached = await CacheService.get(key);
            expect(cached).toEqual(data);
        });

        it('should return null for cache miss', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const result = await CacheService.get('nonexistent-key');
            expect(result).toBeNull();
        });

        it('should use custom prefix', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const key = 'hotel-123';
            const data = { id: '123' };

            await CacheService.set(key, data, { prefix: 'hotels:' });
            const cached = await CacheService.get(key, { prefix: 'hotels:' });

            expect(cached).toEqual(data);
        });

        it('should delete cached data', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const key = 'delete-test';
            const data = { test: true };

            await CacheService.set(key, data);
            await CacheService.del(key);
            const result = await CacheService.get(key);

            expect(result).toBeNull();
        });
    });

    describe('Cache Invalidation', () => {
        it('should invalidate by pattern', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            await CacheService.set('hotel-1', { id: '1' });
            await CacheService.set('hotel-2', { id: '2' });
            await CacheService.set('user-1', { id: 'u1' });

            const count = await CacheService.invalidate('hotel-*');
            expect(count).toBeGreaterThanOrEqual(2);

            const hotel1 = await CacheService.get('hotel-1');
            const user1 = await CacheService.get('user-1');

            expect(hotel1).toBeNull();
            expect(user1).toEqual({ id: 'u1' });
        });
    });

    describe('GetOrSet Pattern', () => {
        it('should fetch and cache on miss', async () => {
            if (!redisCacheService.isReady()) {
                console.log('Skipping - Redis not ready');
                return;
            }

            const key = 'fetch-test';
            let fetchCount = 0;

            const fetchFn = async () => {
                fetchCount++;
                return { data: 'Fresh data' };
            };

            // First call - cache miss, should fetch
            const result1 = await CacheService.getOrSet(key, fetchFn);
            expect(result1).toEqual({ data: 'Fresh data' });
            expect(fetchCount).toBe(1);

            // Second call - cache hit, should not fetch
            const result2 = await CacheService.getOrSet(key, fetchFn);
            expect(result2).toEqual({ data: 'Fresh data' });
            expect(fetchCount).toBe(1); // Should still be 1
        });
    });

    describe('Cache Keys', () => {
        it('should generate correct cache keys', () => {
            expect(CacheService.Keys.hotel('123')).toBe('hotel:123');
            expect(CacheService.Keys.userHotels('user-1')).toBe(
                'user:user-1:hotels'
            );
            expect(CacheService.Keys.userBookings('user-1')).toBe(
                'user:user-1:bookings'
            );
        });

        it('should generate correct patterns', () => {
            expect(CacheService.Patterns.allHotels).toBe('cache:hotels:*');
            expect(CacheService.Patterns.hotel('123')).toBe('cache:hotel:123*');
            expect(CacheService.Patterns.userHotels('user-1')).toBe(
                'cache:user:user-1:hotels*'
            );
        });
    });
});
