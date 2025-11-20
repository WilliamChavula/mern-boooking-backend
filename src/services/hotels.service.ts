import mongoose, { FilterQuery, SortOrder } from 'mongoose';
import Hotel, { HotelType } from '../models/hotel.model';
import {
    CreateBookingSchema,
    HotelParamsSchema,
} from '../schemas/hotel.schema';
import { logger } from '../utils/logger';

/**
 * Retrieves the latest hotels sorted by last update
 * @param limit - Maximum number of hotels to return (default: 10)
 * @returns Array of hotel objects
 * @throws Error if database query fails
 */
export const getLatestHotels = async (
    limit: number = 10
): Promise<HotelType[]> => {
    try {
        logger.debug('Fetching latest hotels', { limit });

        const hotels = await Hotel.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean<HotelType[]>()
            .exec();

        logger.debug('Latest hotels retrieved', { count: hotels.length });

        return hotels;
    } catch (error) {
        logger.error('Database error while fetching latest hotels', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to fetch latest hotels');
    }
};

/**
 * Retrieves all hotels with pagination and sorting
 * @param query - MongoDB filter query
 * @param skip - Number of documents to skip
 * @param limit - Maximum number of documents to return
 * @param sortBy - Sort options
 * @returns Array of hotel documents
 * @throws Error if database query fails
 */
export const getAllHotels = async (
    query: FilterQuery<HotelType>,
    skip: number,
    limit: number,
    sortBy: Partial<Record<'starRating' | 'pricePerNight', SortOrder>>
): Promise<HotelType[]> => {
    try {
        logger.debug('Fetching hotels with filters', {
            skip,
            limit,
            sortBy,
            hasQuery: Object.keys(query).length > 0,
        });

        const hotels = await Hotel.find(query)
            .sort(sortBy)
            .skip(skip)
            .limit(limit)
            .lean<HotelType[]>()
            .exec();

        logger.debug('Hotels retrieved', { count: hotels.length });

        return hotels;
    } catch (error) {
        logger.error('Database error while fetching hotels', {
            error: error instanceof Error ? error.message : 'Unknown error',
            skip,
            limit,
        });
        throw new Error('Failed to fetch hotels');
    }
};

/**
 * Retrieves a hotel by its ID
 * @param hotelId - MongoDB ObjectId of the hotel
 * @returns Hotel object or null if not found
 * @throws Error if database query fails or ID is invalid
 */
export const getHotelById = async (
    hotelId: string
): Promise<HotelType | null> => {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            logger.error('Get hotel by ID failed: Invalid ObjectId', {
                hotelId,
            });
            throw new Error('Invalid hotel ID format');
        }

        logger.info('Fetching hotel by ID', { hotelId });

        const hotel = await Hotel.findById(hotelId).lean<HotelType>().exec();

        if (!hotel) {
            logger.info('Hotel not found', { hotelId });
            return null;
        }

        logger.info('Hotel found', { hotelId, hotelName: hotel.name });
        return hotel;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Get hotel by ID failed: Invalid ObjectId', {
                hotelId,
                error: error.message,
            });
            throw error;
        }

        logger.error('Database error while fetching hotel by ID', {
            hotelId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to fetch hotel');
    }
};

/**
 * Counts hotels matching the given query
 * @param query - MongoDB filter query
 * @returns Number of matching hotels
 * @throws Error if database query fails
 */
