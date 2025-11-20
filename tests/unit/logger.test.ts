import { describe, it, expect } from 'vitest';
import { logger } from '../../src/utils/logger';

describe('Logger Utility', () => {
    describe('Logger Configuration', () => {
        it('should export logger instance', () => {
            expect(logger).toBeDefined();
        });

        it('should have logging methods', () => {
            expect(logger.info).toBeDefined();
            expect(logger.error).toBeDefined();
            expect(logger.warn).toBeDefined();
            expect(logger.debug).toBeDefined();
        });

        it('should have service metadata', () => {
            expect(logger.defaultMeta).toHaveProperty(
                'service',
                'hotel-booking-api'
            );
        });

        it('should support silent mode', () => {
            logger.silent = true;
            expect(logger.silent).toBe(true);
            logger.silent = false;
            expect(logger.silent).toBe(false);
        });
    });

    describe('Logging Functionality', () => {
        it('should not throw when logging info', () => {
            expect(() => logger.info('Test info message')).not.toThrow();
        });

        it('should not throw when logging errors', () => {
            expect(() => logger.error('Test error message')).not.toThrow();
        });

        it('should not throw when logging with metadata', () => {
            expect(() =>
                logger.info('User created', {
                    userId: '123',
                    email: 'test@example.com',
                })
            ).not.toThrow();
        });

        it('should not throw when logging errors with stack traces', () => {
            const error = new Error('Test error');
            expect(() =>
                logger.error('Error occurred', {
                    error: error.message,
                    stack: error.stack,
                })
            ).not.toThrow();
        });
    });
});
