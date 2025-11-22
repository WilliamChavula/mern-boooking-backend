import express from 'express';
import multer from 'multer';

import type { Request, Response, Router } from 'express';

import {
    createHotel,
    findHotelForUpdate,
    getMyHotel,
    getMyHotels,
} from '../services/my-hotels.service';
import { verifyToken } from '../middleware/auth.middleware';

import {
    CreateHotelPayload,
    createHotelSchema,
    CreateHotelSchemaResponse,
    GetHotelResponse,
    hotelParams,
    HotelParams,
    HotelsResponse,
} from '../schemas/my-hotel.schema';
import { ZodError } from 'zod';
import { parseZodError } from '../utils/parse-zod-error';
import { logger } from '../utils/logger';
import { queueImageUpload } from '../utils/queue-helpers';

const router: Router = express.Router();

const multerUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

router.post(
    '/',
    verifyToken,
    multerUpload.array('imageFiles', 6),
    async (
        req: Request<{}, {}, CreateHotelPayload>,
        res: Response<CreateHotelSchemaResponse>
    ) => {
        try {
            const imageFiles = req.files as Express.Multer.File[];
            const newHotel = await createHotelSchema.parseAsync(req.body);
            const userId = req.user.userId;
            const correlationId = (req as any).correlationId;

            // Create hotel with empty image URLs first
            newHotel.imageUrls = [];
            newHotel.userId = userId;

            const hotel = await createHotel(newHotel);

            // Queue image upload in background
            let jobId: string | undefined;
            if (imageFiles && imageFiles.length > 0) {
                jobId = await queueImageUpload(
                    imageFiles,
                    hotel._id,
                    userId,
                    false, // don't merge, replace
                    correlationId
                );
            }

            logger.info('Hotel created successfully', {
                hotelId: hotel._id,
                userId,
                imageJobId: jobId,
            });
            
            res.status(201).json({
                success: true,
                message: jobId
                    ? 'Hotel created successfully. Images are being processed in the background.'
                    : 'Hotel created successfully',
                data: hotel as any,
            });

            return;
        } catch (e) {
            if (e instanceof ZodError) {
                const issues = parseZodError(e);

                logger.error('Failed to create hotel', {
                    error: issues,
                    userId: req.user.userId,
                });

                res.status(400).json({
                    success: false,
                    message: 'Failed to create a hotel.',
                    error: issues,
                });
            }
            logger.error('Error creating hotel', {
                error: (e as Error).message,
                userId: req.user.userId,
            });
            res.status(500).send({
                success: false,
                message: 'Something went wrong',
            });
        }
    }
);

router.get(
    '/',
    verifyToken,
    async (req: Request, res: Response<HotelsResponse>) => {
        try {
            const hotels = await getMyHotels(req.user.userId);
            res.status(200).json({
                success: true,
                message: 'Fetched hotels successfully',
                data: hotels,
            });
            return;
        } catch (e) {
            res.status(500).json({
                success: false,
                message: 'Error fetching Hotels',
                data: [],
            });
        }
    }
);

router.get(
    '/:hotelId',
    verifyToken,
    async (req: Request<HotelParams>, res: Response<GetHotelResponse>) => {
        try {
            const { hotelId } = await hotelParams.parseAsync(req.params);
            const userId = req.user.userId;

            const hotel = await getMyHotel(hotelId, userId);

            if (!hotel) {
                logger.warn('Hotel not found', { hotelId, userId });
                res.status(404).json({
                    success: false,
                    message: 'No Hotel found with id: ' + hotelId,
                });
                return;
            }

            logger.info('Fetched hotel successfully', { hotelId, userId });
            res.status(200).json({
                success: true,
                message: 'Fetch hotel Successful',
                data: hotel,
            });
        } catch (e) {
            logger.error('Error fetching hotel', {
                error: (e as Error).message,
                userId: req.user.userId,
            });
            res.status(500).json({
                success: false,
                message: 'Something went wrong',
            });
        }
    }
);

router.put(
    '/:hotelId',
    verifyToken,
    multerUpload.array('imageFiles'),
    async (
        req: Request<HotelParams, {}, CreateHotelPayload>,
        res: Response<CreateHotelSchemaResponse>
    ) => {
        try {
            const { hotelId } = await hotelParams.parseAsync(req.params);
            const userId = req.user.userId;
            const correlationId = (req as any).correlationId;

            const validHotel = await createHotelSchema.parseAsync(req.body);

            // Find the hotel document for update
            const hotelDoc = await findHotelForUpdate(hotelId, userId);

            if (!hotelDoc) {
                logger.warn('Hotel to update not found', { hotelId, userId });
                res.status(404).send({
                    success: false,
                    message: 'Hotel not found',
                });
                return;
            }

            // Update hotel fields first (excluding images)
            Object.assign(hotelDoc, validHotel);
            await hotelDoc.save();

            // Queue image upload in background if there are new images
            const imageFiles = req.files as Express.Multer.File[];
            let jobId: string | undefined;
            
            if (imageFiles && imageFiles.length > 0) {
                jobId = await queueImageUpload(
                    imageFiles,
                    hotelId,
                    userId,
                    true, // merge with existing
                    correlationId
                );
            }

            logger.info('Hotel updated successfully', { hotelId, userId, imageJobId: jobId });
            res.status(200).json({
                success: true,
                message: jobId 
                    ? 'Hotel updated successfully. Images are being processed in the background.'
                    : 'Hotel updated successfully',
                data: hotelDoc.toObject() as any,
            });
        } catch (e) {
            if (e instanceof ZodError) {
                const issues = parseZodError(e);

                logger.error('Failed to update hotel', {
                    error: issues,
                    userId: req.user.userId,
                });

                res.status(400).json({
                    success: false,
                    message: 'Failed to create a hotel.',
                    error: issues,
                });
            }
            logger.error('Error updating hotel', {
                error: (e as Error).message,
                userId: req.user.userId,
            });
            res.status(500).send({
                success: false,
                message: 'Something went wrong',
            });
        }
    }
);

export default router;
