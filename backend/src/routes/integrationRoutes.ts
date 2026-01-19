import { Router } from 'express';
import { 
    getFinancialHealth, 
    exportAccounting, 
    getWebhooks, 
    createWebhook, 
    updateWebhook, 
    deleteWebhook, 
    toggleWebhook, 
    testNotification,
    getIntegrations,
    getMercadoLivreAuthUrl
} from '../controllers/integrationController';
import { authenticateToken, requireSystemAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Admin routes
router.get('/', authenticateToken, requireSystemAdmin, getIntegrations);
router.post('/mercadolivre/auth', authenticateToken, requireSystemAdmin, getMercadoLivreAuthUrl);

// Health & Metrics
router.get('/health', authenticateToken, requireSystemAdmin, getFinancialHealth);

// Exports
router.get('/export', authenticateToken, requireSystemAdmin, exportAccounting);

// Webhooks
router.get('/webhooks', authenticateToken, requireSystemAdmin, getWebhooks);
router.post('/webhooks', authenticateToken, requireSystemAdmin, createWebhook);
router.put('/webhooks/:id', authenticateToken, requireSystemAdmin, updateWebhook);
router.delete('/webhooks/:id', authenticateToken, requireSystemAdmin, deleteWebhook);
router.patch('/webhooks/:id/toggle', authenticateToken, requireSystemAdmin, toggleWebhook);

// Test Tools
router.post('/test-notification', authenticateToken, requireSystemAdmin, testNotification);

export default router;
