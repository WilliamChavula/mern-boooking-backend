import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisRateLimiterService {
    private client: RedisClientType | null = null;
    private isConnected: boolean = false;

    async connect(): Promise<void> {
        if (this.isConnected && this.client) {
            logger.info('Redis Rate Limiter already connected');
            return;
        }

        try {
            this.client = createClient({
                url: config.REDIS_RATE_LIMITER_URL,
                socket: {
                    connectTimeout: 10000,
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            logger.error('Redis Rate Limiter max reconnection attempts reached');
                            return new Error('Max reconnection attempts reached');
                        }
                        const delay = Math.min(retries * 100, 3000);
                        logger.warn(`Redis Rate Limiter reconnecting in ${delay}ms`, { attempt: retries });
                        return delay;
                    },
                },
            });

            this.client.on('error', (err) => {
                logger.error('Redis Rate Limiter Client Error', { error: err.message });
            });

            this.client.on('connect', () => {
                logger.info('Redis Rate Limiter connecting...');
            });

            this.client.on('ready', () => {
                logger.info('Redis Rate Limiter client ready');
                this.isConnected = true;
            });

            this.client.on('reconnecting', () => {
                logger.warn('Redis Rate Limiter reconnecting...');
            });

            this.client.on('end', () => {
                logger.info('Redis Rate Limiter connection closed');
                this.isConnected = false;
            });

            await this.client.connect();
            logger.info('Redis Rate Limiter connected successfully', {
                url: config.REDIS_RATE_LIMITER_URL.replace(/\/\/.*@/, '//***@'),
            });
        } catch (error) {
            logger.error('Failed to connect to Redis Rate Limiter', {
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
            logger.info('Redis Rate Limiter disconnected');
        }
    }

    getClient(): RedisClientType {
        if (!this.client || !this.isConnected) {
            throw new Error('Redis Rate Limiter client not connected');
        }
        return this.client;
    }

    isReady(): boolean {
        return this.isConnected && this.client !== null;
    }
}

export const redisRateLimiterService = new RedisRateLimiterService();
