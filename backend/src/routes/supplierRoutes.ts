import { Router } from 'express';
import { getSuppliers, createSupplier, deleteSupplier, updateSupplier } from '../controllers/supplierController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getSuppliers);
router.post('/', authenticateToken, createSupplier);
router.put('/:id', authenticateToken, updateSupplier);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deleteSupplier);

export default router;
