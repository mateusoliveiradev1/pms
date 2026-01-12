
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting onboarding data fix...');

  // 1. Fix INDIVIDUAL accounts with NO suppliers
  const individualAccountsWithoutSupplier = await prisma.account.findMany({
    where: {
      type: 'INDIVIDUAL',
      suppliers: {
        none: {},
      },
    },
    include: {
      users: {
        where: { role: 'OWNER' },
        take: 1,
      },
    },
  });

  console.log(`Found ${individualAccountsWithoutSupplier.length} INDIVIDUAL accounts without suppliers.`);

  for (const account of individualAccountsWithoutSupplier) {
    const owner = account.users[0];
    if (!owner) {
      console.warn(`Account ${account.id} has no OWNER user. Skipping.`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.supplier.create({
        data: {
          name: account.name,
          type: 'INDIVIDUAL',
          integrationType: 'MANUAL',
          status: 'ACTIVE',
          active: true,
          financialStatus: 'ACTIVE',
          verificationStatus: 'PENDING',
          userId: owner.id,
          accountId: account.id,
          isDefault: true,
          planId: account.planId,
        },
      });

      await tx.account.update({
        where: { id: account.id },
        data: { onboardingStatus: 'COMPLETO' },
      });
    });
    console.log(`Fixed INDIVIDUAL account: ${account.name} (${account.id})`);
  }

  // 2. Fix COMPANY accounts with NO suppliers
  const companyAccountsWithoutSupplier = await prisma.account.findMany({
    where: {
      type: 'COMPANY',
      suppliers: {
        none: {},
      },
      onboardingStatus: { not: 'REQUIRES_SUPPLIER' },
    },
  });

  console.log(`Found ${companyAccountsWithoutSupplier.length} COMPANY accounts without suppliers needing status update.`);

  for (const account of companyAccountsWithoutSupplier) {
    await prisma.account.update({
      where: { id: account.id },
      data: { onboardingStatus: 'REQUIRES_SUPPLIER' },
    });
    console.log(`Updated COMPANY account status: ${account.name} (${account.id})`);
  }

  // 3. Fix COMPANY accounts WITH suppliers but wrong status
  const companyAccountsWithSupplier = await prisma.account.findMany({
    where: {
      type: 'COMPANY',
      suppliers: {
        some: {},
      },
      onboardingStatus: 'REQUIRES_SUPPLIER',
    },
  });

  console.log(`Found ${companyAccountsWithSupplier.length} COMPANY accounts with suppliers but wrong status.`);

  for (const account of companyAccountsWithSupplier) {
    await prisma.account.update({
      where: { id: account.id },
      data: { onboardingStatus: 'COMPLETO' },
    });
    console.log(`Corrected status for COMPANY account: ${account.name} (${account.id})`);
  }

  // 4. Fix INDIVIDUAL accounts WITH suppliers but wrong status
  const individualAccountsWithSupplier = await prisma.account.findMany({
    where: {
      type: 'INDIVIDUAL',
      suppliers: {
        some: {},
      },
      onboardingStatus: { not: 'COMPLETO' },
    },
  });

  console.log(`Found ${individualAccountsWithSupplier.length} INDIVIDUAL accounts with suppliers but wrong status.`);

  for (const account of individualAccountsWithSupplier) {
    await prisma.account.update({
      where: { id: account.id },
      data: { onboardingStatus: 'COMPLETO' },
    });
    console.log(`Corrected status for INDIVIDUAL account: ${account.name} (${account.id})`);
  }

  console.log('Onboarding data fix completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
