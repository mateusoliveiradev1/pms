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
import { ensureAdminUser } from './utils/seedAdmin';

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
        patch: 'v14-port-fix' // Switched to Port 6543 (Transaction Mode) for Pooler Compatibility
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

// Privacy Policy Endpoint for Play Store
app.get('/privacy', (req, res) => {
    res.send(`
    <html>
        <head>
            <title>Termos e Privacidade - PMS Ops</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1 { color: #333; }
                h2 { color: #555; }
            </style>
        </head>
        <body>
            <h1>Política de Privacidade e Termos de Uso</h1>
            <p><strong>Última atualização:</strong> 16 de Fevereiro de 2026</p>
            
            <p>O aplicativo <strong>PMS Ops</strong> foi desenvolvido como uma ferramenta comercial. Ao utilizar este serviço, você concorda com os termos descritos abaixo.</p>
            
            <h2>1. Termos de Uso</h2>
            <p>O uso do aplicativo é permitido apenas para fins legais e comerciais legítimos. O usuário é responsável por manter a confidencialidade de sua conta e senha.</p>

            <h2>2. Coleta e Uso de Informações</h2>
            <p>Para uma melhor experiência e funcionamento do serviço (pagamentos, gestão de pedidos), coletamos:</p>
            <ul>
                <li>Nome e Email (para autenticação)</li>
                <li>Dados Financeiros (para processamento de pagamentos via Stripe)</li>
                <li>Imagens/Arquivos (para upload de comprovantes ou produtos)</li>
            </ul>
            
            <h2>3. Dados de Log</h2>
            <p>Em caso de erro no aplicativo, coletamos dados de Log para diagnóstico e melhoria do serviço.</p>
            
            <h2>4. Exclusão de Dados</h2>
            <p>Você pode solicitar a exclusão da sua conta e dados a qualquer momento entrando em contato com o suporte ou através da opção "Excluir Conta" nas configurações do aplicativo.</p>

            <h2>5. Contato</h2>
            <p>Se você tiver dúvidas sobre nossa Política de Privacidade ou Termos de Uso, entre em contato conosco.</p>
        </body>
    </html>
    `);
});

app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${env.APP_ENV} mode`);
  logger.info({ action: 'STARTUP', message: 'Server started immediately, seeding in background...' });
  
  // Seed Admin on Start
  ensureAdminUser().catch(err => logger.error({ action: 'ADMIN_SEED_FAIL', message: 'Admin seed failed', metadata: err }));
});

// Keep-alive to prevent premature exit in dev environment
setInterval(() => {}, 60000);
