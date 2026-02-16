import { Router } from 'express';
import { 
    getFinancialOverview as getSystemFinancialOverview, 
    listAllWithdrawals, 
    processWithdrawal, 
    updateGlobalSettings 
} from '../controllers/financialAdminController';
import { authenticateToken, requireSystemAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireSystemAdmin);

router.get('/overview', getSystemFinancialOverview);
router.get('/withdrawals', listAllWithdrawals);
router.post('/withdrawals/:id/process', processWithdrawal);
router.put('/settings', updateGlobalSettings);

export default router;
