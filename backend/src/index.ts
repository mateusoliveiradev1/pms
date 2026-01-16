import { env } from './env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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
const PORT = env.PORT;

// Trust Proxy (Required for Rate Limiting behind Render/Load Balancers)
app.set('trust proxy', 1);

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

// Security Headers
app.use(helmet());

// CORS Configuration
const corsOptions = {
    origin: '*', // Allow all origins for mobile app compatibility
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Health Check Endpoint (Public)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        env: env.APP_ENV, 
        timestamp: new Date().toISOString(),
        patch: 'v10-fix-downgrade-prisma-v6' // Reverted to Stable V6.16.0 for Adapter Compatibility
    });
});

// Rate Limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // Admin needs more bandwidth
    standardHeaders: true,
    legacyHeaders: false,
});

const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Allow bursts
    standardHeaders: true,
    legacyHeaders: false,
});

// Webhook handling (Apply limiter and raw body parser)
app.use('/api/payments/webhook', webhookLimiter);
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));

app.use(express.json());

// Routes
app.use('/api/auth', authLimiter, authRoutes);
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

// Admin Routes (Apply limiter)
app.use('/api/financial-admin', adminLimiter, financialAdminRoutes);
app.use('/api/admin/bi', adminLimiter, biRoutes);
app.use('/api/admin/integrations', adminLimiter, integrationRoutes);
app.use('/api/admin/system', adminLimiter, systemRoutes);

app.get('/', (req, res) => {
  res.send(`Dropshipping PMS API Running (${env.APP_ENV})`);
});

app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${env.APP_ENV} mode`);
});

// Keep-alive to prevent premature exit in dev environment
setInterval(() => {}, 60000);
