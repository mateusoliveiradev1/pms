import { Router } from 'express';
import { checkOverdue, paySubscription, getLedger, getSupplierFinancials, withdrawFunds, changePlan, updateBillingInfo } from '../controllers/financialController';

const router = Router();

router.post('/cron/check-overdue', checkOverdue);
router.post('/subscription/pay', paySubscription);
router.get('/ledger', getLedger);
router.get('/supplier/:id', getSupplierFinancials);
router.post('/withdraw', withdrawFunds);
router.post('/subscription/change-plan', changePlan);
router.post('/billing-info', updateBillingInfo);

export default router;
