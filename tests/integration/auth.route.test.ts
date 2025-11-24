import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import User from '../../src/models/user.model';
import { Role, RoleName } from '../../src/models/role.model';
import authService from '../../src/services/auth.service';
import { mockUserData, createMockUser } from '../fixtures/data';

describe('Auth Routes Integration Tests', () => {
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Get default role
            const defaultRole = await Role.findOne({ name: RoleName.USER });
            // Store plain password, let model hash it
            await User.create({
                email: mockUserData.email,
                password: mockUserData.password,
                firstName: mockUserData.firstName,
                lastName: mockUserData.lastName,
                role: defaultRole!._id,
            });
        });

        it('should login successfully with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: mockUserData.email,
                    password: mockUserData.password,
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Login Success',
            });
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data.token).toBeTruthy();

            // Check that auth_token cookie is set
            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain('auth_token=');
            expect(cookies[0]).toContain('HttpOnly');
            expect(cookies[0]).toContain('Path=/');
        });

        it('should return 400 for invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: mockUserData.password,
                })
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'invalid credentials',
            });
        });

        it('should return 400 for invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: mockUserData.email,
                    password: 'wrongpassword',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'invalid credentials',
            });
        });

        it('should return 400 for missing email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    password: mockUserData.password,
                })
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to login',
            });
            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 for missing password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: mockUserData.email,
                })
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to login',
            });
            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 for invalid email format', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email',
                    password: mockUserData.password,
                })
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to login',
            });
        });

        it('should return 400 for empty request body', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({})
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to login',
            });
        });

        it('should include JWT token with user data', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: mockUserData.email,
                    password: mockUserData.password,
                })
                .expect(200);

            const token = response.body.data.token;
            expect(token).toBeTruthy();

            // Verify token contains user information
            const decoded = await authService.verifyToken(token);
            expect(decoded).toHaveProperty('email', mockUserData.email);
            expect(decoded).toHaveProperty('userId');
            expect(decoded).toHaveProperty('permissions');
        });

        it('should set cookie with correct security attributes', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: mockUserData.email,
                    password: mockUserData.password,
                })
                .expect(200);

            const cookies = response.headers['set-cookie'];
            const authCookie = cookies[0];

            expect(authCookie).toContain('auth_token=');
            expect(authCookie).toContain('HttpOnly');
            expect(authCookie).toContain('Path=/');
            expect(authCookie).toContain('SameSite=Lax'); // Development mode
        });
    });

    describe('POST /api/auth/logout', () => {
        let authToken: string;

        beforeEach(async () => {
            const defaultRole = await Role.findOne({ name: RoleName.USER });
            // Store plain password, let model hash it
            const user = await User.create({
                email: mockUserData.email,
                password: mockUserData.password,
                firstName: mockUserData.firstName,
                lastName: mockUserData.lastName,
                role: defaultRole!._id,
            });

            authToken = await authService.createAuthenticationToken({
                userId: user._id.toString(),
                email: user.email,
                permissions: [],
            });
        });

        it('should logout successfully and clear auth cookie', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Cookie', [`auth_token=${authToken}`])
                .expect(200);

            // Check that auth_token cookie is cleared
            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain('auth_token=;');
            expect(cookies[0]).toContain('Expires=Thu, 01 Jan 1970');
        });

        it('should logout even without auth token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .expect(200);

            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain('auth_token=;');
        });

        it('should clear cookie with correct attributes', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Cookie', [`auth_token=${authToken}`])
                .expect(200);

            const cookies = response.headers['set-cookie'];
            const authCookie = cookies[0];

            expect(authCookie).toContain('auth_token=;');
            expect(authCookie).toContain('HttpOnly');
            expect(authCookie).toContain('Path=/');
            expect(authCookie).toContain('SameSite=Lax');
        });
    });
});
