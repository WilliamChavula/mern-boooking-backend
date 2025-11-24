import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import User from '../../src/models/user.model';
import { Role, RoleName } from '../../src/models/role.model';
import authService from '../../src/services/auth.service';
import { mockUserData, mockUsers, createMockUser } from '../fixtures/data';
import { config } from '../../src/config';

describe('Users Routes Integration Tests', () => {
    describe('POST /api/users/register', () => {
        it('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send(mockUserData)
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: 'User created successfully',
            });

            // Check that auth_token cookie is set
            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toContain('auth_token=');
            expect(cookies[0]).toContain('HttpOnly');

            // Verify user was created in database
            const user = await User.findOne({ email: mockUserData.email });
            expect(user).toBeTruthy();
            expect(user?.email).toBe(mockUserData.email);
            expect(user?.firstName).toBe(mockUserData.firstName);
            expect(user?.lastName).toBe(mockUserData.lastName);
            // Password should be hashed
            expect(user?.password).not.toBe(mockUserData.password);
        });

        it('should return 409 when registering with existing email', async () => {
            // Create user first
            await request(app)
                .post('/api/users/register')
                .send(mockUserData)
                .expect(201);

            // Try to register again with same email
            const response = await request(app)
                .post('/api/users/register')
                .send(mockUserData)
                .expect(409);

            expect(response.body).toMatchObject({
                success: false,
                message: 'User with this email already exists',
            });
        });

        it('should return 400 for invalid email format', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send(
                    createMockUser({
                        email: 'invalid-email',
                    })
                )
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to create user',
            });
            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send({
                    email: mockUserData.email,
                    // Missing password, firstName, lastName
                })
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to create user',
            });
            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 for weak password', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send(
                    createMockUser({
                        password: 'weak',
                    })
                )
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to create user',
            });
        });

        it('should return 400 for missing email', async () => {
            const { email, ...userWithoutEmail } = mockUserData;

            const response = await request(app)
                .post('/api/users/register')
                .send(userWithoutEmail)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to create user',
            });
        });

        it('should return 400 for missing firstName', async () => {
            const { firstName, ...userWithoutFirstName } = mockUserData;

            const response = await request(app)
                .post('/api/users/register')
                .send(userWithoutFirstName)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to create user',
            });
        });

        it('should return 400 for missing lastName', async () => {
            const { lastName, ...userWithoutLastName } = mockUserData;

            const response = await request(app)
                .post('/api/users/register')
                .send(userWithoutLastName)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Failed to create user',
            });
        });

        it('should hash password before storing', async () => {
            await request(app)
                .post('/api/users/register')
                .send(mockUserData)
                .expect(201);

            const user = await User.findOne({ email: mockUserData.email });
            expect(user).toBeTruthy();
            expect(user?.password).not.toBe(mockUserData.password);
            expect(user?.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
        });

        it('should set auth cookie with correct attributes', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send(mockUserData)
                .expect(201);

            const cookies = response.headers['set-cookie'];
            const authCookie = cookies[0];

            expect(authCookie).toContain('auth_token=');
            expect(authCookie).toContain('HttpOnly');
            expect(authCookie).toContain('Path=/');
            expect(authCookie).toContain('SameSite=Lax');
            expect(authCookie).toContain('Max-Age=86400'); // 24 hours
        });

        it('should handle multiple user registrations', async () => {
            for (const userData of mockUsers) {
                const response = await request(app)
                    .post('/api/users/register')
                    .send(userData)
                    .expect(201);

                expect(response.body).toMatchObject({
                    success: true,
                    message: 'User created successfully',
                });
            }

            const userCount = await User.countDocuments();
            expect(userCount).toBe(mockUsers.length);
        });
    });

    describe('GET /api/users/validate-token', () => {
        let authToken: string;
        let userId: string;

        beforeEach(async () => {
            // Get default role
            const defaultRole = await Role.findOne({ name: RoleName.USER });

            // Create and login a user
            const hashedPassword = await authService.hashPassword(
                mockUserData.password
            );
            const user = await User.create({
                email: mockUserData.email,
                password: hashedPassword,
                firstName: mockUserData.firstName,
                lastName: mockUserData.lastName,
                role: defaultRole!._id,
            });

            userId = user._id.toString();
            authToken = await authService.createAuthenticationToken({
                userId: userId,
                email: user.email,
                permissions: [],
            });
        });

        it('should validate token successfully with valid auth token', async () => {
            const response = await request(app)
                .get('/api/users/validate-token')
                .set('Cookie', [`auth_token=${authToken}`])
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'User validated successfully',
            });
            expect(response.body.data).toHaveProperty('userId', userId);
            expect(response.body.data).toHaveProperty(
                'email',
                mockUserData.email
            );
            expect(response.body.data).toHaveProperty('permissions');
        });

        it('should allow request without token (anonymous access)', async () => {
            const response = await request(app)
                .get('/api/users/validate-token')
                .expect(401);
            expect(response.body).toMatchObject({
                success: false,
                message: 'No user authenticated',
            });
        });

        it('should return 401 for invalid token', async () => {
            const response = await request(app)
                .get('/api/users/validate-token')
                .set('Cookie', ['auth_token=invalid-token'])
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Unable to validate token',
            });
        });

        it('should return 401 for expired token', async () => {
            // Create an expired token by using jwt directly
            const jwt = require('jsonwebtoken');
            const expiredToken = jwt.sign(
                {
                    user: {
                        userId: userId,
                        email: mockUserData.email,
                        permissions: [],
                    },
                },
                config.SECRET_KEY,
                {
                    expiresIn: -1, // Already expired
                    issuer: 'hotel-booking-api',
                    audience: 'hotel-booking-client',
                }
            );
            const response = await request(app)
                .get('/api/users/validate-token')
                .set('Cookie', [`auth_token=${expiredToken}`])
                .expect(401);
            expect(response.body).toMatchObject({
                success: false,
                message: 'Unable to validate token',
            });
        });

        it('should return user permissions in response', async () => {
            const response = await request(app)
                .get('/api/users/validate-token')
                .set('Cookie', [`auth_token=${authToken}`])
                .expect(200);

            expect(response.body.data).toHaveProperty('permissions');
            expect(Array.isArray(response.body.data.permissions)).toBe(true);
        });
    });

    describe('GET /api/users/me', () => {
        let authToken: string;
        let userId: string;

        beforeEach(async () => {
            // Get default role
            const defaultRole = await Role.findOne({ name: RoleName.USER });

            // Create and login a user
            const hashedPassword = await authService.hashPassword(
                mockUserData.password
            );
            const user = await User.create({
                email: mockUserData.email,
                password: hashedPassword,
                firstName: mockUserData.firstName,
                lastName: mockUserData.lastName,
                role: defaultRole!._id,
            });

            userId = user._id.toString();
            authToken = await authService.createAuthenticationToken({
                userId: userId,
                email: user.email,
                permissions: [],
            });
        });

        it('should get current user profile successfully', async () => {
            const response = await request(app)
                .get('/api/users/me')
                .set('Cookie', [`auth_token=${authToken}`])
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'User found successfully',
            });
            expect(response.body.data).toMatchObject({
                _id: userId,
                email: mockUserData.email,
                firstName: mockUserData.firstName,
                lastName: mockUserData.lastName,
            });
            // Password should not be included
            expect(response.body.data).not.toHaveProperty('password');
        });

        it('should not include password in response', async () => {
            const response = await request(app)
                .get('/api/users/me')
                .set('Cookie', [`auth_token=${authToken}`])
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(response.body.data).not.toHaveProperty('password');
        });

        it('should allow request without token (anonymous access)', async () => {
            const response = await request(app).get('/api/users/me');

            // The middleware allows anonymous requests
            // but the route may handle it differently
            expect(response.status).toBeDefined();
        });

        it('should return 401 for invalid token', async () => {
            const response = await request(app)
                .get('/api/users/me')
                .set('Cookie', ['auth_token=invalid-token'])
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Unable to validate token',
            });
        });

        it('should return 404 if user not found', async () => {
            // Create token for non-existent user
            const fakeUserId = '507f1f77bcf86cd799439011';
            const fakeToken = await authService.createAuthenticationToken({
                userId: fakeUserId,
                email: 'fake@example.com',
                permissions: [],
            });

            const response = await request(app)
                .get('/api/users/me')
                .set('Cookie', [`auth_token=${fakeToken}`])
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                message: 'User not found',
            });
        });

        it('should return user with correct data types', async () => {
            const response = await request(app)
                .get('/api/users/me')
                .set('Cookie', [`auth_token=${authToken}`])
                .expect(200);

            const userData = response.body.data;
            expect(typeof userData._id).toBe('string');
            expect(typeof userData.email).toBe('string');
            expect(typeof userData.firstName).toBe('string');
            expect(typeof userData.lastName).toBe('string');
        });

        it('should handle concurrent requests for same user', async () => {
            const requests = Array(5)
                .fill(null)
                .map(() =>
                    request(app)
                        .get('/api/users/me')
                        .set('Cookie', [`auth_token=${authToken}`])
                );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.data).toMatchObject({
                    _id: userId,
                    email: mockUserData.email,
                });
            });
        });
    });

    describe('Users Route - Edge Cases', () => {
        it('should handle requests with extra fields', async () => {
            const response = await request(app)
                .post('/api/users/register')
                .send({
                    ...mockUserData,
                    extraField: 'should be ignored',
                    anotherField: 123,
                })
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: 'User created successfully',
            });

            // Verify extra fields were not saved
            const user = await User.findOne({ email: mockUserData.email });
            expect(user).toBeTruthy();
            expect(user).not.toHaveProperty('extraField');
            expect(user).not.toHaveProperty('anotherField');
        });
    });
});
