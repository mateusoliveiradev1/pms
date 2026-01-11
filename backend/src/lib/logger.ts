import fs from 'fs';
import path from 'path';

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

// Simple file logger for audit trail
// In production, this should go to Datadog/CloudWatch/Splunk
const LOG_FILE_PATH = path.join(__dirname, '../../logs/financial_audit.log');

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

export const logFinancialEvent = (data: FinancialLogData) => {
    const entry = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        ...data
    };

    const logLine = JSON.stringify(entry) + '\n';

    // Console log for dev visibility
    console.log(`[FINANCIAL_AUDIT] ${data.type}:`, data.details || '');

    // Append to file
    fs.appendFile(LOG_FILE_PATH, logLine, (err) => {
        if (err) console.error('Failed to write to financial audit log', err);
    });
};
