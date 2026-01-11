import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';

export const PaymentController = {
  createPix: async (req: Request, res: Response) => {
    try {
      const { planId } = req.body;
      const supplierId = (req as any).user?.userId; // Assuming authMiddleware populates this

      if (!supplierId) return res.status(401).json({ error: 'Unauthorized' });

      const result = await PaymentService.createPixPayment(supplierId, planId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  createCard: async (req: Request, res: Response) => {
    try {
      const { planId } = req.body;
      const supplierId = (req as any).user?.userId;

      if (!supplierId) return res.status(401).json({ error: 'Unauthorized' });

      const result = await PaymentService.createStripePaymentIntent(supplierId, planId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  webhookMercadoPago: async (req: Request, res: Response) => {
    try {
      const { id, topic } = req.query; // MP sends id/topic in query or body depending on version
      // V1 sends data.id in body, V0 sends id in query.
      // Usually query has id and topic for IPN, but `mercadopago` package handles retrieval.
      // Let's handle generic notification format: query params `id` and `topic` or body `data.id` and `type`
      
      const notificationId = (req.query.id as string) || (req.body?.data?.id as string);
      const notificationTopic = (req.query.topic as string) || (req.body?.type as string);

      if (notificationId && (notificationTopic === 'payment' || req.body?.action === 'payment.created' || req.body?.action === 'payment.updated')) {
         await PaymentService.handleMercadoPagoWebhook(notificationId, 'payment');
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('MP Webhook Fail:', error);
      res.status(500).send('Error');
    }
  },

  webhookStripe: async (req: Request, res: Response) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      // req.body must be raw buffer here. Middleware configuration in index.ts is crucial.
      await PaymentService.handleStripeWebhook(req.body, sig);
      res.json({ received: true });
    } catch (error: any) {
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
};
