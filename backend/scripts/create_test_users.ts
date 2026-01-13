import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const prisma = new PrismaClient();

async function createTestUsers() {
    console.log('Creating Test Users for Smoke Tests...');

    // Helper to create user in Supabase and Prisma
    const ensureUser = async (email: string, name: string, role: string) => {
        console.log(`Ensuring user ${email}...`);
        
        // 1. Supabase
        let userId = '';
        const { data: listUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = listUsers.users.find(u => u.email === email);

        if (existingUser) {
            userId = existingUser.id;
            await supabase.auth.admin.updateUserById(userId, {
                user_metadata: { role, name },
                email_confirm: true
            });
        } else {
            const { data, error } = await supabase.auth.admin.createUser({
                email,
                password: 'TestPassword123!',
                email_confirm: true,
                user_metadata: { role, name }
            });
            if (error) throw error;
            userId = data.user!.id;
        }

        // 2. Prisma User
        const user = await prisma.user.upsert({
            where: { id: userId },
            update: { email, name, role },
            create: { id: userId, email, name, role }
        });

        return user;
    };

    try {
        // Ensure Plan
        let plan = await prisma.plan.findFirst();
        if (!plan) {
            console.log('Creating Default Plan...');
            plan = await prisma.plan.create({
                data: {
                    name: 'Basic Plan',
                    monthlyPrice: 29.90,
                    cycleDays: 30,
                    commissionPercent: 10,
                }
            });
        }

        // 1. Account Admin & Account
        const accountAdmin = await ensureUser('account@pms.com', 'Account Admin', 'ACCOUNT_ADMIN');
        
        let account = await prisma.account.findFirst({ where: { users: { some: { id: accountAdmin.id } } } });
        if (!account) {
            console.log('Creating Account for Account Admin...');
            account = await prisma.account.create({
                data: {
                    name: 'Test Account',
                    // document: '00000000000', // Removed: Not in schema
                    type: 'COMPANY',
                    // ownerId: accountAdmin.id, // Removed: Not in schema, relation is on User side
                    onboardingStatus: 'COMPLETO',
                    planId: plan.id
                }
            });
            // Update user with accountId
            await prisma.user.update({
                where: { id: accountAdmin.id },
                data: { accountId: account.id }
            });
        } else {
            console.log('Account already exists.');
        }

        // 2. Supplier Admin & Supplier
        const supplierAdmin = await ensureUser('supplier_admin@pms.com', 'Supplier Admin', 'SUPPLIER_ADMIN');
        
        let supplier = await prisma.supplier.findFirst({ where: { userId: supplierAdmin.id } });
        if (!supplier) {
            console.log('Creating Supplier for Supplier Admin...');
            supplier = await prisma.supplier.create({
                data: {
                    name: 'Test Supplier Admin',
                    billingDoc: '11111111111', // Used billingDoc
                    integrationType: 'MANUAL',
                    accountId: account.id, // Link to same account
                    userId: supplierAdmin.id,
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED'
                }
            });
        }

        // 3. Supplier User (Independent Supplier for now, to fit schema)
        const supplierUser = await ensureUser('supplier_user@pms.com', 'Supplier User', 'SUPPLIER_USER');
        
        let supplier2 = await prisma.supplier.findFirst({ where: { userId: supplierUser.id } });
        if (!supplier2) {
            console.log('Creating Supplier for Supplier User...');
            supplier2 = await prisma.supplier.create({
                data: {
                    name: 'Test Supplier User',
                    billingDoc: '22222222222', // Used billingDoc
                    integrationType: 'MANUAL',
                    accountId: account.id, // Link to same account
                    userId: supplierUser.id,
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED'
                }
            });
        }

        console.log('\n--- TEST USERS CREATED ---');
        console.log('Password for all: TestPassword123!');
        console.log('account@pms.com (ACCOUNT_ADMIN)');
        console.log('supplier_admin@pms.com (SUPPLIER_ADMIN)');
        console.log('supplier_user@pms.com (SUPPLIER_USER)');

    } catch (e: any) {
        console.error('Error creating test users:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUsers();
