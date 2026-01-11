import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import prisma from '../prisma';

export const OrderPaymentController = {
  createPixPayment: async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
      const result = await PaymentService.createOrderPixPayment(orderId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  createStripePayment: async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
      const result = await PaymentService.createOrderStripePaymentIntent(orderId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  getPaymentStatus: async (req: Request, res: Response) => {
    const { orderId } = req.params;
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          paymentGateway: true,
          paidAt: true,
          totalAmount: true
        }
      });
      
      if (!order) return res.status(404).json({ message: 'Order not found' });
      
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching payment status' });
    }
  }
};
