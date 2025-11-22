import { queueService, QUEUE_NAMES, ImageUploadJobData } from '../services/queue.service';
import { logger } from '../utils/logger';

/**
 * Queue images for background upload
 * @param imageFiles - Multer file objects
 * @param hotelId - Hotel ID to update
 * @param userId - User ID
 * @param mergeWithExisting - Whether to merge with existing images
 * @param correlationId - Request correlation ID for tracking
 * @returns Job ID for tracking
 */
export async function queueImageUpload(
    imageFiles: Express.Multer.File[],
    hotelId: string,
    userId: string,
    mergeWithExisting: boolean = true,
    correlationId?: string
): Promise<string> {
    if (!imageFiles || imageFiles.length === 0) {
        logger.warn('No images provided for upload queue');
        throw new Error('No images provided');
    }

    // Convert buffers to base64 for serialization
    const images = imageFiles.map((file) => ({
        buffer: file.buffer.toString('base64'),
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
    }));

    const jobData: ImageUploadJobData = {
        images,
        hotelId,
        userId,
        mergeWithExisting,
        correlationId,
    };

    const job = await queueService.addJob(QUEUE_NAMES.IMAGE_UPLOAD, jobData, {
        priority: 1, // High priority for user uploads
    });

    logger.info('Image upload job queued', {
        jobId: job.id,
        hotelId,
        userId,
        imageCount: images.length,
        correlationId,
    });

    return job.id!;
}

/**
 * Get job status from queue
 * @param jobId - Job ID
 * @returns Job state and progress
 */
export async function getImageUploadJobStatus(jobId: string) {
    const queue = queueService.getQueue(QUEUE_NAMES.IMAGE_UPLOAD);
    if (!queue) {
        throw new Error('Image upload queue not found');
    }

    const job = await queue.getJob(jobId);
    if (!job) {
        return null;
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnvalue = job.returnvalue;

    return {
        jobId,
        state,
        progress,
        result: returnvalue,
    };
}
