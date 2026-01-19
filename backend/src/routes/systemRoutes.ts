import { Router } from 'express';
import { getSystemHealth } from '../controllers/systemController';
import { authenticateToken, requireSystemAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireSystemAdmin);

// Only admin can access system health
router.get('/health', getSystemHealth);

export default router;
