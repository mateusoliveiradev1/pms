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
    rejectWithdraw
} from '../controllers/financialController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Admin Routes
router.get('/admin/dashboard', authenticateToken, requireRole('ADMIN'), getAdminDashboard);
router.get('/admin/withdrawals', authenticateToken, requireRole('ADMIN'), listWithdrawalRequests);
router.post('/admin/withdrawals/:id/approve', authenticateToken, requireRole('ADMIN'), approveWithdraw);
router.post('/admin/withdrawals/:id/reject', authenticateToken, requireRole('ADMIN'), rejectWithdraw);

// Public / Supplier Routes
router.post('/cron/check-overdue', checkOverdue);
router.post('/subscription/pay', paySubscription);
router.get('/ledger', getLedger);
router.get('/supplier/:id', getSupplierFinancials);
router.post('/withdraw', withdrawFunds);
router.post('/subscription/change-plan', changePlan);
router.post('/billing-info', updateBillingInfo);

export default router;
