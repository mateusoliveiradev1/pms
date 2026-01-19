import { Router } from 'express';
import { getSuppliers, createSupplier, deleteSupplier, updateSupplier, createExternalSupplier, approveExternalSupplier } from '../controllers/supplierController';
import { authenticateToken, requireRole, requireSystemAdmin, requireSeller } from '../middlewares/authMiddleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticateToken, getSuppliers);
router.post('/', authenticateToken, requireSystemAdmin, createSupplier);
router.post('/external', authenticateToken, requireSeller, createExternalSupplier);
router.post('/:id/approve', authenticateToken, requireRole([Role.ACCOUNT_ADMIN, Role.SYSTEM_ADMIN]), approveExternalSupplier);
router.put('/:id', authenticateToken, requireRole([Role.ACCOUNT_ADMIN, Role.SYSTEM_ADMIN]), updateSupplier);
router.delete('/:id', authenticateToken, requireSystemAdmin, deleteSupplier);

export default router;
