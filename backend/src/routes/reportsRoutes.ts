import { Router } from 'express';
import { getSalesStats, getTopProducts, getOrdersByStatus } from '../controllers/reportsController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

console.log('Reports routes loaded!'); // Debug log to confirm file loading

router.get('/test', (req, res) => res.send('Reports route working')); // Test route without auth
router.get('/sales', authenticateToken, getSalesStats);
router.get('/top-products', authenticateToken, getTopProducts);
router.get('/status', authenticateToken, getOrdersByStatus);

export default router;
