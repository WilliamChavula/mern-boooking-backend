import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { bookingConfirmationTemplate } from '../templates/booking-confirmation';

export interface BookingConfirmationEmailData {
    to: string;
    firstName: string;
    lastName: string;
    hotelName: string;
    checkIn: Date;
    checkOut: Date;
    adultCount: number;
    childCount: number;
    totalCost: number;
    bookingId: string;
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

class EmailService {
    private transporter: Transporter | null = null;
    private isInitialized = false;

    /**
     * Initialize email service with SMTP configuration
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            logger.info('Email service already initialized');
            return;
        }

        try {
            // Configure SMTP transporter
            this.transporter = nodemailer.createTransport({
                host: config.SMTP_HOST,
                port: config.SMTP_PORT,
                secure: config.SMTP_SECURE,
                auth: {
                    user: config.SMTP_USER,
                    pass: config.SMTP_PASS,
                },
            });

            // Verify connection configuration
            await this.transporter.verify();

            this.isInitialized = true;
            logger.info('Email service initialized successfully', {
                host: config.SMTP_HOST,
                port: config.SMTP_PORT,
                user: config.SMTP_USER,
            });
        } catch (error) {
            logger.error('Failed to initialize email service', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }

    /**
     * Send booking confirmation email
     */
    async sendBookingConfirmation(
        data: BookingConfirmationEmailData
    ): Promise<EmailResult> {
        if (!this.isInitialized || !this.transporter) {
            const error = 'Email service not initialized';
            logger.error(error);
            return { success: false, error };
        }

        try {
            const {
                to,
                firstName,
                lastName,
                hotelName,
                checkIn,
                checkOut,
                adultCount,
                childCount,
                totalCost,
                bookingId,
            } = data;

            logger.info('Preparing booking confirmation email', {
                to,
                bookingId,
                checkIn,
                checkOut,
            });

            // Calculate number of nights
            const nights = Math.ceil(
                (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
                    (1000 * 60 * 60 * 24)
            );

            // Format dates
            const checkInFormatted = new Date(checkIn).toLocaleDateString(
                'en-US',
                {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }
            );
            const checkOutFormatted = new Date(checkOut).toLocaleDateString(
                'en-US',
                {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }
            );

            const guests = `${adultCount} Adult${adultCount > 1 ? 's' : ''}${
                childCount > 0
                    ? `, ${childCount} Child${childCount > 1 ? 'ren' : ''}`
                    : ''
            }`;

            // Email HTML template
            const htmlContent = bookingConfirmationTemplate(
                firstName,
                lastName,
                bookingId,
                hotelName,
                checkInFormatted,
                checkOutFormatted,
                nights,
                guests,
                totalCost
            );

            const mailOptions = {
                from: `"Hotel Booking App" <${config.SMTP_FROM}>`,
                to,
                subject: `Booking Confirmation - ${hotelName}`,
                html: htmlContent,
            };

            const info = await this.transporter.sendMail(mailOptions);

            logger.info('Booking confirmation email sent', {
                to,
                messageId: info.messageId,
                bookingId,
            });

            return {
                success: true,
                messageId: info.messageId,
            };
        } catch (error) {
            logger.error('Failed to send booking confirmation email', {
                to: data.to,
                bookingId: data.bookingId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        if (this.transporter) {
            this.transporter.close();
            this.isInitialized = false;
            logger.info('Email service shut down');
        }
    }
}

export const emailService = new EmailService();
