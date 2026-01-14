import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting conflicting user admin@pms.com...');
  
  const deleted = await prisma.user.deleteMany({
    where: {
      email: 'admin@pms.com'
    }
  });

  console.log(`✅ Deleted ${deleted.count} user(s). Email is now free for re-registration.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
