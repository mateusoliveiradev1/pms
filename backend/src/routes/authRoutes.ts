import { Router } from 'express';
import { login, register, updatePushToken } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/push-token', authenticateToken, updatePushToken);

export default router;