export const getHotelCount = async (
    query: FilterQuery<HotelType>
): Promise<number> => {
    try {
        logger.debug('Counting hotels', {
            hasQuery: Object.keys(query).length > 0,
        });

        const count = await Hotel.countDocuments(query).exec();

        logger.debug('Hotel count retrieved', { count });

        return count;
    } catch (error) {
        logger.error('Database error while counting hotels', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to count hotels');
    }
};

/**
 * Constructs a MongoDB query from search parameters
 * @param params - Search parameters from request
 * @returns MongoDB filter query
 */
export const constructSearchQuery = (
    params: HotelParamsSchema
): FilterQuery<HotelType> => {
    const query: FilterQuery<HotelType> = {};

    try {
        // Destination search (city or country)
        if (params.destination) {
            const destinationRegex = new RegExp(params.destination.trim(), 'i');
            query.$or = [
                { city: destinationRegex },
                { country: destinationRegex },
            ];
        }

        // Guest capacity filters
        if (params.adultCount !== undefined) {
            query.adultCount = { $gte: params.adultCount };
        }

        if (params.childCount !== undefined) {
            query.childCount = { $gte: params.childCount };
        }

        // Price filter
        if (params.maxPrice !== undefined) {
            query.pricePerNight = { $lte: params.maxPrice };
        }

        // Star rating filter
        if (params.stars) {
            const stars = Array.isArray(params.stars)
                ? params.stars
                : [params.stars];
            query.starRating = { $in: stars };
        }

        // Hotel type filter
        if (params.types) {
            const types = Array.isArray(params.types)
                ? params.types
                : [params.types];
            query.type = { $in: types };
        }

        // Facilities filter (must have all specified facilities)
        if (params.facilities) {
            const facilities = Array.isArray(params.facilities)
                ? params.facilities
                : [params.facilities];
            query.facilities = { $all: facilities };
        }

        logger.info('Search query constructed', {
            queryKeys: Object.keys(query),
            hasDestination: !!params.destination,
            hasFilters: !!params.stars || !!params.types || !!params.facilities,
        });

        return query;
    } catch (error) {
        logger.error('Error constructing search query', {
            error: error instanceof Error ? error.message : 'Unknown error',
            params,
        });
        // Return empty query on error to avoid breaking the search
        return {};
    }
};

/**
 * Constructs MongoDB sort options from sort parameter
 * @param sortOptions - Sort option string
 * @returns MongoDB sort object
 */
export const constructSortOptions = (
    sortOptions?: HotelParamsSchema['sort']
): Partial<Record<'starRating' | 'pricePerNight', SortOrder>> => {
    const options: Partial<Record<'starRating' | 'pricePerNight', SortOrder>> =
        {};

    if (!sortOptions) {
        // Default sort by updatedAt descending
        logger.debug('Using default sort options');
        return options;
    }

    switch (sortOptions) {
        case 'starRating':
            options.starRating = -1;
            logger.info('Sort by star rating (descending)');
            break;
        case 'pricePerNightAsc':
            options.pricePerNight = 1;
            logger.info('Sort by price (ascending)');
            break;
        case 'pricePerNightDesc':
            options.pricePerNight = -1;
            logger.info('Sort by price (descending)');
            break;
        default:
            logger.warn('Unknown sort option', { sortOptions });
    }

    return options;
};

/**
 * Adds a booking to a hotel
 * @param hotelId - MongoDB ObjectId of the hotel
 * @param booking - Booking data to add
 * @returns Updated hotel object or null if not found
 * @throws Error if database operation fails or ID is invalid
 */
export const findHotelByIdAndUpdateBooking = async (
    hotelId: string,
    booking: CreateBookingSchema
): Promise<HotelType | null> => {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            logger.error('Add booking failed: Invalid ObjectId', { hotelId });
            throw new Error('Invalid hotel ID format');
        }

        logger.info('Adding booking to hotel', {
            hotelId,
            userId: booking.userId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
        });

        const updatedHotel = await Hotel.findByIdAndUpdate(
            hotelId,
            { $push: { bookings: booking } },
            { new: true, runValidators: true }
        )
            .lean<HotelType>()
            .exec();

        if (!updatedHotel) {
            logger.warn('Hotel not found for booking', { hotelId });
            return null;
        }

        logger.info('Booking added to hotel', {
            hotelId,
            userId: booking.userId,
            bookingCount: updatedHotel.bookings.length,
        });

        return updatedHotel;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            logger.error('Add booking failed: Invalid ObjectId', {
                hotelId,
                error: error.message,
            });
            throw error;
        }

        logger.error('Database error while adding booking', {
            hotelId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to add booking to hotel');
    }
};

/**
 * Finds all bookings for a specific user across all hotels
 * @param userId - User's ID
 * @returns Array of hotels with only the user's bookings
 * @throws Error if database query fails
 */
export const findBookingsByUserId = async (
    userId: string
): Promise<HotelType[]> => {
    try {
        logger.info('Fetching bookings for user', { userId });

        // Find all hotels that have bookings for this user
        const hotelsWithBookings = await Hotel.find({
            bookings: { $elemMatch: { userId } },
        })
            .lean<HotelType[]>()
            .exec();

        // Filter to include only the user's bookings for each hotel
        const userBookings = hotelsWithBookings.map(hotel => {
            const userSpecificBookings = hotel.bookings.filter(
                booking => booking.userId === userId
            );

            return {
                ...hotel,
                bookings: userSpecificBookings,
            };
        });

        logger.info('User bookings retrieved', {
            userId,
            hotelCount: userBookings.length,
            totalBookings: userBookings.reduce(
                (sum, hotel) => sum + hotel.bookings.length,
                0
            ),
        });

        return userBookings;
    } catch (error) {
        logger.error('Database error while fetching user bookings', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to fetch user bookings');
    }
};

/**
 * Checks if a hotel exists by ID
 * @param hotelId - MongoDB ObjectId of the hotel
 * @returns True if hotel exists, false otherwise
 * @throws Error if database query fails
 */
export const hotelExists = async (hotelId: string): Promise<boolean> => {
    try {
        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            return false;
        }

        logger.info('Checking if hotel exists', { hotelId });

        const exists = await Hotel.exists({ _id: hotelId }).exec();

        logger.info('Hotel existence check result', {
            hotelId,
            exists: !!exists,
        });

        return !!exists;
    } catch (error) {
        logger.error('Database error while checking hotel existence', {
            hotelId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Failed to check hotel existence');
    }
};
