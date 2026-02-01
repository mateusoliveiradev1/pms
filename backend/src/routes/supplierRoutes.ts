import { Router } from 'express';
import { getSuppliers, createSupplier, deleteSupplier, updateSupplier, createExternalSupplier, approveExternalSupplier } from '../controllers/supplierController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getSuppliers);
router.post('/', authenticateToken, createSupplier);
router.post('/external', authenticateToken, createExternalSupplier);
router.post('/:id/approve', authenticateToken, requireRole(['ACCOUNT_ADMIN', 'SYSTEM_ADMIN', 'ADMIN']), approveExternalSupplier);
router.put('/:id', authenticateToken, updateSupplier);
router.delete('/:id', authenticateToken, requireRole(['SYSTEM_ADMIN', 'ADMIN']), deleteSupplier);

export default router;
