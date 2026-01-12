import fs from 'fs';
import path from 'path';
import prisma from '../prisma';
import { env } from '../env';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export type EntityType = 'ORDER' | 'SUPPLIER' | 'SUBSCRIPTION' | 'WITHDRAWAL' | 'WEBHOOK' | 'SYSTEM' | 'AUTH' | 'FINANCIAL' | 'PAYMENT';

export interface LogData {
    service?: string;
    action: string;
    entityType?: EntityType;
    entityId?: string;
    userId?: string;
    requestId?: string;
    message: string;
    metadata?: any;
}

const LOG_FILE_PATH = path.join(__dirname, '../../logs/app.log');

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(sanitize);
    }

    if (obj instanceof Date) return obj;

    const sanitized = { ...obj };
    const sensitiveKeys = ['password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret', 'creditCard', 'cvv', 'pixKey', 'authorization'];
    
    for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitize(sanitized[key]);
        }
    }
    return sanitized;
};

class Logger {
    private service: string;

    constructor(service: string = 'backend-core') {
        this.service = service;
    }

    private shouldLogToFileAndConsole(level: LogLevel): boolean {
        if (env.APP_ENV === 'development') return true;
        if (env.APP_ENV === 'staging') return ['INFO', 'WARN', 'ERROR', 'CRITICAL'].includes(level);
        if (env.APP_ENV === 'production') return ['WARN', 'ERROR', 'CRITICAL'].includes(level);
        return true;
    }

    private async persistLog(level: LogLevel, data: LogData) {
        // Sanitize metadata before any processing
        const sanitizedMetadata = data.metadata ? sanitize(data.metadata) : undefined;

        const entry = {
            timestamp: new Date().toISOString(),
            level,
            service: data.service || this.service,
            ...data,
            metadata: sanitizedMetadata
        };

        // File and Console Logging (Filtered by Env)
        if (this.shouldLogToFileAndConsole(level)) {
            // Console output
            const color = level === 'CRITICAL' || level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[32m';
            const reset = '\x1b[0m';
            
            console.log(`${color}[${level}]${reset} [${entry.service}] ${entry.action}: ${entry.message}`, sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : '');

            // File output
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFile(LOG_FILE_PATH, logLine, (err) => {
                if (err) console.error('Failed to write to log file', err);
            });
        }

        // Database Persistence
        // Rules:
        // 1. Always persist CRITICAL and ERROR
        // 2. Persist FINANCIAL_AUDIT (Critical business events) regardless of level
        if (level === 'CRITICAL' || level === 'ERROR' || data.service === 'FINANCIAL_AUDIT') {
             try {
                // Determine source from entityType or default to SYSTEM
                let source = 'SYSTEM';
                if (data.entityType) {
                    if (['ORDER', 'WITHDRAWAL', 'FINANCIAL', 'PAYMENT'].includes(data.entityType)) source = 'FINANCIAL';
                    else if (data.entityType === 'WEBHOOK') source = 'WEBHOOK';
                    else if (data.entityType === 'AUTH') source = 'AUTH';
                }

                await prisma.systemEventLog.create({
                    data: {
                        level,
                        source,
                        action: data.action,
                        entityId: data.entityId,
                        payload: sanitizedMetadata || {},
                    }
                });
            } catch (dbErr) {
                // Avoid infinite loop if DB fails
                console.error('Failed to persist log to DB', dbErr);
            }
        }
    }

    info(data: LogData) {
        this.persistLog('INFO', data);
    }

    warn(data: LogData) {
        this.persistLog('WARN', data);
    }

    error(data: LogData) {
        this.persistLog('ERROR', data);
    }

    critical(data: LogData) {
        this.persistLog('CRITICAL', data);
    }
}

export const logger = new Logger();
export default logger;

// --- Legacy Support ---

type FinancialEventType = 
    | 'PAYMENT_CREATED'
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_FAILED'
    | 'WITHDRAWAL_REQUESTED'
    | 'WITHDRAWAL_PAID'
    | 'WITHDRAWAL_REJECTED'
    | 'LEDGER_ENTRY_CREATED'
    | 'REFUND_PROCESSED'
    | 'BALANCE_RELEASED';

interface FinancialLogData {
    type: FinancialEventType;
    amount?: number;
    referenceId?: string; // Order ID, Withdrawal ID
    supplierId?: string;
    details?: any;
    environment?: string;
}

export const logFinancialEvent = (data: FinancialLogData) => {
    let entityType: EntityType = 'FINANCIAL';
    if (data.type.includes('PAYMENT')) entityType = 'PAYMENT';
    if (data.type.includes('WITHDRAWAL')) entityType = 'WITHDRAWAL';

    logger.info({
        service: 'FINANCIAL_AUDIT',
        action: data.type,
        entityType,
        entityId: data.referenceId || data.supplierId,
        message: `Financial Event: ${data.type}`,
        metadata: data
    });
};
