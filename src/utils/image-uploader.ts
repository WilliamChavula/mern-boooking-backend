import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

import { logger } from './logger';

// Configuration constants for production scalability
const UPLOAD_CONFIG = {
    MAX_CONCURRENT_UPLOADS: 5, // Prevent overwhelming Cloudinary API
    UPLOAD_TIMEOUT_MS: 30000, // 30 seconds per image
    MAX_IMAGE_SIZE_MB: 5, // Reject oversized images early
    BATCH_SIZE: 10, // Process in smaller batches for large sets
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
 * Uploads a single image using streaming to reduce memory usage
 * @param image - Multer file object
 * @param index - Image index for tracking
 * @returns Upload result with URL and metadata
 */
async function uploadSingleImage(
    image: Express.Multer.File,
    index: number
): Promise<UploadResult> {
    // Validate file size early to prevent wasted resources
    const sizeMB = image.buffer.length / (1024 * 1024);
    if (sizeMB > UPLOAD_CONFIG.MAX_IMAGE_SIZE_MB) {
        throw new Error(
            `Image ${image.originalname} exceeds ${UPLOAD_CONFIG.MAX_IMAGE_SIZE_MB}MB limit (${sizeMB.toFixed(2)}MB)`
        );
    }

    return new Promise((resolve, reject) => {
        // Create timeout to prevent hanging uploads
        const timeoutId = setTimeout(() => {
            reject(
                new Error(
                    `Upload timeout after ${UPLOAD_CONFIG.UPLOAD_TIMEOUT_MS}ms for ${image.originalname}`
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
                // Add max dimensions to prevent excessive processing
                eager: [{ width: 2000, height: 2000, crop: 'limit' }],
            },
            (error, result) => {
                clearTimeout(timeoutId);

                if (error) {
                    logger.error('Cloudinary upload failed', {
                        index,
                        filename: image.originalname,
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

        // Stream the buffer directly instead of converting to base64
        const readableStream = Readable.from(image.buffer);
        readableStream.pipe(uploadStream);

        // Handle stream errors
        readableStream.on('error', error => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}

/**
 * Processes a batch of images with controlled concurrency
 * @param images - Array of images to upload
 * @param startIndex - Starting index for tracking
 * @returns Array of successful uploads and failed uploads
 */
async function processBatch(
    images: Express.Multer.File[],
    startIndex: number
): Promise<{ successful: UploadResult[]; failed: UploadError[] }> {
    const successful: UploadResult[] = [];
    const failed: UploadError[] = [];

    // Process with controlled concurrency to prevent resource exhaustion
    for (
        let i = 0;
        i < images.length;
        i += UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS
    ) {
        const batch = images.slice(i, i + UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS);

        const results = await Promise.allSettled(
            batch.map((image, batchIndex) =>
                uploadSingleImage(image, startIndex + i + batchIndex)
            )
        );

        results.forEach((result, batchIndex) => {
            const globalIndex = startIndex + i + batchIndex;
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

    return { successful, failed };
}

/**
 * Uploads multiple images to Cloudinary with robust error handling and performance optimizations.
 * Features:
 * - Controlled concurrency prevents API rate limiting
 * - Partial success handling (doesn't fail entire batch)
 * - Timeout protection per image
 * - Size validation before upload
 * - Batch processing for large image sets
 *
 * @param imageFiles - Array of multer file objects
 * @param options - Upload configuration options
 * @returns Object containing successful URLs and any failures
 * @throws Error only if all uploads fail or critical error occurs
 */
export async function uploadImages(
    imageFiles: Express.Multer.File[],
    options: {
        throwOnPartialFailure?: boolean;
    } = {}
): Promise<{
    urls: string[];
    failures?: UploadError[];
    successCount: number;
    failureCount: number;
}> {
    // Validate input
    if (!imageFiles || imageFiles.length === 0) {
        logger.warn('No images provided for upload');
        return { urls: [], successCount: 0, failureCount: 0 };
    }

    const totalImages = imageFiles.length;
    logger.info('Starting image upload batch', {
        totalImages,
        maxConcurrent: UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS,
        batchSize: UPLOAD_CONFIG.BATCH_SIZE,
    });

    const startTime = Date.now();
    const allSuccessful: UploadResult[] = [];
    const allFailed: UploadError[] = [];

    try {
        // Process in batches to handle very large image sets
        for (let i = 0; i < imageFiles.length; i += UPLOAD_CONFIG.BATCH_SIZE) {
            const batch = imageFiles.slice(
                i,
                Math.min(i + UPLOAD_CONFIG.BATCH_SIZE, imageFiles.length)
            );

            logger.debug('Processing batch', {
                batchStart: i,
                batchSize: batch.length,
            });

            const { successful, failed } = await processBatch(batch, i);

            allSuccessful.push(...successful);
            allFailed.push(...failed);
        }

        const duration = Date.now() - startTime;

        // Sort by original index to maintain order
        allSuccessful.sort((a, b) => a.index - b.index);

        logger.info('Image upload batch completed', {
            totalImages,
            successCount: allSuccessful.length,
            failureCount: allFailed.length,
            durationMs: duration,
            avgTimePerImage:
                allSuccessful.length > 0
                    ? Math.round(duration / allSuccessful.length)
                    : 0,
        });

        // Log failures for debugging
        if (allFailed.length > 0) {
            logger.warn('Some images failed to upload', {
                failures: allFailed,
            });

            if (options.throwOnPartialFailure) {
                throw new Error(
                    `Failed to upload ${allFailed.length} of ${totalImages} images`
                );
            }
        }

        return {
            urls: allSuccessful.map(r => r.url),
            failures: allFailed.length > 0 ? allFailed : undefined,
            successCount: allSuccessful.length,
            failureCount: allFailed.length,
        };
    } catch (error) {
        logger.error('Critical error during image upload', {
            error: error instanceof Error ? error.message : 'Unknown error',
            totalImages,
            successCount: allSuccessful.length,
            failureCount: allFailed.length,
        });
        throw new Error('Failed to upload images to Cloudinary');
    }
}
