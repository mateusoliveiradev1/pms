import { Router } from 'express';
import { getOrders, createOrder, updateOrderStatus } from '../controllers/orderController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getOrders);
router.post('/', authenticateToken, createOrder);
router.put('/:id/status', authenticateToken, updateOrderStatus);

export default router;
