import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // 1. Structure the error
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    
    // 2. Log Critical/Error
    const logData = {
        service: 'api-gateway',
        action: 'UNHANDLED_ERROR',
        entityType: 'SYSTEM' as any,
        message,
        metadata: {
            method: req.method,
            url: req.url,
            // Body is already sanitized by logger.ts if passed in metadata, 
            // but we can be extra safe or just pass raw and let logger handle it.
            // Since we moved sanitize to logger.ts, we can pass raw here.
            body: req.body, 
            query: req.query,
            params: req.params,
            stack: err.stack,
            statusCode,
            originalError: err
        },
        userId: (req as any).user?.id
    };

    if (statusCode >= 500) {
        logger.critical(logData);
    } else {
        // 4xx errors are usually warnings or errors depending on context, but let's log as ERROR if it's an exception caught here
        logger.error(logData);
    }

    // 3. Response to Client (Generic)
    // "Nunca vazar stack trace para o client"
    // "Retornar erro genérico para o app" if 500
    const clientMessage = statusCode >= 500 ? 'Internal Server Error' : message;

    res.status(statusCode).json({
        status: 'error',
        message: clientMessage
    });
};
