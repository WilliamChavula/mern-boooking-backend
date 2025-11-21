import mongoose from 'mongoose';
import Hotel from '../models/hotel.model';
import type { HotelType } from '../models/hotel.model';
import type { CreateHotelPayload } from '../schemas/my-hotel.schema';
import { logger } from '../utils/logger';

/**
 * Creates a new hotel
 * @param data - Hotel creation payload
 * @returns Created hotel object
 * @throws Error if hotel creation fails
 */
export const createHotel = async (
    data: CreateHotelPayload
): Promise<HotelType> => {
    try {
        logger.info('Creating new hotel', {
            userId: data.userId,
            hotelName: data.name,
            city: data.city,
        });

        const hotel = await Hotel.create(data);

        logger.info('Hotel created successfully', {
            hotelId: hotel._id,
            userId: hotel.userId,
            hotelName: hotel.name,
        });

        return hotel.toObject();
    } catch (error) {
        // Handle duplicate key error
        if (error instanceof Error && 'code' in error && error.code === 11000) {
            logger.warn('Hotel creation failed: Duplicate hotel', {
                userId: data.userId,
                hotelName: data.name,
            });
            throw new Error('A hotel with this name already exists');
        }

        logger.error('Database error while creating hotel', {
            userId: data.userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to create hotel');
    }
};

/**
 * Retrieves all hotels owned by a specific user
 * @param userId - Owner's user ID
 * @returns Array of hotels owned by the user
 * @throws Error if database query fails
 */
export const getMyHotels = async (userId: string): Promise<HotelType[]> => {
    try {
        logger.info('Fetching hotels for user', { userId });

        const hotels = await Hotel.find({ userId })
            .sort({ createdAt: -1 })
            .lean<HotelType[]>()
            .exec();

        logger.info('User hotels retrieved', {
            userId,
            count: hotels.length,
        });

        return hotels;
    } catch (error) {
        logger.error('Database error while fetching user hotels', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to fetch user hotels');
    }
};

/**
 * Retrieves a specific hotel owned by a user
 * @param hotelId - MongoDB ObjectId of the hotel
 * @param userId - Owner's user ID
 * @returns Hotel object or null if not found
 * @throws Error if database query fails or ID is invalid
 */
export const getMyHotel = async (
    hotelId: string,
    userId: string
): Promise<HotelType | null> => {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            logger.error('Get hotel failed: Invalid ObjectId', {
                hotelId,
                userId,
            });
            throw new Error('Invalid hotel ID format');
        }

        logger.info('Fetching hotel for user', { hotelId, userId });

        const hotel = await Hotel.findOne({ _id: hotelId, userId })
            .lean<HotelType>()
            .exec();

        if (!hotel) {
            logger.info('Hotel not found or not owned by user', {
                hotelId,
                userId,
            });
            return null;
        }

        logger.info('Hotel found', {
            hotelId,
            userId,
            hotelName: hotel.name,
        });

        return hotel;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Get hotel failed: Invalid hotel ID format', {
                error,
            });
            throw error;
        }

        logger.error('Database error while fetching hotel', {
            hotelId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to fetch hotel');
    }
};

/**
 * Updates a hotel owned by a user
 * @param hotelId - MongoDB ObjectId of the hotel
 * @param userId - Owner's user ID
 * @param hotel - Updated hotel data
 * @returns Updated hotel object or null if not found
 * @throws Error if database update fails or ID is invalid
 */
export const updateHotel = async (
    hotelId: string,
    userId: string,
    hotel: CreateHotelPayload
): Promise<HotelType | null> => {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            logger.error('Update hotel failed: Invalid ObjectId', {
                hotelId,
                userId,
            });
            throw new Error('Invalid hotel ID format');
        }

        logger.info('Updating hotel', {
            hotelId,
            userId,
            hotelName: hotel.name,
        });

        const updatedHotel = await Hotel.findOneAndUpdate(
            { _id: hotelId, userId },
            { $set: hotel },
            { new: true, runValidators: true }
        )
            .lean<HotelType>()
            .exec();

        if (!updatedHotel) {
            logger.warn(
                'Hotel update failed: Hotel not found or not owned by user',
                {
                    hotelId,
                    userId,
                }
            );
            return null;
        }

        logger.info('Hotel updated successfully', {
            hotelId: updatedHotel._id,
            userId,
            hotelName: updatedHotel.name,
        });

        return updatedHotel;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Update hotel failed: Invalid input data', { error });
            throw error;
        }

        logger.error('Database error while updating hotel', {
            hotelId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to update hotel');
    }
};

