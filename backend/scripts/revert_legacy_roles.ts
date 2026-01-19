
import { PrismaClient, Role, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔙 Reverting Role Fixes (Restoring Legacy State for Audit)...');

    const usersToRevert = [
        'user@pms.com',
        'user2@pms.com',
        'mateus.pb2015@hotmail.com',
        'user3@pms.com'
    ];

    for (const email of usersToRevert) {
        try {
            await prisma.user.update({
                where: { email },
                data: { role: Role.ACCOUNT_ADMIN } // Restoring to the "invalid" state
            });
            console.log(`✅ Reverted ${email} to ACCOUNT_ADMIN`);
        } catch (e) {
            console.warn(`⚠️ Could not revert ${email} (might not exist)`);
        }
    }

    console.log('Legacy state restored.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
