import { Router } from 'express';
import { getSuppliers, createSupplier, deleteSupplier } from '../controllers/supplierController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getSuppliers);
router.post('/', authenticateToken, createSupplier);
router.delete('/:id', authenticateToken, requireRole('ADMIN'), deleteSupplier);

export default router;
