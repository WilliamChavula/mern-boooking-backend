import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authService from '../../src/services/auth.service';

// Mock config
const mockConfig = vi.hoisted(() => ({
    SECRET_KEY: 'test-secret-key' as string | undefined,
}));
vi.mock('../../src/config', () => ({
    config: mockConfig,
}));

// Mock logger
vi.mock('../../src/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock jwt
vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
        verify: vi.fn(),
        JsonWebTokenError: class extends Error {
            constructor(message: string) {
                super(message);
                this.name = 'JsonWebTokenError';
            }
        },
        TokenExpiredError: class extends Error {
            constructor(message: string, expiredAt?: Date) {
                super(message);
                this.name = 'TokenExpiredError';
                this.expiredAt = expiredAt;
            }
            expiredAt?: Date;
        },
    },
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
    default: {
        compare: vi.fn(),
        hash: vi.fn(),
    },
}));

describe('Auth Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createAuthenticationToken', () => {
        it('should create a token successfully', async () => {
            const mockUser = { userId: '123', email: 'test@example.com' };
            const mockToken = 'mock-jwt-token';
            (jwt.sign as any).mockReturnValue(mockToken);

            const result =
                await authService.createAuthenticationToken(mockUser);

            expect(result).toBe(mockToken);
            expect(jwt.sign).toHaveBeenCalledWith(
                { user: mockUser },
                'test-secret-key',
                {
                    expiresIn: '1d',
                    issuer: 'hotel-booking-api',
                    audience: 'hotel-booking-client',
                }
            );
        });

        it('should throw error for missing userId', async () => {
            const mockUser = { email: 'test@example.com' };

            await expect(
                authService.createAuthenticationToken(mockUser as any)
            ).rejects.toThrow(
                'Invalid user data: userId and email are required'
            );
        });

        it('should throw error for missing email', async () => {
            const mockUser = { userId: '123' };

            await expect(
                authService.createAuthenticationToken(mockUser as any)
            ).rejects.toThrow(
                'Invalid user data: userId and email are required'
            );
        });

        it('should throw error for missing SECRET_KEY', async () => {
            mockConfig.SECRET_KEY = undefined;
            const mockUser = { userId: '123', email: 'test@example.com' };

            await expect(
                authService.createAuthenticationToken(mockUser)
            ).rejects.toThrow('SECRET_KEY is not configured');

            // Reset
            mockConfig.SECRET_KEY = 'test-secret-key';
        });
    });

    it('should throw error for JWT signing failure', async () => {
        const mockUser = { userId: '123', email: 'test@example.com' };
        (jwt.sign as any).mockImplementation(() => {
            throw new jwt.JsonWebTokenError('Signing failed');
        });

        await expect(
            authService.createAuthenticationToken(mockUser)
        ).rejects.toThrow('Failed to create authentication token');
    });
});

describe('passwordCompare', () => {
    it('should return true for matching passwords', async () => {
        (bcrypt.compare as any).mockResolvedValue(true);

        const result = await authService.passwordCompare('password', 'hashed');

        expect(result).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed');
    });

    it('should return false for non-matching passwords', async () => {
        (bcrypt.compare as any).mockResolvedValue(false);

        const result = await authService.passwordCompare('password', 'hashed');

        expect(result).toBe(false);
    });

    it('should throw error for bcrypt comparison failure', async () => {
        (bcrypt.compare as any).mockRejectedValue(
            new Error('Comparison failed')
        );

        await expect(
            authService.passwordCompare('password', 'hashed')
        ).rejects.toThrow('Failed to compare passwords');
    });
});

describe('hashPassword', () => {
    it('should hash password successfully', async () => {
        const mockHash = 'hashed-password';
        (bcrypt.hash as any).mockResolvedValue(mockHash);

        const result = await authService.hashPassword('password');

        expect(result).toBe(mockHash);
        expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
    });

    it('should hash password with custom salt rounds', async () => {
        const mockHash = 'hashed-password';
        (bcrypt.hash as any).mockResolvedValue(mockHash);

        const result = await authService.hashPassword('password', 12);

        expect(result).toBe(mockHash);
        expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
    });

    it('should throw error for bcrypt hashing failure', async () => {
        (bcrypt.hash as any).mockRejectedValue(new Error('Hashing failed'));

        await expect(authService.hashPassword('password')).rejects.toThrow(
            'Failed to hash password'
        );
    });
});

describe('verifyToken', () => {
    it('should verify token successfully', async () => {
        const mockUser = { userId: '123', email: 'test@example.com' };
        const mockDecoded = { user: mockUser };
        (jwt.verify as any).mockReturnValue(mockDecoded);

        const result = await authService.verifyToken('token');

        expect(result).toEqual(mockUser);
        expect(jwt.verify).toHaveBeenCalledWith('token', 'test-secret-key', {
            issuer: 'hotel-booking-api',
            audience: 'hotel-booking-client',
        });
    });

    it('should throw error for missing SECRET_KEY', async () => {
        mockConfig.SECRET_KEY = undefined;

        await expect(authService.verifyToken('token')).rejects.toThrow(
            'SECRET_KEY is not configured'
        );

        // Reset
        mockConfig.SECRET_KEY = 'test-secret-key';
    });
});

it('should throw error for malformed payload', async () => {
    const mockDecoded = { user: { userId: '123' } }; // missing email
    (jwt.verify as any).mockReturnValue(mockDecoded);

    await expect(authService.verifyToken('token')).rejects.toThrow(
        'Invalid token payload'
    );
});

it('should throw error for expired token', async () => {
    (jwt.verify as any).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
    });

    await expect(authService.verifyToken('token')).rejects.toThrow(
        'Token has expired'
    );
});

it('should throw error for invalid token', async () => {
    (jwt.verify as any).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
    });

    await expect(authService.verifyToken('token')).rejects.toThrow(
        'Invalid token'
    );
});

it('should throw error for other JWT errors', async () => {
    (jwt.verify as any).mockImplementation(() => {
        throw new Error('Other error');
    });

    await expect(authService.verifyToken('token')).rejects.toThrow(
        'Other error'
    );
});
