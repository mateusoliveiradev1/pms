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
    updateFinancialSettings
} from '../controllers/financialController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Admin Routes
router.get('/admin/dashboard', authenticateToken, requireRole('ADMIN'), getAdminDashboard);
router.get('/admin/withdrawals', authenticateToken, requireRole('ADMIN'), listWithdrawalRequests);
router.post('/admin/withdrawals/:id/approve', authenticateToken, requireRole('ADMIN'), approveWithdraw);
router.post('/admin/withdrawals/:id/reject', authenticateToken, requireRole('ADMIN'), rejectWithdraw);
router.get('/admin/settings', authenticateToken, requireRole('ADMIN'), getFinancialSettings);
router.put('/admin/settings', authenticateToken, requireRole('ADMIN'), updateFinancialSettings);

// Public / Supplier Routes
router.post('/cron/check-overdue', checkOverdue);
router.post('/subscription/pay', authenticateToken, paySubscription);
router.get('/ledger', authenticateToken, getLedger);
router.get('/supplier/:id', authenticateToken, getSupplierFinancials);
router.post('/withdraw', authenticateToken, withdrawFunds);
router.post('/subscription/change-plan', authenticateToken, changePlan);
router.post('/billing-info', authenticateToken, updateBillingInfo);

export default router;
