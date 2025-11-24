import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import User from '../../src/models/user.model';
import Hotel from '../../src/models/hotel.model';
import { Role, RoleName } from '../../src/models/role.model';
import { PermissionName } from '../../src/models/permission.model';
import authService from '../../src/services/auth.service';
import { mockUserData, mockHotelData } from '../fixtures/data';

// Helper function to add hotel fields to multipart request
function addHotelFields(req: any, hotel: any) {
    let request = req
        .field('name', hotel.name)
        .field('city', hotel.city)
        .field('country', hotel.country)
        .field('description', hotel.description)
        .field('type', hotel.type)
        .field('adultCount', hotel.adultCount.toString())
        .field('childCount', hotel.childCount.toString());

    // Add facilities as separate fields
    if (hotel.facilities && hotel.facilities.length > 0) {
        hotel.facilities.forEach((facility: string) => {
            request = request.field('facilities', facility);
        });
    }

    return request
        .field('pricePerNight', hotel.pricePerNight.toString())
        .field('starRating', hotel.starRating.toString());
}

describe('My Hotels Routes Integration Tests', () => {
    let hotelStaffToken: string;
    let hotelStaffUserId: string;
    let regularUserToken: string;
    let regularUserId: string;
    let testHotel: any;

    beforeEach(async () => {
        // Create hotel staff user with CREATE and EDIT permissions
        const hotelStaffRole = await Role.findOne({
            name: RoleName.HOTEL_STAFF,
        });
        const hotelStaffUser = await User.create({
            email: 'hotelstaff@test.com',
            password: 'Password123!',
            firstName: 'Hotel',
            lastName: 'Staff',
            role: hotelStaffRole!._id,
        });
        hotelStaffUserId = hotelStaffUser._id.toString();
        hotelStaffToken = await authService.createAuthenticationToken({
            userId: hotelStaffUserId,
            email: hotelStaffUser.email,
            permissions: [
                PermissionName.HOTELS_READ,
                PermissionName.HOTELS_BOOK,
                PermissionName.HOTELS_CREATE,
                PermissionName.HOTELS_EDIT,
            ],
        });

        // Create regular user without CREATE/EDIT permissions
        const userRole = await Role.findOne({ name: RoleName.USER });
        const regularUser = await User.create({
            email: 'regular@test.com',
            password: 'Password123!',
            firstName: 'Regular',
            lastName: 'User',
            role: userRole!._id,
        });
        regularUserId = regularUser._id.toString();
        regularUserToken = await authService.createAuthenticationToken({
            userId: regularUserId,
            email: regularUser.email,
            permissions: [
                PermissionName.HOTELS_READ,
                PermissionName.HOTELS_BOOK,
            ],
        });

        // Create a test hotel for GET and PUT operations
        testHotel = await Hotel.create({
            ...mockHotelData,
            userId: hotelStaffUserId,
        });
    });

    describe('POST /api/my/hotel - Create Hotel', () => {
        it('should create hotel successfully for user with CREATE permission', async () => {
            const newHotel = {
                name: 'Grand Plaza Hotel',
                city: 'New York',
                country: 'USA',
                description: 'Luxury hotel in the heart of Manhattan',
                type: 'Luxury',
                adultCount: 2,
                childCount: 0,
                facilities: ['Free WiFi', 'Parking', 'Pool'],
                pricePerNight: 250,
                starRating: 5,
            };

            const req = request(app)
                .post('/api/my/hotel')
                .set('Cookie', [`auth_token=${hotelStaffToken}`]);

            const response = await addHotelFields(req, newHotel).expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining('Hotel created successfully'),
            });
            expect(response.body.data).toMatchObject({
                name: newHotel.name,
                city: newHotel.city,
                country: newHotel.country,
                userId: hotelStaffUserId,
            });

            // Verify hotel was saved to database
            const savedHotel = await Hotel.findById(response.body.data._id);
            expect(savedHotel).toBeTruthy();
            expect(savedHotel!.name).toBe(newHotel.name);
        });

        it('should create hotel with image files', async () => {
            const newHotel = {
                name: 'Beach Resort',
                city: 'Miami',
                country: 'USA',
                description: 'Beautiful beachfront resort',
                type: 'Resort',
                adultCount: 2,
                childCount: 2,
                facilities: ['Beach Access', 'Pool'],
                pricePerNight: 300,
                starRating: 4,
            };

            const req = request(app)
                .post('/api/my/hotel')
                .set('Cookie', [`auth_token=${hotelStaffToken}`]);

            const response = await addHotelFields(req, newHotel);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it('should return 403 for user without CREATE permission', async () => {
            const newHotel = {
                name: 'Unauthorized Hotel',
                city: 'Boston',
                country: 'USA',
                description: 'Should not be created',
                type: 'Budget',
                adultCount: 2,
                childCount: 0,
                facilities: ['WiFi'],
                pricePerNight: 100,
                starRating: 3,
            };

            const req = request(app)
                .post('/api/my/hotel')
                .set('Cookie', [`auth_token=${regularUserToken}`]);

            const response = await addHotelFields(req, newHotel).expect(403);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Insufficient permissions',
            });
        });

        it('should return 401 for unauthenticated user', async () => {
            const response = await request(app)
                .post('/api/my/hotel')
                .field('name', 'Test Hotel')
                .field('city', 'Test City')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for invalid hotel data', async () => {
            const response = await request(app)
                .post('/api/my/hotel')
                .set('Cookie', [`auth_token=${hotelStaffToken}`])
                .field('name', '') // Invalid: empty name
                .field('city', 'New York')
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Failed to create a hotel'),
            });
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/my/hotel')
                .set('Cookie', [`auth_token=${hotelStaffToken}`])
                .field('name', 'Incomplete Hotel')
                // Missing required fields
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/my/hotel - Get All My Hotels', () => {
        it('should get all hotels for authenticated user', async () => {
            // Create another hotel for the staff user
            await Hotel.create({
                ...mockHotelData,
                name: 'Second Hotel',
                userId: hotelStaffUserId,
            });

            const response = await request(app)
                .get('/api/my/hotel')
                .set('Cookie', [`auth_token=${hotelStaffToken}`])
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Fetched hotels successfully',
            });
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(2);
            expect(response.body.data[0].userId).toBe(hotelStaffUserId);
        });

        it('should return empty array if user has no hotels', async () => {
            const response = await request(app)
                .get('/api/my/hotel')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Fetched hotels successfully',
                data: [],
            });
        });

        it('should return 401 for unauthenticated user', async () => {
            const response = await request(app)
                .get('/api/my/hotel')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should not return hotels belonging to other users', async () => {
            // Create hotel for different user
            await Hotel.create({
                ...mockHotelData,
                name: 'Other User Hotel',
                userId: regularUserId,
            });

            const response = await request(app)
                .get('/api/my/hotel')
                .set('Cookie', [`auth_token=${hotelStaffToken}`])
                .expect(200);

            // Should only see own hotel, not the other user's
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].name).toBe(mockHotelData.name);
        });
    });

    describe('GET /api/my/hotel/:hotelId - Get Single Hotel', () => {
        it('should get hotel by ID for owner', async () => {
            const response = await request(app)
                .get(`/api/my/hotel/${testHotel._id}`)
                .set('Cookie', [`auth_token=${hotelStaffToken}`])
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Fetch hotel Successful',
            });
            expect(response.body.data).toMatchObject({
                _id: testHotel._id.toString(),
                name: mockHotelData.name,
                userId: hotelStaffUserId,
            });
        });

        it('should return 404 if hotel does not belong to user', async () => {
            const response = await request(app)
                .get(`/api/my/hotel/${testHotel._id}`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('No Hotel found'),
            });
        });

        it('should return 404 for non-existent hotel ID', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .get(`/api/my/hotel/${fakeId}`)
                .set('Cookie', [`auth_token=${hotelStaffToken}`])
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('No Hotel found'),
            });
        });

        it('should return 401 for unauthenticated user', async () => {
            const response = await request(app)
                .get(`/api/my/hotel/${testHotel._id}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/my/hotel/:hotelId - Update Hotel', () => {
        it('should update hotel successfully for user with EDIT permission', async () => {
            const updatedData = {
                name: 'Updated Grand Hotel',
                city: 'Los Angeles',
                country: 'USA',
                description: 'Newly renovated luxury hotel',
                type: 'Luxury',
                adultCount: 4,
                childCount: 2,
                facilities: ['WiFi', 'Pool', 'Spa', 'Gym'],
                pricePerNight: 350,
                starRating: 5,
            };

            const req = request(app)
                .put(`/api/my/hotel/${testHotel._id}`)
                .set('Cookie', [`auth_token=${hotelStaffToken}`]);

            const response = await addHotelFields(req, updatedData).expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining('Hotel updated successfully'),
            });
            expect(response.body.data).toMatchObject({
                name: updatedData.name,
                city: updatedData.city,
                pricePerNight: updatedData.pricePerNight,
            });

            // Verify update in database
            const updatedHotel = await Hotel.findById(testHotel._id);
            expect(updatedHotel!.name).toBe(updatedData.name);
            expect(updatedHotel!.city).toBe(updatedData.city);
        });

        it('should return 403 for user without EDIT permission', async () => {
            const response = await request(app)
                .put(`/api/my/hotel/${testHotel._id}`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .field('name', 'Unauthorized Update')
                .field('city', 'Boston')
                .expect(403);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Insufficient permissions',
            });
        });

        it('should return 404 if hotel does not belong to user', async () => {
            // Create hotel for regular user
            const otherUserHotel = await Hotel.create({
                ...mockHotelData,
                name: 'Other User Hotel',
                userId: regularUserId,
            });

            const updateData = {
                name: 'Trying to Update',
                city: 'Miami',
                country: 'USA',
                description: 'Updated description',
                type: 'Luxury',
                adultCount: 2,
                childCount: 1,
                facilities: ['Free WiFi', 'Parking'],
                pricePerNight: 300,
                starRating: 4,
            };

            const req = request(app)
                .put(`/api/my/hotel/${otherUserHotel._id}`)
                .set('Cookie', [`auth_token=${hotelStaffToken}`]);

            const response = await addHotelFields(req, updateData).expect(404);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Hotel not found',
            });
        });

        it('should return 404 for non-existent hotel', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            const updateData = {
                name: 'Update Fake Hotel',
                city: 'Miami',
                country: 'USA',
                description: 'Updated description',
                type: 'Luxury',
                adultCount: 2,
                childCount: 1,
                facilities: ['Free WiFi', 'Parking'],
                pricePerNight: 300,
                starRating: 4,
            };

            const req = request(app)
                .put(`/api/my/hotel/${fakeId}`)
                .set('Cookie', [`auth_token=${hotelStaffToken}`]);

            const response = await addHotelFields(req, updateData).expect(404);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Hotel not found',
            });
        });

        it('should return 400 for invalid update data', async () => {
            const response = await request(app)
                .put(`/api/my/hotel/${testHotel._id}`)
                .set('Cookie', [`auth_token=${hotelStaffToken}`])
                .field('name', '') // Invalid: empty name
                .field('city', 'Miami')
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Failed to create a hotel'),
            });
        });

        it('should return 401 for unauthenticated user', async () => {
            const response = await request(app)
                .put(`/api/my/hotel/${testHotel._id}`)
                .field('name', 'Updated Name')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should preserve existing data when updating partial fields', async () => {
            const originalName = testHotel.name;
            const originalCountry = testHotel.country;

            const updateData = {
                name: originalName,
                city: 'San Francisco',
                country: originalCountry,
                description: testHotel.description,
                type: testHotel.type,
                adultCount: testHotel.adultCount,
                childCount: testHotel.childCount,
                facilities: testHotel.facilities,
                pricePerNight: testHotel.pricePerNight,
                starRating: testHotel.starRating,
            };

            const req = request(app)
                .put(`/api/my/hotel/${testHotel._id}`)
                .set('Cookie', [`auth_token=${hotelStaffToken}`]);

            const response = await addHotelFields(req, updateData).expect(200);

            expect(response.body.data.city).toBe('San Francisco');
            expect(response.body.data.name).toBe(originalName);
            expect(response.body.data.country).toBe(originalCountry);
        });
    });

    describe('Permission-based Access Control', () => {
        it('should allow HOTEL_STAFF to create hotels', async () => {
            const hotelData = {
                name: 'Staff Hotel',
                city: 'Chicago',
                country: 'USA',
                description: 'Hotel created by staff',
                type: 'Business',
                adultCount: 2,
                childCount: 0,
                facilities: ['WiFi', 'Parking'],
                pricePerNight: 150,
                starRating: 3,
            };

            const req = request(app)
                .post('/api/my/hotel')
                .set('Cookie', [`auth_token=${hotelStaffToken}`]);

            const response = await addHotelFields(req, hotelData).expect(201);

            expect(response.body.success).toBe(true);
        });

        it('should allow HOTEL_STAFF to edit hotels', async () => {
            const updateData = {
                name: testHotel.name,
                city: 'Updated City',
                country: testHotel.country,
                description: testHotel.description,
                type: testHotel.type,
                adultCount: testHotel.adultCount,
                childCount: testHotel.childCount,
                facilities: testHotel.facilities,
                pricePerNight: testHotel.pricePerNight,
                starRating: testHotel.starRating,
            };

            const req = request(app)
                .put(`/api/my/hotel/${testHotel._id}`)
                .set('Cookie', [`auth_token=${hotelStaffToken}`]);

            const response = await addHotelFields(req, updateData).expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should deny regular USER from creating hotels', async () => {
            const response = await request(app)
                .post('/api/my/hotel')
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .field('name', 'Unauthorized Hotel')
                .field('city', 'Boston')
                .expect(403);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Insufficient permissions',
            });
        });

        it('should deny regular USER from editing hotels', async () => {
            const response = await request(app)
                .put(`/api/my/hotel/${testHotel._id}`)
                .set('Cookie', [`auth_token=${regularUserToken}`])
                .field('name', 'Unauthorized Update')
                .expect(403);

            expect(response.body).toMatchObject({
                success: false,
                message: 'Insufficient permissions',
            });
        });
    });
});
