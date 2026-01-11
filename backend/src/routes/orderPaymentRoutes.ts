import { Router } from 'express';
import { OrderPaymentController } from '../controllers/orderPaymentController';
// import { authenticate } from '../middlewares/authMiddleware'; 

const router = Router();

// Public routes for payment initiation (secured by UUID knowledge)
// In a real app, you might validate a session or token if the user is logged in.
router.post('/:orderId/pay/pix', OrderPaymentController.createPixPayment);
router.post('/:orderId/pay/stripe', OrderPaymentController.createStripePayment);
router.get('/:orderId/status', OrderPaymentController.getPaymentStatus);

export default router;
