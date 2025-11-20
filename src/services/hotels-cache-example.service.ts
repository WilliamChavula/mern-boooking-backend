/**
 * Example: Using Redis caching with the Hotels Service
 * 
 * This file demonstrates how to integrate caching into existing services
 * Copy and adapt these patterns to your service files
 */

import { CacheService } from '../services/cache.service';
import Hotel, { HotelType } from '../models/hotel.model';
import { logger } from '../utils/logger';

/**
 * Example 1: Cache latest hotels
 * Cache hot data with short TTL (10 minutes)
 */
export const getLatestHotelsCached = async (
    limit: number = 10
): Promise<HotelType[]> => {
    const cacheKey = CacheService.Keys.hotels(`latest:${limit}`);

    try {
        // Try to get from cache using getOrSet
        const hotels = await CacheService.getOrSet(
            cacheKey,
            async () => {
                logger.debug('Fetching latest hotels from database', { limit });
                return await Hotel.find()
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean<HotelType[]>()
                    .exec();
            },
            { ttl: 600 } // 10 minutes
        );

        return hotels || [];
    } catch (error) {
        logger.error('Error fetching latest hotels', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Example 2: Cache individual hotel with longer TTL
 * Cache warm data with medium TTL (30 minutes)
 */
export const getHotelByIdCached = async (
    hotelId: string
): Promise<HotelType | null> => {
    const cacheKey = CacheService.Keys.hotel(hotelId);

    try {
        // Manual cache check for more control
        let hotel = await CacheService.get<HotelType>(cacheKey);

        if (!hotel) {
            logger.debug('Hotel not in cache, fetching from database', { hotelId });
            hotel = await Hotel.findById(hotelId).lean<HotelType>().exec();

            if (hotel) {
                await CacheService.set(cacheKey, hotel, { ttl: 1800 }); // 30 minutes
            }
        }

        return hotel;
    } catch (error) {
        logger.error('Error fetching hotel', {
            hotelId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Example 3: Search with dynamic cache keys
 * Cache search results based on query parameters
 */
export const searchHotelsCached = async (
    searchParams: {
        destination?: string;
        adultCount?: number;
        childCount?: number;
        page?: number;
    }
): Promise<{ hotels: HotelType[]; total: number }> => {
    // Create deterministic cache key from search params
    const queryString = JSON.stringify(searchParams);
    const cacheKey = CacheService.Keys.hotels(`search:${queryString}`);

    try {
        const result = await CacheService.getOrSet(
            cacheKey,
            async () => {
                logger.debug('Searching hotels in database', searchParams);
                
                const query: any = {};
                if (searchParams.destination) {
                    query.city = new RegExp(searchParams.destination, 'i');
                }
                
                const skip = ((searchParams.page || 1) - 1) * 10;
                const [hotels, total] = await Promise.all([
                    Hotel.find(query).skip(skip).limit(10).lean().exec(),
                    Hotel.countDocuments(query),
                ]);

                return { hotels, total };
            },
            { ttl: 600 } // 10 minutes - search results change frequently
        );

        return result || { hotels: [], total: 0 };
    } catch (error) {
        logger.error('Error searching hotels', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Example 4: Cache invalidation on create/update
 * Invalidate relevant caches when data changes
 */
export const createHotelWithCacheInvalidation = async (
    hotelData: Partial<HotelType>
): Promise<HotelType> => {
    try {
        logger.debug('Creating new hotel', { name: hotelData.name });
        
        const hotel = await Hotel.create(hotelData);

        // Invalidate all hotel list caches
        await CacheService.invalidate(CacheService.Patterns.allHotels);
        
        logger.info('Hotel created and caches invalidated', {
            hotelId: hotel._id,
        });

        return hotel.toObject();
    } catch (error) {
        logger.error('Error creating hotel', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Example 5: Update with specific cache invalidation
 */
export const updateHotelWithCacheInvalidation = async (
    hotelId: string,
    updateData: Partial<HotelType>
): Promise<HotelType | null> => {
    try {
        logger.debug('Updating hotel', { hotelId });
        
        const hotel = await Hotel.findByIdAndUpdate(
            hotelId,
            updateData,
            { new: true }
        ).lean<HotelType>().exec();

        if (hotel) {
            // Invalidate specific hotel cache
            await CacheService.del(CacheService.Keys.hotel(hotelId));
            
            // Invalidate hotel lists
            await CacheService.invalidate(CacheService.Patterns.allHotels);
            
            logger.info('Hotel updated and caches invalidated', { hotelId });
        }

        return hotel;
    } catch (error) {
        logger.error('Error updating hotel', {
            hotelId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Example 6: Delete with cache cleanup
 */
export const deleteHotelWithCacheInvalidation = async (
    hotelId: string
): Promise<boolean> => {
    try {
        logger.debug('Deleting hotel', { hotelId });
        
        const result = await Hotel.findByIdAndDelete(hotelId);

        if (result) {
            // Delete specific hotel cache
            await CacheService.del(CacheService.Keys.hotel(hotelId));
            
            // Invalidate all related caches
            await Promise.all([
                CacheService.invalidate(CacheService.Patterns.allHotels),
                CacheService.invalidate(CacheService.Patterns.hotel(hotelId)),
            ]);
            
            logger.info('Hotel deleted and caches invalidated', { hotelId });
            return true;
        }

        return false;
    } catch (error) {
        logger.error('Error deleting hotel', {
            hotelId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};

/**
 * Example 7: Batch operations with cache warming
 */
export const warmHotelCache = async (hotelIds: string[]): Promise<void> => {
    try {
        logger.info('Warming hotel cache', { count: hotelIds.length });

        const hotels = await Hotel.find({
            _id: { $in: hotelIds },
        }).lean<HotelType[]>().exec();

        // Cache each hotel
        const cachePromises = hotels.map((hotel) =>
            CacheService.set(
                CacheService.Keys.hotel(hotel._id.toString()),
                hotel,
                { ttl: 1800 }
            )
        );

        await Promise.all(cachePromises);
        
        logger.info('Hotel cache warmed', { cached: hotels.length });
    } catch (error) {
        logger.error('Error warming cache', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

/**
 * Example 8: Cache with user-specific data
 */
export const getUserHotelsCached = async (
    userId: string
): Promise<HotelType[]> => {
    const cacheKey = CacheService.Keys.userHotels(userId);

    try {
        const hotels = await CacheService.getOrSet(
            cacheKey,
            async () => {
                logger.debug('Fetching user hotels from database', { userId });
                return await Hotel.find({ userId })
                    .sort({ createdAt: -1 })
                    .lean<HotelType[]>()
                    .exec();
            },
            { ttl: 1800 } // 30 minutes
        );

        return hotels || [];
    } catch (error) {
        logger.error('Error fetching user hotels', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
};
