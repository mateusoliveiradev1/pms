
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email.');
    process.exit(1);
  }

  console.log(`Deleting user with email: ${email}`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found.');
    return;
  }

  // Delete related data first if necessary (Cascading might handle it but let's be safe)
  // Deleting the User should cascade to Supplier if set up, but let's check schema.
  // User -> Account (relation is on User: accountId)
  // Supplier -> User (relation is on Supplier: userId)
  
  // We should probably delete the Account too if it's an Individual account created for this user.
  const accountId = user.accountId;

  // Delete Suppliers linked to this user
  await prisma.supplier.deleteMany({ where: { userId: user.id } });

  // Delete User
  await prisma.user.delete({ where: { id: user.id } });

  // Delete Account if it was an Individual account and has no other users (simplified)
  if (accountId) {
      // Check if account has other users
      const count = await prisma.user.count({ where: { accountId } });
      if (count === 0) {
          await prisma.account.delete({ where: { id: accountId } });
          console.log(`Deleted associated account ${accountId}`);
      }
  }

  console.log(`Deleted user ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
