import prisma from '../prisma';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';
import { Role } from '@prisma/client';

export const ensureAdminUser = async () => {
  const ADMIN_EMAIL = 'admin@pms.com';
  const ADMIN_PASSWORD = 'AdminPassword123!';
  const ADMIN_ROLE = Role.SYSTEM_ADMIN;

  logger.info('[AdminSeed] Checking for System Admin user...');

  try {
    // 0. Ensure Basic Plans exist (Fixes foreign key issues)
    const plansCount = await prisma.plan.count();
    if (plansCount === 0) {
        logger.info('[AdminSeed] No plans found. Seeding default plans...');
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
        logger.info('[AdminSeed] User already exists in Supabase.');
        userId = signInData.user.id;
    } else {
        // If login failed, try to register
        logger.info('[AdminSeed] User not found or login failed. Attempting to create...');
        
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
                logger.warn('[AdminSeed] User already registered in Supabase but login failed (possibly wrong password).');
                // Fallback: search in Prisma by email to get ID
            } else {
                logger.error('[AdminSeed] Failed to create Supabase user:', signUpError.message);
                return;
            }
        } else if (signUpData.user) {
            logger.info('[AdminSeed] Supabase user created successfully.');
            userId = signUpData.user.id;
        }
    }

    if (!userId) {
        const existingPrismaUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
        if (existingPrismaUser) {
            userId = existingPrismaUser.id;
            logger.info('[AdminSeed] Found existing user in Prisma by email. Using that ID.');
        } else {
             logger.error('[AdminSeed] Could not obtain User ID. Aborting.');
             return;
        }
    }

    // 2. Sync with Prisma (Idempotent)
    const dbUser = await prisma.user.findUnique({
        where: { id: userId } 
    });

    if (dbUser) {
        logger.info('[AdminSeed] User exists in Prisma. Skipping update.');
    } else {
        logger.info('[AdminSeed] User missing in Prisma. Creating...');
        
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
        
        logger.info('[AdminSeed] System Admin seeded successfully in Prisma.');
    }

  } catch (error: any) {
    logger.error('[AdminSeed] Unexpected error:', error.message);
  }
};
