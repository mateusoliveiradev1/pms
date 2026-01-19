
import { PrismaClient, Role, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Starting Legacy Role Fix...');

    // Find users with ACCOUNT_ADMIN in INDIVIDUAL accounts
    const invalidUsers = await prisma.user.findMany({
        where: {
            role: Role.ACCOUNT_ADMIN,
            account: { type: AccountType.INDIVIDUAL }
        },
        include: { account: true }
    });

    console.log(`Found ${invalidUsers.length} users with invalid privileges.`);

    for (const user of invalidUsers) {
        console.log(`Fixing user: ${user.email} (${user.id}) -> Demoting to SELLER`);
        await prisma.user.update({
            where: { id: user.id },
            data: { role: Role.SELLER }
        });
    }

    console.log('✅ Fix completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
