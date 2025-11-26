import { Job } from 'bullmq';
import { v2 as cloudinary } from 'cloudinary';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import { logger } from '../utils/logger';
import {
    queueService,
    QUEUE_NAMES,
    ImageUploadJobData,
    ImageUploadResult,
} from '../services/queue.service';
import Hotel from '../models/hotel.model';
import { CacheService } from '../services/cache.service';

// Configuration constants
const UPLOAD_CONFIG = {
    MAX_CONCURRENT_UPLOADS: 5,
    UPLOAD_TIMEOUT_MS: 30000,
    MAX_IMAGE_SIZE_MB: 5,
} as const;

interface UploadResult {
    url: string;
    publicId: string;
    index: number;
}

interface UploadError {
    index: number;
    filename: string;
    error: string;
}

/**
 * Upload a single image to Cloudinary from temporary file
 */
async function uploadSingleImage(
    imageData: { tempPath: string; originalname: string; size: number },
    index: number
): Promise<UploadResult> {
    // Validate file size
    const sizeMB = imageData.size / (1024 * 1024);
    if (sizeMB > UPLOAD_CONFIG.MAX_IMAGE_SIZE_MB) {
        throw new Error(
            `Image ${imageData.originalname} exceeds ${UPLOAD_CONFIG.MAX_IMAGE_SIZE_MB}MB limit (${sizeMB.toFixed(2)}MB)`
        );
    }

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(
                new Error(
                    `Upload timeout after ${UPLOAD_CONFIG.UPLOAD_TIMEOUT_MS}ms for ${imageData.originalname}`
                )
            );
        }, UPLOAD_CONFIG.UPLOAD_TIMEOUT_MS);

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'hotels',
                resource_type: 'auto',
                transformation: [
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
                eager: [{ width: 2000, height: 2000, crop: 'limit' }],
            },
            (error, result) => {
                clearTimeout(timeoutId);

                if (error) {
                    logger.error('Cloudinary upload failed', {
                        index,
                        filename: imageData.originalname,
                        error: error.message,
                    });
                    reject(error);
                } else if (result) {
                    logger.debug('Image uploaded successfully', {
                        index,
                        url: result.secure_url,
                        publicId: result.public_id,
                        bytes: result.bytes,
                    });
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        index,
                    });
                } else {
                    reject(new Error('Upload failed: no result returned'));
                }
            }
        );

        // Stream file directly from disk - no base64 conversion!
        const fileStream = createReadStream(imageData.tempPath);
        fileStream.pipe(uploadStream);

        fileStream.on('error', error => {
            clearTimeout(timeoutId);
            logger.error('File read stream error', {
                tempPath: imageData.tempPath,
                error: error.message,
            });
            reject(error);
        });
    });
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles(
    tempFiles: Array<{ tempPath: string; originalname: string }>
): Promise<void> {
    const deletePromises = tempFiles.map(async file => {
        try {
            await fs.unlink(file.tempPath);
            logger.debug('Deleted temp file', { tempPath: file.tempPath });
        } catch (error) {
            logger.warn('Failed to delete temp file', {
                tempPath: file.tempPath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    await Promise.allSettled(deletePromises);
}

/**
 * Process image upload job
 */
async function processImageUpload(
    job: Job<ImageUploadJobData>
): Promise<ImageUploadResult> {
    const { tempFiles, hotelId, userId, mergeWithExisting, correlationId } =
        job.data;

    logger.info('Processing image upload job', {
        jobId: job.id,
        hotelId,
        userId,
        imageCount: tempFiles.length,
        correlationId,
    });

    const startTime = Date.now();
    const successful: UploadResult[] = [];
    const failed: UploadError[] = [];

    try {
        // Upload images with controlled concurrency
        for (
            let i = 0;
            i < tempFiles.length;
            i += UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS
        ) {
            const batch = tempFiles.slice(
                i,
                i + UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS
            );

            // Update job progress
            await job.updateProgress(Math.floor((i / tempFiles.length) * 100));

            const results = await Promise.allSettled(
                batch.map((image, batchIndex) =>
                    uploadSingleImage(image, i + batchIndex)
                )
            );

            results.forEach((result, batchIndex) => {
                const globalIndex = i + batchIndex;
                if (result.status === 'fulfilled') {
                    successful.push(result.value);
                } else {
                    failed.push({
                        index: globalIndex,
                        filename: batch[batchIndex].originalname,
                        error: result.reason.message,
                    });
                }
            });
        }

        // Sort by original index
        successful.sort((a, b) => a.index - b.index);
        const uploadedUrls = successful.map(r => r.url);

        // Update hotel with new image URLs
        const hotel = await Hotel.findOne({ _id: hotelId, userId }).exec();

        if (!hotel) {
            throw new Error('Hotel not found or not owned by user');
        }

        if (mergeWithExisting) {
            hotel.imageUrls = [...uploadedUrls, ...(hotel.imageUrls || [])];
        } else {
            hotel.imageUrls = uploadedUrls;
        }

        await hotel.save();
        await CacheService.invalidate(CacheService.Keys.hotel(hotelId));

        const duration = Date.now() - startTime;

        logger.info('Image upload job completed', {
            jobId: job.id,
            hotelId,
            successCount: successful.length,
            failureCount: failed.length,
            durationMs: duration,
            correlationId,
        });

        await job.updateProgress(100);

        return {
            urls: uploadedUrls,
            successCount: successful.length,
            failureCount: failed.length,
            failures: failed.length > 0 ? failed : undefined,
        };
    } catch (error) {
        logger.error('Image upload job failed', {
            jobId: job.id,
            hotelId,
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId,
        });
        throw error;
    } finally {
        // Always clean up temporary files, even on failure
        await cleanupTempFiles(tempFiles);
        logger.info('Cleaned up temporary files', {
            jobId: job.id,
            fileCount: tempFiles.length,
        });
    }
}

/**
 * Initialize image upload worker
 */
export function initializeImageUploadWorker(): void {
    queueService.registerWorker<ImageUploadJobData, ImageUploadResult>(
        QUEUE_NAMES.IMAGE_UPLOAD,
        processImageUpload,
        {
            concurrency: 2, // Process 2 upload jobs concurrently
            limiter: {
                max: 10, // Max 10 jobs
                duration: 60000, // per minute
            },
        }
    );

    logger.info('Image upload worker initialized');
}
