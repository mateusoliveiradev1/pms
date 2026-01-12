import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

export const getSystemHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Webhooks Stats (Incoming)
        const webhooksProcessed = await prisma.processedWebhookEvent.count({
            where: { processedAt: { gte: today } }
        });
        
        // Webhooks failures (Incoming/Outgoing)
        // Using SystemEventLog as the source of truth for failures as requested
        const webhookFailures = await prisma.systemEventLog.count({
            where: { 
                source: 'WEBHOOK', 
                level: { in: ['ERROR', 'CRITICAL'] },
                createdAt: { gte: today }
            }
        });

        // 2. Payments Stats
        const paymentsConfirmed = await prisma.order.count({
            where: { 
                paymentStatus: 'PAID',
                paidAt: { gte: today }
            }
        });

        const paymentsRejected = await prisma.order.count({
             where: {
                paymentStatus: 'FAILED',
                updatedAt: { gte: today }
             }
        });

        // 3. Withdrawals Pending
        const withdrawalsPending = await prisma.withdrawalRequest.count({
            where: { status: 'PENDING' }
        });

        // 4. Anomalies (Orphaned Ledgers)
        const orphanedLedgers: any[] = await prisma.$queryRaw`
            SELECT count(*)::int as count
            FROM "Order" o
            LEFT JOIN "FinancialLedger" fl ON o.id = fl."referenceId" AND fl.type = 'ORDER_PAYMENT'
            WHERE o."paymentStatus" = 'PAID' AND fl.id IS NULL
        `;
        const anomalies = orphanedLedgers[0]?.count || 0;

        // 5. Last CRITICAL Error
        const lastCritical = await prisma.systemEventLog.findFirst({
            where: { level: 'CRITICAL' },
            orderBy: { createdAt: 'desc' }
        });

        // 6. System Status
        // Simple heuristic: If critical error today OR anomalies > 0 => ATTENTION
        const hasCriticalToday = lastCritical && new Date(lastCritical.createdAt) >= today;
        const status = (hasCriticalToday || anomalies > 0 || webhookFailures > 10) ? 'ATTENTION' : 'OK';

        res.json({
            status,
            metrics: {
                webhooks: {
                    processed: webhooksProcessed,
                    failed: webhookFailures
                },
                payments: {
                    confirmed: paymentsConfirmed,
                    rejected: paymentsRejected
                },
                withdrawals: {
                    pending: withdrawalsPending
                },
                anomalies
            },
            lastCritical
        });

    } catch (error) {
        next(error);
    }
};
