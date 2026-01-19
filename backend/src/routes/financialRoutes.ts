import { Router } from 'express';
import { 
    checkOverdue, 
    paySubscription, 
    getLedger, 
    getSupplierFinancials, 
    withdrawFunds, 
    changePlan, 
    updateBillingInfo,
    getAdminDashboard,
    listWithdrawalRequests,
    approveWithdraw,
    rejectWithdraw,
    getFinancialSettings,
    updateFinancialSettings,
    getAdminSupplierFinancials,
    getAdminAuditLogs,
    getAccountMetrics,
    getSupplierMetrics
} from '../controllers/financialController';
import { authenticateToken, requireRole, requireSystemAdmin, requireAccountAdmin } from '../middlewares/authMiddleware';
import { Role } from '@prisma/client';

const router = Router();

// Admin Routes
router.get('/admin/dashboard', authenticateToken, requireSystemAdmin, getAdminDashboard);
router.get('/admin/suppliers', authenticateToken, requireSystemAdmin, getAdminSupplierFinancials);
router.get('/admin/audit', authenticateToken, requireSystemAdmin, getAdminAuditLogs);
router.get('/admin/withdrawals', authenticateToken, requireSystemAdmin, listWithdrawalRequests);
router.post('/admin/withdrawals/:id/approve', authenticateToken, requireSystemAdmin, approveWithdraw);
router.post('/admin/withdrawals/:id/reject', authenticateToken, requireSystemAdmin, rejectWithdraw);
router.get('/admin/settings', authenticateToken, requireSystemAdmin, getFinancialSettings);
router.put('/admin/settings', authenticateToken, requireSystemAdmin, updateFinancialSettings);
router.get('/admin/metrics', authenticateToken, requireRole([Role.SYSTEM_ADMIN, Role.ACCOUNT_ADMIN]), getAccountMetrics);

// Public / Supplier Routes
router.post('/cron/check-overdue', checkOverdue);
router.post('/subscription/pay', authenticateToken, paySubscription);
router.get('/ledger', authenticateToken, getLedger);
router.get('/supplier/:id', authenticateToken, getSupplierFinancials);
router.get('/supplier/metrics', authenticateToken, getSupplierMetrics);
router.post('/withdraw', authenticateToken, withdrawFunds);
router.post('/subscription/change-plan', authenticateToken, changePlan);
router.post('/billing-info', authenticateToken, updateBillingInfo);

export default router;
