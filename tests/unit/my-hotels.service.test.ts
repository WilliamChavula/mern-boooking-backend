import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Hotel from '../../src/models/hotel.model';
import * as myHotelsService from '../../src/services/my-hotels.service';

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
        create: vi.fn(),
        find: vi.fn(),
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
        findOneAndDelete: vi.fn(),
        countDocuments: vi.fn(),
        exists: vi.fn(),
    },
}));

describe('My Hotels Service', () => {
    const mockUserId = 'user123';
    const mockHotelId = '507f1f77bcf86cd799439011';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createHotel', () => {
        const mockHotelData = {
            userId: mockUserId,
            name: 'Grand Plaza Hotel',
            city: 'New York',
            country: 'USA',
            description: 'A luxurious hotel in Manhattan',
            type: 'Luxury',
            adultCount: 2,
            childCount: 1,
            pricePerNight: 250,
            starRating: 5,
            imageUrls: ['https://example.com/hotel1.jpg'],
            facilities: ['WiFi', 'Pool', 'Spa'],
        };

        it('should create a hotel successfully', async () => {
            const mockCreatedHotel = {
                ...mockHotelData,
                _id: mockHotelId,
                bookings: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                toObject: vi.fn().mockReturnValue({
                    ...mockHotelData,
                    _id: mockHotelId,
                    bookings: [],
                }),
            };

            vi.mocked(Hotel.create).mockResolvedValue(mockCreatedHotel as any);

            const result = await myHotelsService.createHotel(mockHotelData);

            expect(result).toEqual({
                ...mockHotelData,
                _id: mockHotelId,
                bookings: [],
            });
            expect(Hotel.create).toHaveBeenCalledWith(mockHotelData);
        });

        it('should throw error for duplicate hotel name', async () => {
            const duplicateError = Object.assign(new Error('Duplicate key'), {
                code: 11000,
            });

            vi.mocked(Hotel.create).mockRejectedValue(duplicateError);

            await expect(
                myHotelsService.createHotel(mockHotelData)
            ).rejects.toThrow('A hotel with this name already exists');
        });

        it('should throw error when database creation fails', async () => {
            vi.mocked(Hotel.create).mockRejectedValue(
                new Error('Database error')
            );

            await expect(
                myHotelsService.createHotel(mockHotelData)
            ).rejects.toThrow('Failed to create hotel');
        });
    });

    describe('getMyHotels', () => {
        it('should return all hotels for a user', async () => {
            const mockHotels = [
                {
                    _id: mockHotelId,
                    userId: mockUserId,
                    name: 'Hotel 1',
                    city: 'New York',
                    country: 'USA',
                },
                {
                    _id: '507f1f77bcf86cd799439012',
                    userId: mockUserId,
                    name: 'Hotel 2',
                    city: 'London',
                    country: 'UK',
                },
            ];

            const mockQueryChain = {
                sort: vi.fn().mockReturnThis(),
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(mockHotels),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQueryChain as any);

            const result = await myHotelsService.getMyHotels(mockUserId);

            expect(result).toEqual(mockHotels);
            expect(Hotel.find).toHaveBeenCalledWith({ userId: mockUserId });
            expect(mockQueryChain.sort).toHaveBeenCalledWith({
                createdAt: -1,
            });
        });

        it('should return empty array when user has no hotels', async () => {
            const mockQueryChain = {
                sort: vi.fn().mockReturnThis(),
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([]),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQueryChain as any);

            const result = await myHotelsService.getMyHotels(mockUserId);

            expect(result).toEqual([]);
        });

        it('should throw error when database query fails', async () => {
            const mockQueryChain = {
                sort: vi.fn().mockReturnThis(),
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.find).mockReturnValue(mockQueryChain as any);

            await expect(
                myHotelsService.getMyHotels(mockUserId)
            ).rejects.toThrow('Failed to fetch user hotels');
        });
    });

    describe('getMyHotel', () => {
        it('should return hotel when valid ID and user match', async () => {
            const mockHotel = {
                _id: mockHotelId,
                userId: mockUserId,
                name: 'Test Hotel',
                city: 'New York',
                country: 'USA',
            };

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(mockHotel),
            };

            vi.mocked(Hotel.findOne).mockReturnValue(mockQueryChain as any);

            const result = await myHotelsService.getMyHotel(
                mockHotelId,
                mockUserId
            );

            expect(result).toEqual(mockHotel);
            expect(Hotel.findOne).toHaveBeenCalledWith({
                _id: mockHotelId,
                userId: mockUserId,
            });
        });

        it('should return null when hotel is not found', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.findOne).mockReturnValue(mockQueryChain as any);

            const result = await myHotelsService.getMyHotel(
                mockHotelId,
                mockUserId
            );

            expect(result).toBeNull();
        });

        it('should return null when hotel is owned by different user', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.findOne).mockReturnValue(mockQueryChain as any);

            const result = await myHotelsService.getMyHotel(
                mockHotelId,
                'differentUser'
            );

            expect(result).toBeNull();
            expect(Hotel.findOne).toHaveBeenCalledWith({
                _id: mockHotelId,
                userId: 'differentUser',
            });
        });

        it('should throw error for invalid hotel ID', async () => {
            const invalidId = 'invalid-id';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);

            await expect(
                myHotelsService.getMyHotel(invalidId, mockUserId)
            ).rejects.toThrow('Invalid hotel ID format');
        });

        it('should throw error when database query fails', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.findOne).mockReturnValue(mockQueryChain as any);

            await expect(
                myHotelsService.getMyHotel(mockHotelId, mockUserId)
            ).rejects.toThrow('Failed to fetch hotel');
        });
    });

    describe('updateHotel', () => {
        const mockUpdateData = {
            userId: mockUserId,
            name: 'Updated Hotel',
            city: 'Boston',
            country: 'USA',
            description: 'Updated description',
            type: 'Boutique',
            adultCount: 3,
            childCount: 2,
            pricePerNight: 300,
            starRating: 4,
            imageUrls: ['https://example.com/updated.jpg'],
            facilities: ['WiFi', 'Gym'],
        };

        it('should update hotel successfully', async () => {
            const mockUpdatedHotel = {
                _id: mockHotelId,
                ...mockUpdateData,
                bookings: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(mockUpdatedHotel),
            };

            vi.mocked(Hotel.findOneAndUpdate).mockReturnValue(
                mockQueryChain as any
            );

            const result = await myHotelsService.updateHotel(
                mockHotelId,
                mockUserId,
                mockUpdateData
            );

            expect(result).toEqual(mockUpdatedHotel);
            expect(Hotel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: mockHotelId, userId: mockUserId },
                { $set: mockUpdateData },
                { new: true, runValidators: true }
            );
        });

        it('should return null when hotel is not found', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.findOneAndUpdate).mockReturnValue(
                mockQueryChain as any
            );

            const result = await myHotelsService.updateHotel(
                mockHotelId,
                mockUserId,
                mockUpdateData
            );

            expect(result).toBeNull();
        });

        it('should return null when hotel is owned by different user', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.findOneAndUpdate).mockReturnValue(
                mockQueryChain as any
            );

            const result = await myHotelsService.updateHotel(
                mockHotelId,
                'differentUser',
                mockUpdateData
            );

            expect(result).toBeNull();
        });

        it('should throw error for invalid hotel ID', async () => {
            const invalidId = 'invalid-id';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);

            await expect(
                myHotelsService.updateHotel(
                    invalidId,
                    mockUserId,
                    mockUpdateData
                )
            ).rejects.toThrow('Invalid hotel ID format');
        });

        it('should throw error when database update fails', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                lean: vi.fn().mockReturnThis(),
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.findOneAndUpdate).mockReturnValue(
                mockQueryChain as any
            );

            await expect(
                myHotelsService.updateHotel(
                    mockHotelId,
                    mockUserId,
                    mockUpdateData
                )
            ).rejects.toThrow('Failed to update hotel');
        });
    });

    describe('deleteHotel', () => {
        it('should delete hotel successfully and return true', async () => {
            const mockDeletedHotel = {
                _id: mockHotelId,
                userId: mockUserId,
                name: 'Deleted Hotel',
            };

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue(mockDeletedHotel),
            };

            vi.mocked(Hotel.findOneAndDelete).mockReturnValue(
                mockQueryChain as any
            );

            const result = await myHotelsService.deleteHotel(
                mockHotelId,
                mockUserId
            );

            expect(result).toBe(true);
            expect(Hotel.findOneAndDelete).toHaveBeenCalledWith({
                _id: mockHotelId,
                userId: mockUserId,
            });
        });

        it('should return false when hotel is not found', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.findOneAndDelete).mockReturnValue(
                mockQueryChain as any
            );

            const result = await myHotelsService.deleteHotel(
                mockHotelId,
                mockUserId
            );

            expect(result).toBe(false);
        });

        it('should return false when hotel is owned by different user', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.findOneAndDelete).mockReturnValue(
                mockQueryChain as any
            );

            const result = await myHotelsService.deleteHotel(
                mockHotelId,
                'differentUser'
            );

            expect(result).toBe(false);
        });

        it('should throw error for invalid hotel ID', async () => {
            const invalidId = 'invalid-id';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);

            await expect(
                myHotelsService.deleteHotel(invalidId, mockUserId)
            ).rejects.toThrow('Invalid hotel ID format');
        });

        it('should throw error when database deletion fails', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.findOneAndDelete).mockReturnValue(
                mockQueryChain as any
            );

            await expect(
                myHotelsService.deleteHotel(mockHotelId, mockUserId)
            ).rejects.toThrow('Failed to delete hotel');
        });
    });

    describe('countMyHotels', () => {
        it('should return count of user hotels', async () => {
            const mockCount = 5;

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue(mockCount),
            };

            vi.mocked(Hotel.countDocuments).mockReturnValue(
                mockQueryChain as any
            );

            const result = await myHotelsService.countMyHotels(mockUserId);

            expect(result).toBe(mockCount);
            expect(Hotel.countDocuments).toHaveBeenCalledWith({
                userId: mockUserId,
            });
        });

        it('should return 0 when user has no hotels', async () => {
            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue(0),
            };

            vi.mocked(Hotel.countDocuments).mockReturnValue(
                mockQueryChain as any
            );

            const result = await myHotelsService.countMyHotels(mockUserId);

            expect(result).toBe(0);
        });

        it('should throw error when database query fails', async () => {
            const mockQueryChain = {
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.countDocuments).mockReturnValue(
                mockQueryChain as any
            );

            await expect(
                myHotelsService.countMyHotels(mockUserId)
            ).rejects.toThrow('Failed to count user hotels');
        });
    });

    describe('hotelExistsForUser', () => {
        it('should return true when hotel exists for user', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue({ _id: mockHotelId }),
            };

            vi.mocked(Hotel.exists).mockReturnValue(mockQueryChain as any);

            const result = await myHotelsService.hotelExistsForUser(
                mockHotelId,
                mockUserId
            );

            expect(result).toBe(true);
            expect(Hotel.exists).toHaveBeenCalledWith({
                _id: mockHotelId,
                userId: mockUserId,
            });
        });

        it('should return false when hotel does not exist', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.exists).mockReturnValue(mockQueryChain as any);

            const result = await myHotelsService.hotelExistsForUser(
                mockHotelId,
                mockUserId
            );

            expect(result).toBe(false);
        });

        it('should return false when hotel is owned by different user', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockResolvedValue(null),
            };

            vi.mocked(Hotel.exists).mockReturnValue(mockQueryChain as any);

            const result = await myHotelsService.hotelExistsForUser(
                mockHotelId,
                'differentUser'
            );

            expect(result).toBe(false);
        });

        it('should return false for invalid hotel ID', async () => {
            const invalidId = 'invalid-id';

            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);

            const result = await myHotelsService.hotelExistsForUser(
                invalidId,
                mockUserId
            );

            expect(result).toBe(false);
            expect(Hotel.exists).not.toHaveBeenCalled();
        });

        it('should throw error when database query fails', async () => {
            vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);

            const mockQueryChain = {
                exec: vi.fn().mockRejectedValue(new Error('Database error')),
            };

            vi.mocked(Hotel.exists).mockReturnValue(mockQueryChain as any);

            await expect(
                myHotelsService.hotelExistsForUser(mockHotelId, mockUserId)
            ).rejects.toThrow('Failed to check hotel existence');
        });
    });
});
