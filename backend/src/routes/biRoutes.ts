import { Router } from 'express';
import { BiFinancialController } from '../controllers/biFinancialController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Middleware de proteção (Admin Only)
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/overview', BiFinancialController.getOverview);
router.get('/daily-revenue', BiFinancialController.getDailyRevenue);
router.get('/suppliers', BiFinancialController.getSuppliersKPIs);
router.get('/anomalies', BiFinancialController.getAnomalies);

export default router;
