import { Request, Response } from 'express';
import prisma from '../prisma';
import { ExportService } from '../services/exportService';
import { notificationService } from '../services/notificationService';
import { InternalWebhookService } from '../services/internalWebhookService';

// Health & Metrics
export const getFinancialHealth = async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const processedEvents = await prisma.processedWebhookEvent.count({
    where: { processedAt: { gte: today } }
  });

  const failedWebhooks = await prisma.webhookLog.count({
    where: { 
        createdAt: { gte: today },
        success: false
    }
  });

  // Use raw query for view count
  const anomalies: any = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM financial_anomalies_view`;
  
  const stuckWithdrawals = await prisma.withdrawalRequest.count({
    where: {
        status: 'PENDING',
        requestedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // > 3 days
    }
  });

  const suspendedSuppliers = await prisma.supplier.count({
    where: { financialStatus: 'SUSPENDED' }
  });

  res.json({
    processedEventsToday: processedEvents,
    failedWebhooksToday: failedWebhooks,
    anomalies: anomalies[0]?.count ? Number(anomalies[0].count) : 0,
    stuckWithdrawals,
    suspendedSuppliers
  });
};

// Export
export const exportAccounting = async (req: Request, res: Response) => {
  const { startDate, endDate, format } = req.query;
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid dates' });
      return;
  }

  try {
    const file = await ExportService.generateAccountingExport(start, end, format as 'csv' | 'xlsx');
    
    if (format === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=accounting.xlsx');
        res.send(file);
    } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=accounting.csv');
        res.send(file);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Export failed' });
  }
};

// Webhooks Management
export const getWebhooks = async (req: Request, res: Response) => {
    const webhooks = await prisma.internalWebhook.findMany();
    res.json(webhooks);
};

export const createWebhook = async (req: Request, res: Response) => {
    const { url, secret, subscribedEvents } = req.body;
    const webhook = await prisma.internalWebhook.create({
        data: { url, secret, subscribedEvents }
    });
    res.json(webhook);
};

export const updateWebhook = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { url, secret, subscribedEvents, isActive } = req.body;
    try {
        const webhook = await prisma.internalWebhook.update({
            where: { id },
            data: { 
                url, 
                secret, 
                subscribedEvents,
                isActive 
            }
        });
        res.json(webhook);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update webhook' });
    }
};

export const deleteWebhook = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.internalWebhook.delete({
            where: { id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
};

export const toggleWebhook = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const webhook = await prisma.internalWebhook.update({
        where: { id },
        data: { isActive }
    });
    res.json(webhook);
};

// Test Notification
export const testNotification = async (req: Request, res: Response) => {
    const { channel } = req.body; // 'slack', 'discord', 'email'
    await notificationService.notify('Test Alert', 'This is a test message from Admin Panel', { test: true });
    res.json({ success: true });
};
