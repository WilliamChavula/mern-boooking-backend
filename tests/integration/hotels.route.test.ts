import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import User from '../../src/models/user.model';
import Hotel from '../../src/models/hotel.model';
import { Role, RoleName } from '../../src/models/role.model';
import { Permission, PermissionName } from '../../src/models/permission.model';
import authService from '../../src/services/auth.service';
import { mockUserData, mockHotelData, createMockHotel } from '../fixtures/data';

describe('Hotels Routes Integration Tests', () => {
    let userRole: any;
    let anonymousRole: any;
    let regularUser: any;
    let regularUserToken: string;
    let testHotel: any;

    beforeEach(async () => {
        // Get roles
        userRole = await Role.findOne({ name: RoleName.USER });
        anonymousRole = await Role.findOne({ name: RoleName.ANONYMOUS });

        // Create a regular user with USER role (has HOTELS_READ and HOTELS_BOOK permissions)
        regularUser = await User.create({
            email: mockUserData.email,
            password: mockUserData.password,
            firstName: mockUserData.firstName,
            lastName: mockUserData.lastName,
            role: userRole!._id,
        });

        regularUserToken = await authService.createAuthenticationToken({
            userId: regularUser._id.toString(),
            email: regularUser.email,
            permissions: [
                PermissionName.HOTELS_READ,
                PermissionName.HOTELS_BOOK,
            ],
        });

        // Create a test hotel
        testHotel = await Hotel.create({
            ...mockHotelData,
            userId: regularUser._id.toString(),
        });
    });

    describe('GET /api/hotels/search', () => {
        it('should search hotels successfully with authenticated user', async () => {
            const response = await request(app)
                .get('/api/hotels/search')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .query({ destination: 'New York' })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Search Hotels Success',
            });
            expect(response.body).toHaveProperty('pagination');
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should return hotels matching search criteria', async () => {
            // Create additional hotels
            await Hotel.create(
                createMockHotel({
                    userId: regularUser._id.toString(),
                    name: 'Beach Resort',
                    city: 'Miami',
                    country: 'USA',
                })
            );

            const response = await request(app)
                .get('/api/hotels/search')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .query({ destination: 'Miami' })
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0].city).toBe('Miami');
        });

        it('should support pagination', async () => {
            // Create multiple hotels
            for (let i = 0; i < 7; i++) {
                await Hotel.create(
                    createMockHotel({
                        userId: regularUser._id.toString(),
                        name: `Hotel ${i}`,
                    })
                );
            }

            const response = await request(app)
                .get('/api/hotels/search')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .query({ page: 1 })
                .expect(200);

            expect(response.body.pagination).toMatchObject({
                currentPage: 1,
            });
            expect(response.body.pagination.total).toBeGreaterThan(5);
            expect(response.body.pagination.pages).toBeGreaterThan(1);
        });

        it('should allow anonymous users to search hotels', async () => {
            const response = await request(app)
                .get('/api/hotels/search')
                .query({ destination: 'New York' })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Search Hotels Success',
            });
        });

        it('should return 401 for invalid token', async () => {
            const response = await request(app)
                .get('/api/hotels/search')
                .set('Cookie', ['auth_token=invalid-token'])
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Unable to validate token',
            });
        });
    });

    describe('GET /api/hotels', () => {
        it('should get all latest hotels with authenticated user', async () => {
            const response = await request(app)
                .get('/api/hotels')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Hotels fetched successfully',
            });
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should allow anonymous users to view hotels', async () => {
            const response = await request(app).get('/api/hotels').expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Hotels fetched successfully',
            });
        });

        it('should return hotels sorted by latest', async () => {
            const response = await request(app)
                .get('/api/hotels')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .expect(200);

            const hotels = response.body.data;
            if (hotels.length > 1) {
                const firstHotelDate = new Date(hotels[0].updatedAt);
                const secondHotelDate = new Date(hotels[1].updatedAt);
                expect(firstHotelDate >= secondHotelDate).toBe(true);
            }
        });
    });

    describe('GET /api/hotels/:hotelId', () => {
        it('should get hotel by ID with authenticated user', async () => {
            const response = await request(app)
                .get(`/api/hotels/${testHotel._id}`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Hotel fetched successfully',
            });
            expect(response.body.data).toMatchObject({
                name: mockHotelData.name,
                city: mockHotelData.city,
                country: mockHotelData.country,
            });
        });

        it('should allow anonymous users to view hotel details', async () => {
            const response = await request(app)
                .get(`/api/hotels/${testHotel._id}`)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Hotel fetched successfully',
            });
        });

        it('should return 404 for non-existent hotel', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/hotels/${fakeId}`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                message: 'No hotel found',
            });
        });

        it('should return 400 for invalid hotel ID format', async () => {
            const response = await request(app)
                .get('/api/hotels/invalid-id')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
            });
        });
    });

    describe('POST /api/hotels/:hotelId/bookings/payment-intent', () => {
        it('should create payment intent for authenticated user with booking permission', async () => {
            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings/payment-intent`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .send({ numberOfNights: 3 })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Payment intent created successfully',
            });
            expect(response.body.data).toHaveProperty('paymentIntentId');
            expect(response.body.data).toHaveProperty('clientSecret');
            expect(response.body.data).toHaveProperty('totalStayCost');
            expect(response.body.data.totalStayCost).toBe(
                mockHotelData.pricePerNight * 3
            );
        });

        it('should return 401 for anonymous user trying to create payment intent', async () => {
            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings/payment-intent`)
                .send({ numberOfNights: 3 })
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Authentication required',
            });
        });

        it('should return 401 for unauthenticated user', async () => {
            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings/payment-intent`)
                .set('Cookie', ['auth_token=invalid-token'])
                .send({ numberOfNights: 3 })
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Unable to validate token',
            });
        });

        it('should return 403 for user without booking permission', async () => {
            // Create a user without HOTELS_BOOK permission
            const readOnlyRole = await Role.findOne({
                name: RoleName.ANONYMOUS,
            });
            const readOnlyUser = await User.create({
                email: 'readonly@example.com',
                password: 'Password123!',
                firstName: 'Read',
                lastName: 'Only',
                role: readOnlyRole!._id,
            });

            const readOnlyToken = await authService.createAuthenticationToken({
                userId: readOnlyUser._id.toString(),
                email: readOnlyUser.email,
                permissions: [PermissionName.HOTELS_READ],
            });

            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings/payment-intent`)
                .set('Cookie', [`auth_token=${readOnlyToken}`])
                .send({ numberOfNights: 3 })
                .expect(403);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Insufficient permissions',
            });
        });

        it('should return 404 for non-existent hotel', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .post(`/api/hotels/${fakeId}/bookings/payment-intent`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .send({ numberOfNights: 3 })
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                message: 'hotel not found',
            });
        });

        it('should return 400 for invalid numberOfNights', async () => {
            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings/payment-intent`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .send({ numberOfNights: 0 })
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
            });
        });

        it('should calculate correct total cost', async () => {
            const numberOfNights = 5;
            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings/payment-intent`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .send({ numberOfNights })
                .expect(200);

            const expectedCost = mockHotelData.pricePerNight * numberOfNights;
            expect(response.body.data.totalStayCost).toBe(expectedCost);
        });
    });

    describe('POST /api/hotels/:hotelId/bookings - Authorization Tests', () => {
        it('should return 401 for anonymous user trying to create booking', async () => {
            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings`)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    adultCount: 2,
                    childCount: 1,
                    checkIn: '2025-12-01',
                    checkOut: '2025-12-04',
                    totalStayCost: 750,
                    paymentIntentId: 'pi_test123',
                })
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Authentication required',
            });
        });

        it('should return 403 for user without booking permission', async () => {
            // Create a user with only read permission
            const readOnlyRole = await Role.findOne({
                name: RoleName.ANONYMOUS,
            });
            const readOnlyUser = await User.create({
                email: 'viewer@example.com',
                password: 'Password123!',
                firstName: 'View',
                lastName: 'Only',
                role: readOnlyRole!._id,
            });

            const readOnlyToken = await authService.createAuthenticationToken({
                userId: readOnlyUser._id.toString(),
                email: readOnlyUser.email,
                permissions: [PermissionName.HOTELS_READ],
            });

            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings`)
                .set('Cookie', [`auth_token=${readOnlyToken}`])
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    adultCount: 2,
                    childCount: 1,
                    checkIn: '2025-12-01',
                    checkOut: '2025-12-04',
                    totalStayCost: 750,
                    paymentIntentId: 'pi_test123',
                })
                .expect(403);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Insufficient permissions',
            });
        });

        it('should return 401 for invalid token', async () => {
            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings`)
                .set('Cookie', ['auth_token=invalid-token'])
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    adultCount: 2,
                    childCount: 1,
                    checkIn: '2025-12-01',
                    checkOut: '2025-12-04',
                    totalStayCost: 750,
                    paymentIntentId: 'pi_test123',
                })
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Unable to validate token',
            });
        });
    });

    describe('Hotels Routes - Edge Cases', () => {
        it('should handle multiple concurrent hotel searches', async () => {
            const requests = Array(5)
                .fill(null)
                .map(() =>
                    request(app)
                        .get('/api/hotels/search')
                        .set('Cookie', [`auth_token=${regularUserToken}`])
                        .query({ destination: 'New York' })
                );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });

        it('should handle search with special characters in destination', async () => {
            const response = await request(app)
                .get('/api/hotels/search')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .query({ destination: "O'Hare" })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should return empty results for non-matching search', async () => {
            const response = await request(app)
                .get('/api/hotels/search')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .query({ destination: 'NonExistentCity12345' })
                .expect(200);

            expect(response.body.data).toEqual([]);
            expect(response.body.pagination.total).toBe(0);
        });

        it('should handle invalid page numbers gracefully', async () => {
            const response = await request(app)
                .get('/api/hotels/search')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .query({ page: 9999 })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('Permission-based Access Control', () => {
        it('should allow users with HOTELS_READ permission to view hotels', async () => {
            const response = await request(app)
                .get('/api/hotels')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should allow users with HOTELS_BOOK permission to create payment intent', async () => {
            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings/payment-intent`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .send({ numberOfNights: 2 })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should respect anonymous role permissions for read operations', async () => {
            // Anonymous users should be able to read hotels
            const response = await request(app).get('/api/hotels').expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should deny anonymous users from booking operations', async () => {
            const response = await request(app)
                .post(`/api/hotels/${testHotel._id}/bookings/payment-intent`)
                .send({ numberOfNights: 3 })
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Authentication required',
            });
        });
    });
});