/**
 * Finds a hotel document for update (returns Mongoose document, not lean)
 * @param hotelId - MongoDB ObjectId of the hotel
 * @param userId - Owner's user ID
 * @returns Hotel document or null if not found
 * @throws Error if database query fails or ID is invalid
 */
export const findHotelForUpdate = async (
    hotelId: string,
    userId: string
) => {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            logger.error('Find hotel for update failed: Invalid ObjectId', {
                hotelId,
                userId,
            });
            throw new Error('Invalid hotel ID format');
        }

        logger.info('Finding hotel for update', { hotelId, userId });

        const hotel = await Hotel.findOne({ _id: hotelId, userId }).exec();

        if (!hotel) {
            logger.info('Hotel not found or not owned by user', {
                hotelId,
                userId,
            });
            return null;
        }

        logger.info('Hotel found for update', {
            hotelId,
            userId,
            hotelName: hotel.name,
        });

        return hotel;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Find hotel for update failed: Invalid hotel ID format', {
                error,
            });
            throw error;
        }

        logger.error('Database error while finding hotel for update', {
            hotelId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to find hotel for update');
    }
};

/**
 * Deletes a hotel owned by a user
 * @param hotelId - MongoDB ObjectId of the hotel
 * @param userId - Owner's user ID
 * @returns True if hotel was deleted, false if not found
 * @throws Error if database deletion fails or ID is invalid
 */
export const deleteHotel = async (
    hotelId: string,
    userId: string
): Promise<boolean> => {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            logger.error('Delete hotel failed: Invalid ObjectId', {
                hotelId,
                userId,
            });
            throw new Error('Invalid hotel ID format');
        }

        logger.info('Deleting hotel', { hotelId, userId });

        const deletedHotel = await Hotel.findOneAndDelete({
            _id: hotelId,
            userId,
        }).exec();

        if (deletedHotel) {
            logger.info('Hotel deleted successfully', {
                hotelId: deletedHotel._id,
                userId,
                hotelName: deletedHotel.name,
            });
            return true;
        } else {
            logger.warn(
                'Hotel deletion failed: Hotel not found or not owned by user',
                {
                    hotelId,
                    userId,
                }
            );
            return false;
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Delete hotel failed: Invalid ID input', {
                hotelId,
                userId,
            });
            throw error;
        }

        logger.error('Database error while deleting hotel', {
            hotelId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to delete hotel');
    }
};

/**
 * Counts total hotels owned by a user
 * @param userId - Owner's user ID
 * @returns Number of hotels owned by the user
 * @throws Error if database query fails
 */
export const countMyHotels = async (userId: string): Promise<number> => {
    try {
        logger.info('Counting hotels for user', { userId });

        const count = await Hotel.countDocuments({ userId }).exec();

        logger.info('User hotel count retrieved', { userId, count });

        return count;
    } catch (error) {
        logger.error('Database error while counting user hotels', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to count user hotels');
    }
};

/**
 * Checks if a hotel exists and is owned by a specific user
 * @param hotelId - MongoDB ObjectId of the hotel
 * @param userId - Owner's user ID
 * @returns True if hotel exists and is owned by user, false otherwise
 * @throws Error if database query fails
 */
export const hotelExistsForUser = async (
    hotelId: string,
    userId: string
): Promise<boolean> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            return false;
        }

        logger.info('Checking if hotel exists for user', { hotelId, userId });

        const exists = await Hotel.exists({ _id: hotelId, userId }).exec();

        logger.info('Hotel existence check result', {
            hotelId,
            userId,
            exists: !!exists,
        });

        return !!exists;
    } catch (error) {
        logger.error('Database error while checking hotel existence', {
            hotelId,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to check hotel existence');
    }
};
