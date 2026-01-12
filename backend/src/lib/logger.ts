import fs from 'fs';
import path from 'path';
import prisma from '../prisma';

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

        // Console output (pretty for dev)
        const color = level === 'CRITICAL' || level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[32m';
        const reset = '\x1b[0m';
        
        // Don't console log everything if not needed, but for now we keep it
        // User said: "Não substituir console.log em tudo agora... Apenas: Financeiro, Pagamentos, Webhooks, Admin actions"
        // Since we are calling this logger explicitly, we should log to console.
        console.log(`${color}[${level}]${reset} [${entry.service}] ${entry.action}: ${entry.message}`, sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : '');

        // File output
        const logLine = JSON.stringify(entry) + '\n';
        fs.appendFile(LOG_FILE_PATH, logLine, (err) => {
            if (err) console.error('Failed to write to log file', err);
        });

        // Database Persistence for Critical/Error or specific sources
        // We also want to persist FINANCIAL events (from legacy logFinancialEvent) if they are important, 
        // but user only specified "Logs críticos sempre persistidos" and "SystemEventLog".
        // The prompt says "Captura de exceções... Logar erro estruturado... Persistir em SystemEventLog".
        // It also says "Alertas Administrativos... Registrar em SystemEventLog".
        
        if (level === 'CRITICAL' || level === 'ERROR' || data.service === 'FINANCIAL_AUDIT') {
             try {
                // Determine source from entityType or default to SYSTEM
                let source = 'SYSTEM';
                if (data.entityType) {
                    if (['ORDER', 'WITHDRAWAL', 'FINANCIAL', 'PAYMENT'].includes(data.entityType)) source = 'FINANCIAL'; // Or PAYMENT
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
    // Map legacy financial events to new logger
    // We treat them as INFO level, but force persistence via 'FINANCIAL_AUDIT' service name hack in persistLog logic above
    // OR we just use INFO and rely on the fact that critical ones should be CRITICAL?
    // Financial events are "Auditar falhas críticas" and "Monitorar saúde".
    // The user said "Auditar falhas críticas".
    // "Tabela de Eventos do Sistema... Inserção apenas via backend".
    // Let's treat these as important events. 
    
    // We map to entityType FINANCIAL or PAYMENT based on type
    let entityType: EntityType = 'FINANCIAL';
    if (data.type.includes('PAYMENT')) entityType = 'PAYMENT';
    if (data.type.includes('WITHDRAWAL')) entityType = 'WITHDRAWAL';

    logger.info({
        service: 'FINANCIAL_AUDIT', // This triggers DB persistence in my logic above
        action: data.type,
        entityType,
        entityId: data.referenceId || data.supplierId,
        message: `Financial Event: ${data.type}`,
        metadata: data
    });
};
