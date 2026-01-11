import { logFinancialEvent } from '../src/lib/logger';
import fs from 'fs';
import path from 'path';

// Script to verify that the logger actually writes to the file
const LOG_FILE_PATH = path.join(__dirname, '../logs/financial_audit.log');

const verifyLogger = async () => {
    console.log('Starting Logger Verification...');
    console.log(`Log File Path: ${LOG_FILE_PATH}`);

    // 1. Ensure clean slate (optional, or just append)
    // const exists = fs.existsSync(LOG_FILE_PATH);
    // if (exists) {
    //     console.log('Log file exists. Size:', fs.statSync(LOG_FILE_PATH).size);
    // }

    // 2. Trigger Event
    const testEvent = {
        type: 'PAYMENT_CREATED' as const,
        amount: 123.45,
        referenceId: 'TEST-REF-001',
        supplierId: 'TEST-SUPPLIER',
        details: { test: true, timestamp: Date.now() }
    };

    console.log('Triggering logFinancialEvent...');
    logFinancialEvent(testEvent);

    // 3. Wait a moment for FS I/O
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Verify Content
    if (!fs.existsSync(LOG_FILE_PATH)) {
        console.error('FAILED: Log file was not created.');
        process.exit(1);
    }

    const content = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
    const lines = content.trim().split('\n');
    const lastLine = lines[lines.length - 1];

    try {
        const json = JSON.parse(lastLine);
        console.log('Last Log Entry:', json);
        
        if (json.type === testEvent.type && json.referenceId === testEvent.referenceId) {
            console.log('SUCCESS: Log entry verified on disk.');
        } else {
            console.error('FAILED: Last log entry does not match test event.');
            console.error('Expected:', testEvent);
            console.error('Actual:', json);
            process.exit(1);
        }
    } catch (e) {
        console.error('FAILED: Could not parse last log line as JSON.', e);
        console.log('Last Line Content:', lastLine);
        process.exit(1);
    }
};

verifyLogger();
