import prisma from '../prisma';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';
import { Role } from '@prisma/client';

export const ensureAdminUser = async () => {
  const ADMIN_EMAIL = 'admin@pms.com';
  const ADMIN_PASSWORD = 'AdminPassword123!';
  const ADMIN_ROLE = Role.SYSTEM_ADMIN;

  logger.info({
    service: 'backend',
    action: 'SEED_ADMIN',
    message: '[AdminSeed] Checking for System Admin user...'
  });

  try {
    // 0. Ensure Basic Plans exist (Fixes foreign key issues)
    const plansCount = await prisma.plan.count();
    if (plansCount === 0) {
        logger.info({
            service: 'backend',
            action: 'SEED_ADMIN',
            message: '[AdminSeed] No plans found. Seeding default plans...'
        });
        await prisma.plan.createMany({
            data: [
                { id: 'basic', name: 'Plano Básico', monthlyPrice: 49.90, commissionPercent: 12.0 },
                { id: 'pro', name: 'Plano Profissional', monthlyPrice: 99.90, commissionPercent: 10.0 },
                { id: 'enterprise', name: 'Plano Enterprise', monthlyPrice: 199.90, commissionPercent: 8.0 }
            ]
        });
    }

    // 1. Check/Create in Supabase
    let userId: string | null = null;
    
    // Attempt to sign in to check existence (and get ID)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
    });

    if (signInData.user) {
        logger.info({
            service: 'backend',
            action: 'SEED_ADMIN',
            message: '[AdminSeed] User already exists in Supabase.'
        });
        userId = signInData.user.id;
    } else {
        // If login failed, try to register
        logger.info({
            service: 'backend',
            action: 'SEED_ADMIN',
            message: '[AdminSeed] User not found or login failed. Attempting to create...'
        });
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            options: {
                data: {
                    role: ADMIN_ROLE,
                    name: 'System Admin'
                }
            }
        });

        if (signUpError) {
            if (signUpError.message.includes('already registered')) {
                logger.warn({
                    service: 'backend',
                    action: 'SEED_ADMIN',
                    message: '[AdminSeed] User already registered in Supabase but login failed (possibly wrong password).'
                });
                // Fallback: search in Prisma by email to get ID
            } else {
                logger.error({
                    service: 'backend',
                    action: 'SEED_ADMIN_ERROR',
                    message: '[AdminSeed] Failed to create Supabase user: ' + signUpError.message
                });
                return;
            }
        } else if (signUpData.user) {
            logger.info({
                service: 'backend',
                action: 'SEED_ADMIN',
                message: '[AdminSeed] Supabase user created successfully.'
            });
            userId = signUpData.user.id;
        }
    }

    if (!userId) {
        const existingPrismaUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
        if (existingPrismaUser) {
            userId = existingPrismaUser.id;
            logger.info({
                service: 'backend',
                action: 'SEED_ADMIN',
                message: '[AdminSeed] Found existing user in Prisma by email. Using that ID.'
            });
        } else {
             logger.error({
                service: 'backend',
                action: 'SEED_ADMIN_ERROR',
                message: '[AdminSeed] Could not obtain User ID. Aborting.'
             });
             return;
        }
    }

    // 2. Sync with Prisma (Idempotent)
    const dbUser = await prisma.user.findUnique({
        where: { id: userId } 
    });

    if (dbUser) {
        logger.info({
            service: 'backend',
            action: 'SEED_ADMIN',
            message: '[AdminSeed] User exists in Prisma. Skipping update.'
        });
    } else {
        logger.info({
            service: 'backend',
            action: 'SEED_ADMIN',
            message: '[AdminSeed] User missing in Prisma. Creating...'
        });
        
        const account = await prisma.account.create({
            data: {
                name: 'System Admin Account',
                email: ADMIN_EMAIL,
                type: 'INDIVIDUAL',
                planId: 'enterprise',
                onboardingStatus: 'COMPLETED'
            }
        });

        await prisma.user.create({
            data: {
                id: userId, // ID MATCHES SUPABASE
                email: ADMIN_EMAIL,
                name: 'System Admin',
                role: ADMIN_ROLE,
                status: 'ACTIVE',
                accountId: account.id
            }
        });
        
        logger.info({
            service: 'backend',
            action: 'SEED_ADMIN',
            message: '[AdminSeed] System Admin seeded successfully in Prisma.'
        });
    }

  } catch (error: any) {
    logger.error({
        service: 'backend',
        action: 'SEED_ADMIN_ERROR',
        message: '[AdminSeed] Unexpected error: ' + error.message
    });
  }
};
