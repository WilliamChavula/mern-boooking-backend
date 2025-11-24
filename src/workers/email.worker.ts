import { Job } from 'bullmq';
import { logger } from '../utils/logger';
import {
    queueService,
    QUEUE_NAMES,
    EmailJobData,
} from '../services/queue.service';
import {
    emailService,
    BookingConfirmationEmailData,
    EmailResult,
} from '../services/email.service';

/**
 * Process email job
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<EmailResult> {
    const { to, subject, template, data, correlationId } = job.data;

    logger.info('Processing email job', {
        jobId: job.id,
        to,
        subject,
        template,
        correlationId,
    });

    const startTime = Date.now();

    try {
        let result: EmailResult;

        // Route to appropriate email handler based on template
        switch (template) {
            case 'booking-confirmation':
                result = await emailService.sendBookingConfirmation(
                    data as BookingConfirmationEmailData
                );
                break;

            // Add more email templates here as needed
            // case 'password-reset':
            //     result = await emailService.sendPasswordReset(data);
            //     break;
            // case 'welcome':
            //     result = await emailService.sendWelcomeEmail(data);
            //     break;

            default:
                throw new Error(`Unknown email template: ${template}`);
        }

        const duration = Date.now() - startTime;

        if (result.success) {
            logger.info('Email job completed successfully', {
                jobId: job.id,
                to,
                template,
                messageId: result.messageId,
                durationMs: duration,
                correlationId,
            });
        } else {
            logger.warn('Email job completed with errors', {
                jobId: job.id,
                to,
                template,
                error: result.error,
                durationMs: duration,
                correlationId,
            });
        }

        await job.updateProgress(100);
        return result;
    } catch (error) {
        logger.error('Email job failed', {
            jobId: job.id,
            to,
            template,
            error: error instanceof Error ? error.message : 'Unknown error',
            correlationId,
        });
        throw error;
    }
}

/**
 * Initialize email worker
 */
export function initializeEmailWorker(): void {
    queueService.registerWorker<EmailJobData, EmailResult>(
        QUEUE_NAMES.EMAIL,
        processEmailJob,
        {
            concurrency: 5, // Process 5 email jobs concurrently
            limiter: {
                max: 50, // Max 50 emails
                duration: 60000, // per minute (adjust based on your SMTP provider limits)
            },
        }
    );

    logger.info('Email worker initialized');
}
