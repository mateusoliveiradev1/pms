import { Router } from 'express';
import { getSalesStats } from '../controllers/reportsController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/sales', authenticateToken, getSalesStats);

export default router;
