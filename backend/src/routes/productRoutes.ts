import { Router } from 'express';
import { getProducts, createProduct, updateProduct, exportProductsCsv } from '../controllers/productController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getProducts);
router.post('/', authenticateToken, createProduct);
router.put('/:id', authenticateToken, updateProduct);
router.get('/export.csv', authenticateToken, exportProductsCsv);

export default router;
