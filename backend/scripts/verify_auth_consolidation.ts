import prisma from '../src/prisma';

async function verifyAuthConsolidation() {
  console.log('Verifying Auth Consolidation Logic...\n');

  const roles = ['SYSTEM_ADMIN', 'ACCOUNT_ADMIN', 'SUPPLIER_ADMIN', 'SUPPLIER_USER'];

  for (const role of roles) {
    console.log(`\nChecking Role: ${role}`);
    
    // Find a user with this role
    const user = await prisma.user.findFirst({
      where: { role },
      include: {
        account: true,
      }
    });

    if (!user) {
      console.log(`No user found with role ${role}. Skipping.`);
      continue;
    }

    console.log(`User Found: ${user.email} (${user.id})`);
    console.log(`DB Role: ${user.role}`);
    console.log(`Account ID: ${user.accountId}`);
    console.log(`Account Status: ${user.account?.onboardingStatus}`);

    // Logic replication
    let activeAccountId = user.accountId;
    let activeSupplierId = null;
    let onboardingStatus = 'PENDING';
    let accountStatus = user.account?.onboardingStatus;
    let accountType = user.account?.type;

    if (user.role === 'SUPPLIER_ADMIN' || user.role === 'SUPPLIER_USER') {
        const supplier = await prisma.supplier.findFirst({
            where: { userId: user.id },
            include: { account: true }
        });
        if (supplier) {
            console.log(`Linked Supplier Found: ${supplier.name} (${supplier.id})`);
            activeSupplierId = supplier.id;
            if (!activeAccountId) {
                activeAccountId = supplier.accountId;
                if (supplier.account) {
                    accountStatus = supplier.account.onboardingStatus;
                    accountType = supplier.account.type;
                }
            }
        } else {
            console.log('No linked supplier found.');
        }
    }

    if (user.role === 'SYSTEM_ADMIN') {
        onboardingStatus = 'COMPLETED';
    } else if (accountStatus === 'COMPLETO') {
        onboardingStatus = 'COMPLETED';
    } else if (accountStatus === 'REQUIRES_SUPPLIER' && activeSupplierId) {
        onboardingStatus = 'PENDING'; // As per my implementation
    }

    console.log('--- EXPECTED /me RESPONSE ---');
    console.log({
        role: user.role,
        onboardingStatus,
        activeAccountId,
        activeSupplierId,
        accountType
    });
  }
}

verifyAuthConsolidation()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
