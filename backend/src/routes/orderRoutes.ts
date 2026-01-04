import { Router } from 'express';
import { getOrders, createOrder, updateOrderStatus, exportOrdersCsv, getOrderStatusStats } from '../controllers/orderController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getOrders);
router.post('/', authenticateToken, createOrder);
router.put('/:id/status', authenticateToken, updateOrderStatus);
router.get('/export.csv', authenticateToken, exportOrdersCsv);
router.get('/stats', authenticateToken, getOrderStatusStats);

export default router;
