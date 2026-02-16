import { Router } from 'express';
import { getAuthUrl, handleCallback, checkConnection, syncProducts, handleMobileRedirect } from '../controllers/mercadoLivreController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/mobile-redirect', handleMobileRedirect); // Public endpoint for ML callback
router.get('/auth-url', authenticateToken, getAuthUrl);
router.post('/callback', authenticateToken, handleCallback);
router.get('/status', authenticateToken, checkConnection);
router.post('/sync-products', authenticateToken, syncProducts);

export default router;
