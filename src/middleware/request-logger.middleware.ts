import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const correlationId =
        (req.headers['x-correlation-id'] as string) || randomUUID();
    req.correlationId = correlationId;

    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
            correlationId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
        };

        if (res.statusCode >= 400) {
            logger.error('HTTP Request Error', logData);
        } else {
            logger.info('HTTP Request', logData);
        }
    });

    res.setHeader('X-Correlation-ID', correlationId);
    next();
};
