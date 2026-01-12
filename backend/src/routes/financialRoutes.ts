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
    getAdminAuditLogs
} from '../controllers/financialController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Admin Routes
router.get('/admin/dashboard', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ADMIN']), getAdminDashboard);
router.get('/admin/suppliers', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ADMIN']), getAdminSupplierFinancials);
router.get('/admin/audit', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ADMIN']), getAdminAuditLogs);
router.get('/admin/withdrawals', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ADMIN']), listWithdrawalRequests);
router.post('/admin/withdrawals/:id/approve', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ADMIN']), approveWithdraw);
router.post('/admin/withdrawals/:id/reject', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ADMIN']), rejectWithdraw);
router.get('/admin/settings', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ADMIN']), getFinancialSettings);
router.put('/admin/settings', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ADMIN']), updateFinancialSettings);

// Public / Supplier Routes
router.post('/cron/check-overdue', checkOverdue);
router.post('/subscription/pay', authenticateToken, paySubscription);
router.get('/ledger', authenticateToken, getLedger);
router.get('/supplier/:id', authenticateToken, getSupplierFinancials);
router.post('/withdraw', authenticateToken, withdrawFunds);
router.post('/subscription/change-plan', authenticateToken, changePlan);
router.post('/billing-info', authenticateToken, updateBillingInfo);

export default router;
