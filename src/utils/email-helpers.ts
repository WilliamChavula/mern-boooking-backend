import {
    queueService,
    QUEUE_NAMES,
    EmailJobData,
} from '../services/queue.service';
import type { BookingConfirmationEmailData } from '../services/email.service';
import { logger } from '../utils/logger';

/**
 * Queue a booking confirmation email
 */
export async function queueBookingConfirmationEmail(
    bookingData: BookingConfirmationEmailData,
    options?: {
        correlationId?: string;
        delay?: number;
        priority?: number;
    }
): Promise<void> {
    try {
        const emailJobData: EmailJobData = {
            to: bookingData.to,
            subject: `Booking Confirmation - ${bookingData.hotelName}`,
            template: 'booking-confirmation',
            data: bookingData,
            correlationId: options?.correlationId,
        };

        await queueService.addJob(QUEUE_NAMES.EMAIL, emailJobData, {
            delay: options?.delay,
            priority: options?.priority || 5, // Higher priority for booking confirmations
        });

        logger.info('Booking confirmation email queued', {
            to: bookingData.to,
            bookingId: bookingData.bookingId,
            correlationId: options?.correlationId,
        });
    } catch (error) {
        logger.error('Failed to queue booking confirmation email', {
            to: bookingData.to,
            bookingId: bookingData.bookingId,
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId: options?.correlationId,
        });
        // Don't throw - we don't want email failures to break the booking flow
    }
}

/**
 * Queue a generic email
 */
export async function queueEmail(
    emailData: EmailJobData,
    options?: {
        delay?: number;
        priority?: number;
    }
): Promise<void> {
    try {
        await queueService.addJob(QUEUE_NAMES.EMAIL, emailData, {
            delay: options?.delay,
            priority: options?.priority || 1, // Default lower priority
        });

        logger.info('Email queued', {
            to: emailData.to,
            template: emailData.template,
            correlationId: emailData.correlationId,
        });
    } catch (error) {
        logger.error('Failed to queue email', {
            to: emailData.to,
            template: emailData.template,
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId: emailData.correlationId,
        });
    }
}
