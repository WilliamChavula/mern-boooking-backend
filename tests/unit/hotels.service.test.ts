import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Hotel from '../../src/models/hotel.model';
import * as hotelsService from '../../src/services/hotels.service';

// Mock logger
vi.mock('../../src/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock Hotel model
vi.mock('../../src/models/hotel.model', () => ({
    default: {
        find: vi.fn(),
        findById: vi.fn(),
        findByIdAndUpdate: vi.fn(),
        countDocuments: vi.fn(),
        exists: vi.fn(),
    },
}));

describe('Hotels Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getLatestHotels', () => {
        it('should return latest hotels with default limit', async () => {
            const mockHotels = [
                {
                    _id: '507f1f77bcf86cd799439011',
                    name: 'Hotel 1',
                    city: 'New York',
                    country: 'USA',
                },
                {
                    _id: '507f1f77bcf86cd799439012',
                    name: 'Hotel 2',
                    city: 'London',
                    country: 'UK',
                },
            ];

            const mockQuery = {
                sort: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(mockHotels),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQuery as any);

            const result = await hotelsService.getLatestHotels();

            expect(result).toEqual(mockHotels);
            expect(Hotel.find).toHaveBeenCalledWith();
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(mockQuery.limit).toHaveBeenCalledWith(10);
        });

        it('should return latest hotels with custom limit', async () => {
            const mockHotels = [
                {
                    _id: '507f1f77bcf86cd799439011',
                    name: 'Hotel 1',
                    city: 'New York',
                    country: 'USA',
                },
            ];

            const mockQuery = {
                sort: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(mockHotels),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQuery as any);

            const result = await hotelsService.getLatestHotels(5);

            expect(result).toEqual(mockHotels);
            expect(mockQuery.limit).toHaveBeenCalledWith(5);
        });

        it('should throw error when database query fails', async () => {
            const mockQuery = {
                sort: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQuery as any);

            await expect(hotelsService.getLatestHotels()).rejects.toThrow(
                'Failed to fetch latest hotels'
            );
        });
    });

    describe('getAllHotels', () => {
        it('should return hotels with pagination and sorting', async () => {
            const mockQuery = { city: 'New York' };
            const mockHotels = [
                {
                    _id: '507f1f77bcf86cd799439011',
                    name: 'Hotel 1',
                    city: 'New York',
                },
            ];
            const sortBy = { starRating: -1 as const };

            const mockQueryChain = {
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(mockHotels),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQueryChain as any);

            const result = await hotelsService.getAllHotels(
                mockQuery,
                0,
                10,
                sortBy
            );

            expect(result).toEqual(mockHotels);
            expect(Hotel.find).toHaveBeenCalledWith(mockQuery);
            expect(mockQueryChain.sort).toHaveBeenCalledWith(sortBy);
            expect(mockQueryChain.skip).toHaveBeenCalledWith(0);
            expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
        });

        it('should throw error when database query fails', async () => {
            const mockQueryChain = {
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQueryChain as any);

            await expect(
                hotelsService.getAllHotels({}, 0, 10, {})
            ).rejects.toThrow('Failed to fetch hotels');
        });
    });

    describe('getHotelById', () => {
        it('should return hotel when valid ID is provided', async () => {
            const hotelId = '507f1f77bcf86cd799439011';
            const mockHotel = {
                _id: hotelId,
                name: 'Test Hotel',
                city: 'New York',
                country: 'USA',
            };

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(mockHotel),
            };

            vi.mocked(Hotel.findById).mockReturnValue(mockQueryChain as any);

            const result = await hotelsService.getHotelById(hotelId);

            expect(result).toEqual(mockHotel);
            expect(Hotel.findById).toHaveBeenCalledWith(hotelId);
        });

        it('should return null when hotel is not found', async () => {
            const hotelId = '507f1f77bcf86cd799439011';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.findById).mockReturnValue(mockQueryChain as any);

            const result = await hotelsService.getHotelById(hotelId);

            expect(result).toBeNull();
        });

        it('should throw error for invalid hotel ID', async () => {
            const invalidId = 'invalid-id';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);

            await expect(hotelsService.getHotelById(invalidId)).rejects.toThrow(
                'Invalid hotel ID format'
            );
        });

        it('should throw error when database query fails', async () => {
            const hotelId = '507f1f77bcf86cd799439011';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.findById).mockReturnValue(mockQueryChain as any);

            await expect(hotelsService.getHotelById(hotelId)).rejects.toThrow(
                'Failed to fetch hotel'
            );
        });
    });

    describe('getHotelCount', () => {
        it('should return count of hotels matching query', async () => {
            const mockQuery = { city: 'New York' };
            const mockCount = 5;

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue(mockCount),
            };

            vi.mocked(Hotel.countDocuments).mockReturnValue(
                mockQueryChain as any
            );

            const result = await hotelsService.getHotelCount(mockQuery);

            expect(result).toBe(mockCount);
            expect(Hotel.countDocuments).toHaveBeenCalledWith(mockQuery);
        });

        it('should throw error when database query fails', async () => {
            const mockQueryChain = {
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.countDocuments).mockReturnValue(
                mockQueryChain as any
            );

            await expect(hotelsService.getHotelCount({})).rejects.toThrow(
                'Failed to count hotels'
            );
        });
    });

    describe('constructSearchQuery', () => {
        it('should construct query with destination filter', () => {
            const params = { destination: 'New York' };

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result.$or).toBeDefined();
            expect(result.$or).toHaveLength(2);
        });

        it('should construct query with adult count filter', () => {
            const params = { adultCount: 2 };

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result.adultCount).toEqual({ $gte: 2 });
        });

        it('should construct query with child count filter', () => {
            const params = { childCount: 1 };

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result.childCount).toEqual({ $gte: 1 });
        });

        it('should construct query with max price filter', () => {
            const params = { maxPrice: 200 };

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result.pricePerNight).toEqual({ $lte: 200 });
        });

        it('should construct query with star rating filter', () => {
            const params = { stars: ['4', '5'] };

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result.starRating).toEqual({ $in: ['4', '5'] });
        });

        it('should construct query with single star rating', () => {
            const params = { stars: '5' };

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result.starRating).toEqual({ $in: ['5'] });
        });

        it('should construct query with hotel types filter', () => {
            const params = { types: ['Luxury', 'Resort'] };

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result.type).toEqual({ $in: ['Luxury', 'Resort'] });
        });

        it('should construct query with facilities filter', () => {
            const params = { facilities: ['WiFi', 'Pool'] };

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result.facilities).toEqual({ $all: ['WiFi', 'Pool'] });
        });

        it('should construct query with multiple filters', () => {
            const params = {
                destination: 'New York',
                adultCount: 2,
                childCount: 1,
                maxPrice: 200,
                stars: ['4', '5'],
                types: ['Luxury'],
                facilities: ['WiFi', 'Pool'],
            };

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result.$or).toBeDefined();
            expect(result.adultCount).toEqual({ $gte: 2 });
            expect(result.childCount).toEqual({ $gte: 1 });
            expect(result.pricePerNight).toEqual({ $lte: 200 });
            expect(result.starRating).toEqual({ $in: ['4', '5'] });
            expect(result.type).toEqual({ $in: ['Luxury'] });
            expect(result.facilities).toEqual({ $all: ['WiFi', 'Pool'] });
        });

        it('should return empty query when no params provided', () => {
            const params = {};

            const result = hotelsService.constructSearchQuery(params as any);

            expect(result).toEqual({});
        });
    });

    describe('constructSortOptions', () => {
        it('should construct sort by star rating descending', () => {
            const result = hotelsService.constructSortOptions('starRating');

            expect(result).toEqual({ starRating: -1 });
        });

        it('should construct sort by price ascending', () => {
            const result =
                hotelsService.constructSortOptions('pricePerNightAsc');

            expect(result).toEqual({ pricePerNight: 1 });
        });

        it('should construct sort by price descending', () => {
            const result =
                hotelsService.constructSortOptions('pricePerNightDesc');

            expect(result).toEqual({ pricePerNight: -1 });
        });

        it('should return empty object for undefined sort option', () => {
            const result = hotelsService.constructSortOptions(undefined);

            expect(result).toEqual({});
        });

        it('should return empty object for unknown sort option', () => {
            const result = hotelsService.constructSortOptions(
                'unknownOption' as any
            );

            expect(result).toEqual({});
        });
    });

    describe('findHotelByIdAndUpdateBooking', () => {
        it('should add booking to hotel successfully', async () => {
            const hotelId = '507f1f77bcf86cd799439011';
            const booking = {
                userId: 'user123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                adultCount: 2,
                childCount: 1,
                paymentIntentId: 'pi_123456789',
                totalStayCost: 500,
                checkIn: '2025-12-01',
                checkOut: '2025-12-05',
            };

            const mockUpdatedHotel = {
                _id: hotelId,
                name: 'Test Hotel',
                bookings: [booking],
            };

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(mockUpdatedHotel),
            };

            vi.mocked(Hotel.findByIdAndUpdate).mockReturnValue(
                mockQueryChain as any
            );

            const result = await hotelsService.findHotelByIdAndUpdateBooking(
                hotelId,
                booking
            );

            expect(result).toEqual(mockUpdatedHotel);
            expect(Hotel.findByIdAndUpdate).toHaveBeenCalledWith(
                hotelId,
                { $push: { bookings: booking } },
                { new: true, runValidators: true }
            );
        });

        it('should return null when hotel is not found', async () => {
            const hotelId = '507f1f77bcf86cd799439011';
            const booking = {
                userId: 'user123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                adultCount: 2,
                childCount: 1,
                paymentIntentId: 'pi_123456789',
                totalStayCost: 500,
                checkIn: '2025-12-01',
                checkOut: '2025-12-05',
            };

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.findByIdAndUpdate).mockReturnValue(
                mockQueryChain as any
            );

            const result = await hotelsService.findHotelByIdAndUpdateBooking(
                hotelId,
                booking
            );

            expect(result).toBeNull();
        });

        it('should throw error for invalid hotel ID', async () => {
            const invalidId = 'invalid-id';
            const booking = {
                userId: 'user123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                adultCount: 2,
                childCount: 1,
                paymentIntentId: 'pi_123456789',
                totalStayCost: 500,
                checkIn: '2025-12-01',
                checkOut: '2025-12-05',
            };

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);

            await expect(
                hotelsService.findHotelByIdAndUpdateBooking(invalidId, booking)
            ).rejects.toThrow('Invalid hotel ID format');
        });

        it('should throw error when database update fails', async () => {
            const hotelId = '507f1f77bcf86cd799439011';
            const booking = {
                userId: 'user123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                adultCount: 2,
                childCount: 1,
                paymentIntentId: 'pi_123456789',
                totalStayCost: 500,
                checkIn: '2025-12-01',
                checkOut: '2025-12-05',
            };

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.findByIdAndUpdate).mockReturnValue(
                mockQueryChain as any
            );

            await expect(
                hotelsService.findHotelByIdAndUpdateBooking(hotelId, booking)
            ).rejects.toThrow('Failed to add booking to hotel');
        });
    });

    describe('findBookingsByUserId', () => {
        it('should return hotels with user bookings', async () => {
            const userId = 'user123';
            const mockHotels = [
                {
                    _id: '507f1f77bcf86cd799439011',
                    name: 'Hotel 1',
                    bookings: [
                        {
                            userId: 'user123',
                            firstName: 'John',
                            lastName: 'Doe',
                            email: 'john@example.com',
                            adultCount: 2,
                            childCount: 1,
                            totalStayCost: 500,
                            checkIn: new Date('2025-12-01'),
                            checkOut: new Date('2025-12-05'),
                        },
                        {
                            userId: 'user456',
                            firstName: 'Jane',
                            lastName: 'Smith',
                            email: 'jane@example.com',
                            adultCount: 1,
                            childCount: 0,
                            totalStayCost: 300,
                            checkIn: new Date('2025-12-10'),
                            checkOut: new Date('2025-12-12'),
                        },
                    ],
                },
            ];

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(mockHotels),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQueryChain as any);

            const result = await hotelsService.findBookingsByUserId(userId);

            expect(result).toHaveLength(1);
            expect(result[0].bookings).toHaveLength(1);
            expect(result[0].bookings[0].userId).toBe(userId);
            expect(Hotel.find).toHaveBeenCalledWith({
                bookings: { $elemMatch: { userId } },
            });
        });

        it('should return empty array when no bookings found', async () => {
            const userId = 'user123';

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([]),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQueryChain as any);

            const result = await hotelsService.findBookingsByUserId(userId);

            expect(result).toEqual([]);
        });

        it('should throw error when database query fails', async () => {
            const userId = 'user123';

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQueryChain as any);

            await expect(
                hotelsService.findBookingsByUserId(userId)
            ).rejects.toThrow('Failed to fetch user bookings');
        });
    });

    describe('hotelExists', () => {
        it('should return true when hotel exists', async () => {
            const hotelId = '507f1f77bcf86cd799439011';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue({ _id: hotelId }),
            };

            vi.mocked(Hotel.exists).mockReturnValue(mockQueryChain as any);

            const result = await hotelsService.hotelExists(hotelId);

            expect(result).toBe(true);
            expect(Hotel.exists).toHaveBeenCalledWith({ _id: hotelId });
        });

        it('should return false when hotel does not exist', async () => {
            const hotelId = '507f1f77bcf86cd799439011';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.exists).mockReturnValue(mockQueryChain as any);

            const result = await hotelsService.hotelExists(hotelId);

            expect(result).toBe(false);
        });

        it('should return false for invalid hotel ID', async () => {
            const invalidId = 'invalid-id';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);

            const result = await hotelsService.hotelExists(invalidId);

            expect(result).toBe(false);
            expect(Hotel.exists).not.toHaveBeenCalled();
        });

        it('should throw error when database query fails', async () => {
            const hotelId = '507f1f77bcf86cd799439011';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.exists).mockReturnValue(mockQueryChain as any);

            await expect(hotelsService.hotelExists(hotelId)).rejects.toThrow(
                'Failed to check hotel existence'
            );
        });
    });
});
