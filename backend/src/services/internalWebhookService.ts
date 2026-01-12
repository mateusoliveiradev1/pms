import crypto from 'crypto';
import axios from 'axios';
import prisma from '../prisma';
import logger from '../lib/logger';

export class InternalWebhookService {
  
  static async broadcast(event: string, payload: any) {
    try {
      const webhooks = await prisma.internalWebhook.findMany({
        where: { 
          isActive: true,
          subscribedEvents: { has: event } 
        }
      });

      for (const webhook of webhooks) {
        this.sendWithRetry(webhook, event, payload);
      }
    } catch (error) {
      console.error('Error broadcasting webhook:', error);
    }
  }

  private static async sendWithRetry(webhook: any, event: string, payload: any, attempt = 1) {
    const maxRetries = 3;
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      await axios.post(webhook.url, payload, {
        headers: {
          'X-Webhook-Event': event,
          'X-Webhook-Signature': signature,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      await this.logResult(webhook.id, event, payload, 200, true);
    } catch (error: any) {
      const status = error.response?.status || 0;
      const errorMsg = error.message;
      
      await this.logResult(webhook.id, event, payload, status, false, errorMsg, attempt);

      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        setTimeout(() => {
          this.sendWithRetry(webhook, event, payload, attempt + 1);
        }, backoff);
      } else {
        // Soft Alert: Webhook falhou 3x
        logger.warn({
             service: 'webhook-service',
             action: 'WEBHOOK_FAILED_MAX_RETRIES',
             entityType: 'WEBHOOK',
             entityId: webhook.id,
             message: `Webhook ${webhook.url} failed after ${maxRetries} attempts`,
             metadata: { event, error: errorMsg, statusCode: status }
         });
      }
    }
  }

  private static async logResult(webhookId: string, event: string, payload: any, statusCode: number, success: boolean, error?: string, attempt = 1) {
    try {
      await prisma.webhookLog.create({
        data: {
          webhookId,
          event,
          payload: payload as any,
          statusCode,
          success,
          error,
          attempt
        }
      });
    } catch (logError) {
      console.error('Failed to log webhook result:', logError);
    }
  }
}
