import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisService {
    private client: RedisClientType | null = null;
    private isConnected: boolean = false;

    async connect(): Promise<void> {
        if (this.isConnected && this.client) {
            logger.info('Redis already connected');
            return;
        }

        try {
            this.client = createClient({
                url: config.REDIS_URL,
                socket: {
                    connectTimeout: 10000,
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            logger.error('Redis max reconnection attempts reached');
                            return new Error('Max reconnection attempts reached');
                        }
                        const delay = Math.min(retries * 100, 3000);
                        logger.warn(`Redis reconnecting in ${delay}ms`, { attempt: retries });
                        return delay;
                    },
                },
            });

            this.client.on('error', (err) => {
                logger.error('Redis Client Error', { error: err.message });
            });

            this.client.on('connect', () => {
                logger.info('Redis connecting...');
            });

            this.client.on('ready', () => {
                logger.info('Redis client ready');
                this.isConnected = true;
            });

            this.client.on('reconnecting', () => {
                logger.warn('Redis reconnecting...');
            });

            this.client.on('end', () => {
                logger.info('Redis connection closed');
                this.isConnected = false;
            });

            await this.client.connect();
            logger.info('Redis connected successfully', {
                url: config.REDIS_URL.replace(/\/\/.*@/, '//***@'),
            });
        } catch (error) {
            logger.error('Failed to connect to Redis', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            this.isConnected = false;
            logger.info('Redis disconnected');
        }
    }

    getClient(): RedisClientType {
        if (!this.client || !this.isConnected) {
            throw new Error('Redis client not connected');
        }
        return this.client;
    }

    isReady(): boolean {
        return this.isConnected && this.client !== null;
    }

    async get(key: string): Promise<string | null> {
        try {
            const result = await this.getClient().get(key);
            return result ?? null;
        } catch (error) {
            logger.error('Redis GET error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    async set(
        key: string,
        value: string,
        ttl?: number
    ): Promise<string | null> {
        try {
            if (ttl) {
                const result = await this.getClient().setEx(key, ttl, value);
                return result ?? null;
            }
            const result = await this.getClient().set(key, value);
            return result ?? null;
        } catch (error) {
            logger.error('Redis SET error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    async del(key: string): Promise<number> {
        try {
            return await this.getClient().del(key);
        } catch (error) {
            logger.error('Redis DEL error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return 0;
        }
    }

    async exists(key: string): Promise<number> {
        try {
            return await this.getClient().exists(key);
        } catch (error) {
            logger.error('Redis EXISTS error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return 0;
        }
    }

    async setJSON(key: string, value: any, ttl?: number): Promise<boolean> {
        try {
            const serialized = JSON.stringify(value);
            const result = await this.set(key, serialized, ttl);
            return result !== null;
        } catch (error) {
            logger.error('Redis setJSON error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    async getJSON<T>(key: string): Promise<T | null> {
        try {
            const value = await this.get(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error('Redis getJSON error', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }

    async invalidatePattern(pattern: string): Promise<number> {
        try {
            const keys = await this.getClient().keys(pattern);
            if (keys.length === 0) return 0;
            return await this.getClient().del(keys);
        } catch (error) {
            logger.error('Redis invalidatePattern error', {
                pattern,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return 0;
        }
    }
}

export const redisService = new RedisService();
