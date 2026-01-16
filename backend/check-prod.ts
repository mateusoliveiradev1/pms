import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkUser() {
  console.log('Checking user in production database...');
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'supplier_admin@pms.com' }
    });

    if (user) {
      console.log('✅ User found:', user.email, user.role);
    } else {
      console.log('❌ User NOT found. Seed required.');
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
