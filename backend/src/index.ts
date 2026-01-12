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
import paymentRoutes from './routes/paymentRoutes';
import orderPaymentRoutes from './routes/orderPaymentRoutes';
import financialAdminRoutes from './routes/financialAdminRoutes';
import biRoutes from './routes/biRoutes';
import integrationRoutes from './routes/integrationRoutes';
import systemRoutes from './routes/systemRoutes';
import { globalErrorHandler } from './middlewares/errorMiddleware';
import logger from './lib/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Debug: Catch unhandled errors
process.on('uncaughtException', (err) => {
  logger.critical({
      service: 'process',
      action: 'UNCAUGHT_EXCEPTION',
      message: err.message,
      metadata: { stack: err.stack }
  });
});

process.on('unhandledRejection', (reason: any, promise) => {
  logger.critical({
      service: 'process',
      action: 'UNHANDLED_REJECTION',
      message: reason instanceof Error ? reason.message : String(reason),
      metadata: { reason }
  });
});

app.use(cors());

// Stripe Webhook requires raw body
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));

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
app.use('/api/payments', paymentRoutes);
app.use('/api/orders/payment', orderPaymentRoutes);
app.use('/api/financial-admin', financialAdminRoutes);
app.use('/api/admin/bi', biRoutes);
app.use('/api/admin/integrations', integrationRoutes);
app.use('/api/admin/system', systemRoutes);

app.get('/', (req, res) => {
  res.send('Dropshipping PMS API Running');
});

app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Keep-alive to prevent premature exit in dev environment
setInterval(() => {}, 60000);
