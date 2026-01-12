import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting onboarding backfill...');

  const accounts = await prisma.account.findMany({
    include: {
      suppliers: true,
      users: true,
    },
  });

  console.log(`Found ${accounts.length} accounts to process`);

  for (const account of accounts) {
    const hasSuppliers = account.suppliers.length > 0;

    if (account.type === 'INDIVIDUAL') {
      if (!hasSuppliers) {
        const ownerUser =
          account.users.find((u) => u.role === 'OWNER') || account.users[0] || null;

        await prisma.supplier.create({
          data: {
            name: account.name,
            type: 'INDIVIDUAL',
            integrationType: 'MANUAL',
            status: 'ACTIVE',
            active: true,
            financialStatus: 'ACTIVE',
            verificationStatus: 'PENDING',
            isDefault: true,
            accountId: account.id,
            userId: ownerUser?.id,
            planId: account.planId,
          },
        });

        await prisma.account.update({
          where: { id: account.id },
          data: { onboardingStatus: 'COMPLETO' },
        });

        console.log(`Created default supplier for INDIVIDUAL account ${account.id}`);
      }
    } else if (account.type === 'COMPANY') {
      if (!hasSuppliers && account.onboardingStatus !== 'REQUIRES_SUPPLIER') {
        await prisma.account.update({
          where: { id: account.id },
          data: { onboardingStatus: 'REQUIRES_SUPPLIER' },
        });
        console.log(`Marked COMPANY account ${account.id} as REQUIRES_SUPPLIER`);
      }
    }
  }

  console.log('Onboarding backfill completed.');
}

run()
  .catch((err) => {
    console.error('Backfill failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

