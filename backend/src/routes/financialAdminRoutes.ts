import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';
import {
    getFinancialOverview,
    getReconciliation,
    getSupplierFinancialStats,
    getOperationalAlerts
} from '../controllers/financialAdminController';

const router = express.Router();

// All routes require ADMIN role
router.use(authenticateToken);
router.use(requireRole(['SYSTEM_ADMIN', 'ADMIN']));

router.get('/overview', getFinancialOverview);
router.get('/reconciliation', getReconciliation);
router.get('/suppliers', getSupplierFinancialStats);
router.get('/alerts', getOperationalAlerts);

export default router;
