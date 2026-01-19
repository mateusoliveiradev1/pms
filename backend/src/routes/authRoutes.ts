import { Router } from 'express';
import { login, registerIndividual, registerBusiness, updatePushToken, updateProfile, getMe } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register/individual', registerIndividual);
router.post('/register/business', registerBusiness);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, updateProfile);
router.post('/push-token', authenticateToken, updatePushToken);

export default router;
