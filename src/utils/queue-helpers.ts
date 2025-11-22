import {
    queueService,
    QUEUE_NAMES,
    ImageUploadJobData,
} from '../services/queue.service';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Temporary upload directory
const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'temp');

// Track if temp directory has been created to avoid redundant checks
let tempDirCreated = false;

/**
 * Ensure temp upload directory exists (only creates once)
 */
async function ensureTempDir(): Promise<void> {
    if (tempDirCreated) {
        return;
    }

    try {
        await fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true });
        tempDirCreated = true;
        logger.debug('Temp upload directory created', {
            path: TEMP_UPLOAD_DIR,
        });
    } catch (error) {
        logger.error('Failed to create temp upload directory', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
}

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

    await ensureTempDir();

    // Save files temporarily to disk instead of base64 encoding
    const tempFiles = await Promise.all(
        imageFiles.map(async file => {
            const uniqueFilename = `${randomUUID()}-${file.originalname}`;
            const tempPath = path.join(TEMP_UPLOAD_DIR, uniqueFilename);

            await fs.writeFile(tempPath, file.buffer);

            logger.debug('Saved temp file', {
                originalname: file.originalname,
                tempPath,
                size: file.size,
            });

            return {
                tempPath,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
            };
        })
    );

    const jobData: ImageUploadJobData = {
        tempFiles,
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
        imageCount: tempFiles.length,
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
