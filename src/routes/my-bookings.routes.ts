import express from 'express';
import { Request, Response, Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import { findBookingsByUserId } from '../services/hotels.service';
import { HotelSchema, UserBookingResponse } from '../schemas/hotel.schema';
import { logger } from '../utils/logger';

const router: Router = express.Router();

router.get(
    '/',
    verifyToken,
    async (req: Request, res: Response<UserBookingResponse>) => {
        try {
            const { userId } = req.user;

            logger.info('Fetching bookings for user', { userId });

            const bookings: HotelSchema[] = await findBookingsByUserId(userId);

            logger.info('Bookings fetched successfully', {
                userId,
                bookingCount: bookings.length,
            });

            res.status(200).json({
                success: true,
                message: 'User bookings fetched successfully',
                data: bookings,
            });
        } catch (e) {
            logger.error('Error fetching user bookings', {
                error: (e as Error).message,
            });
            res.status(500).send({
                success: false,
                message: 'Something went wrong',
            });
        }
    }
);

export default router;
