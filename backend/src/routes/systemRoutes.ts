import { Router } from 'express';
import { getSystemHealth } from '../controllers/systemController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Only admin can access system health
router.get('/health', authenticateToken, requireAdmin, getSystemHealth);

export default router;
