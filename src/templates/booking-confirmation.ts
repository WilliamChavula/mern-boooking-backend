export const bookingConfirmationTemplate = (
    firstName,
    lastName,
    bookingId,
    hotelName,
    checkInFormatted,
    checkOutFormatted,
    nights,
    guests,
    totalCost
) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Booking Confirmed!</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #333333;">
                                Dear ${firstName} ${lastName},
                            </p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 24px; color: #333333;">
                                Thank you for your booking! We're excited to confirm your reservation.
                            </p>
                            
                            <!-- Booking Details Box -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 30px;">
                                        <h2 style="margin: 0 0 20px 0; color: #667eea; font-size: 20px;">Booking Details</h2>
                                        
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666; width: 40%;">Booking ID:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: bold;">${bookingId}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">Hotel:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: bold;">${hotelName}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">Check-in:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">${checkInFormatted}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">Check-out:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">${checkOutFormatted}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">Duration:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">${nights} Night${nights > 1 ? 's' : ''}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #666666;">Guests:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #333333;">${guests}</td>
                                            </tr>
                                            <tr style="border-top: 2px solid #dee2e6;">
                                                <td style="padding: 16px 0 8px 0; font-size: 16px; color: #666666; font-weight: bold;">Total Cost:</td>
                                                <td style="padding: 16px 0 8px 0; font-size: 18px; color: #667eea; font-weight: bold;">$${totalCost.toFixed(2)}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #666666;">
                                Please keep this email for your records. If you have any questions or need to make changes to your booking, please contact us.
                            </p>
                            
                            <p style="margin: 0; font-size: 14px; line-height: 22px; color: #666666;">
                                We look forward to welcoming you!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #dee2e6;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #999999;">
                                This is an automated message, please do not reply to this email.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © ${new Date().getFullYear()} Hotel Booking App. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `;
};
