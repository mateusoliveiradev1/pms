import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import supplierRoutes from './routes/supplierRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import notificationRoutes from './routes/notificationRoutes';
import mercadoLivreRoutes from './routes/mercadoLivreRoutes';
import reportsRoutes from './routes/reportsRoutes';
import plansRoutes from './routes/plansRoutes';
import financialRoutes from './routes/financialRoutes';
import { getSupplierFinancials } from './controllers/financialController';

const app = express();
const PORT = process.env.PORT || 3001;

// Debug: Catch unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/mercadolivre', mercadoLivreRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/financial', financialRoutes);
// Explicit route to avoid 404 on some environments
app.get('/api/financial/supplier/:id', getSupplierFinancials);

app.get('/', (req, res) => {
  res.send('Dropshipping PMS API Running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Keep-alive to prevent premature exit in dev environment
setInterval(() => {}, 60000);
