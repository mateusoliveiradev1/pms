import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, exportProductsCsv, getProductHistory } from '../controllers/productController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok', routes: 'loaded' }));

router.get('/', authenticateToken, getProducts);
router.get('/export.csv', authenticateToken, exportProductsCsv);
router.get('/:id', authenticateToken, getProductById);
router.post('/', authenticateToken, createProduct);
router.put('/:id', authenticateToken, updateProduct);
router.get('/:id/history', authenticateToken, getProductHistory);

export default router;
