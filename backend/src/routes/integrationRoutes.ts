import { Router } from 'express';
import { 
    getFinancialHealth, 
    exportAccounting, 
    getWebhooks, 
    createWebhook, 
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    testNotification 
} from '../controllers/integrationController';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Health & Metrics
router.get('/health', authenticateToken, requireAdmin, getFinancialHealth);

// Exports
router.get('/export', authenticateToken, requireAdmin, exportAccounting);

// Webhooks
router.get('/webhooks', authenticateToken, requireAdmin, getWebhooks);
router.post('/webhooks', authenticateToken, requireAdmin, createWebhook);
router.put('/webhooks/:id', authenticateToken, requireAdmin, updateWebhook);
router.delete('/webhooks/:id', authenticateToken, requireAdmin, deleteWebhook);
router.patch('/webhooks/:id/toggle', authenticateToken, requireAdmin, toggleWebhook);

// Test Tools
router.post('/test-notification', authenticateToken, requireAdmin, testNotification);

export default router;
