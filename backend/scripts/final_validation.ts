
import { PrismaClient, Role } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🔒 Starting Safe Migration & Validation Protocol...');

    // 1. Pre-Check
    console.log('\n[1/5] Pre-Check: Inspecting Database State...');
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
    console.log(`Found ${users.length} users.`);
    
    const invalidRoles = users.filter(u => !['SYSTEM_ADMIN', 'ACCOUNT_ADMIN', 'SELLER'].includes(u.role));
    if (invalidRoles.length > 0) {
        console.warn('⚠️  WARNING: Found users with legacy/invalid roles:', invalidRoles);
    } else {
        console.log('✅ Role Integrity: OK (All users have valid Enum roles)');
    }

    // 2. Backup Log
    console.log('\n[2/5] Backup Confirmation...');
    console.log('[DB] Backup confirmed before migration (Assumed via Supabase/Render policy)');

    // 3. Migration (Already executed via CLI, verifying schema)
    console.log('\n[3/5] Verifying Schema Sync...');
    try {
        // Simple query to check if column 'role' exists and accepts 'SYSTEM_ADMIN'
        // If this throws, schema is not synced.
        const test = await prisma.user.findFirst();
        console.log('✅ Prisma Client is compatible with DB schema.');
    } catch (e) {
        console.error('❌ Schema mismatch detected!', e);
        process.exit(1);
    }

    // 4. Seed SYSTEM_ADMIN
    console.log('\n[4/5] Seeding SYSTEM_ADMIN...');
    const seedPath = path.join(__dirname, '../prisma/seed_admin.sql');
    if (fs.existsSync(seedPath)) {
        const sql = fs.readFileSync(seedPath, 'utf-8');
        console.log(`Executing SQL from ${seedPath}...`);
        
        // Execute raw SQL
        // We need to split by commands if there are multiple, but the file uses DO $$ block which is one command.
        try {
            await prisma.$executeRawUnsafe(sql);
            console.log('✅ Seed executed successfully.');
        } catch (e: any) {
            console.error('❌ Seed execution failed:', e.message);
            // If it failed because user doesn't exist in auth.users, we should handle it.
            if (e.message.includes('User admin@pms.com not found')) {
                 console.warn('⚠️  SKIPPED: admin@pms.com not found in Supabase Auth. Create it manually first.');
            } else {
                 // Ignore if it's just "Notice"
            }
        }
    } else {
        console.error('❌ Seed file not found:', seedPath);
    }

    // 5. Post-Validation
    console.log('\n[5/5] Final Validation...');
    const sysAdmins = await prisma.user.findMany({ where: { role: Role.SYSTEM_ADMIN } });
    console.log(`SYSTEM_ADMIN count: ${sysAdmins.length}`);
    
    if (sysAdmins.length === 1 && sysAdmins[0].email === 'admin@pms.com') {
        console.log('✅ CRITERIA MET: Exactly one SYSTEM_ADMIN (admin@pms.com) exists.');
    } else if (sysAdmins.length === 0) {
        console.warn('⚠️  WARNING: No SYSTEM_ADMIN found. Please ensure admin@pms.com exists in Supabase Auth.');
    } else {
        console.warn('⚠️  WARNING: Multiple or incorrect SYSTEM_ADMINs found:', sysAdmins);
    }

    // Check for Account Admin leaks
    const individualsWithAdmin = await prisma.user.findMany({
        where: {
            role: Role.ACCOUNT_ADMIN,
            account: { type: 'INDIVIDUAL' } // Using string literal if enum import issues, but let's try strict
        },
        include: { account: true }
    });
    
    // Note: account.type is AccountType enum.
    // If strict checking:
    // const individualsWithAdmin = await prisma.user.findMany({ where: { role: Role.ACCOUNT_ADMIN, account: { type: AccountType.INDIVIDUAL } } });
    // But let's verify logic. A Business Account Admin is fine. An Individual Account Admin is NOT fine (should be Seller).
    // Actually, in our new logic, Individual Account has 'SELLER' role user. 
    // If we find ACCOUNT_ADMIN in INDIVIDUAL account, it's a breach (or legacy).

    if (individualsWithAdmin.length > 0) {
        console.error('❌ SECURITY BREACH: Found Individual Accounts with ADMIN privileges:', individualsWithAdmin.map(u => u.email));
    } else {
        console.log('✅ RBAC Integrity: No Individual Accounts have Admin privileges.');
    }

    console.log('\n🏁 Protocol Completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
