import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  ADMIN_JWT_SECRET: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(1),
  WEBHOOK_SECRET: z.string().min(1),
  
  // Feature Flags
  ENABLE_WEBHOOKS: z.string().default('true').transform((v) => v === 'true'),
  ENABLE_EXPORTS: z.string().default('true').transform((v) => v === 'true'),
  ENABLE_NOTIFICATIONS: z.string().default('true').transform((v) => v === 'true'),

  // Optional/External services
  CORS_ORIGIN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:');
  _env.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = _env.data;
