
import { PrismaClient, Role, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetEmails = [
        'user@pms.com',
        'user2@pms.com',
        'user3@pms.com',
        'mateus.pb2015@hotmail.com'
    ];

    console.log(`🔒 Applying Manual Fix for ${targetEmails.length} Legacy Users...`);

    // 1. Execute Update (Option A)
    const result = await prisma.user.updateMany({
        where: {
            email: { in: targetEmails },
            role: Role.ACCOUNT_ADMIN // Safety check to only affect if currently ADMIN
        },
        data: {
            role: Role.SELLER
        }
    });

    console.log(`✅ Updated ${result.count} users to SELLER role.`);

    // 2. Post-Fix Validation
    console.log('\n🔍 Validating specific users...');
    const validatedUsers = await prisma.user.findMany({
        where: { email: { in: targetEmails } },
        select: { email: true, role: true }
    });
    console.table(validatedUsers);

    // 3. Final Integrity Check
    console.log('\n🔍 Final Integrity Check (INDIVIDUAL vs ACCOUNT_ADMIN)...');
    
    // Prisma query equivalent to SQL: SELECT ... WHERE account.type = INDIVIDUAL AND role = ACCOUNT_ADMIN
    const anomalies = await prisma.user.findMany({
        where: {
            role: Role.ACCOUNT_ADMIN,
            account: { type: AccountType.INDIVIDUAL }
        },
        select: { email: true, role: true, account: { select: { type: true } } }
    });

    if (anomalies.length === 0) {
        console.log('✅ Nenhum usuário INDIVIDUAL possui role ACCOUNT_ADMIN.');
    } else {
        console.error('❌ Still found anomalies:', anomalies);
        process.exit(1);
    }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
