import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Protected Routes (Supplier initiates payment)
router.post('/subscribe/pix', authenticateToken, PaymentController.createPix);
router.post('/subscribe/card', authenticateToken, PaymentController.createCard);

// Public Webhooks (Gateways call these)
router.post('/webhook/mercadopago', PaymentController.webhookMercadoPago);
router.post('/webhook/stripe', PaymentController.webhookStripe); // Requires raw body handling in app.ts

export default router;
