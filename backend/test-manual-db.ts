import { PrismaClient } from '@prisma/client';

const password = encodeURIComponent('46257688884@Mateus');
// Testing Regional Pooler with User.Tenant format
const connectionString = `postgres://postgres.dimvlcrgaqeqarohpszl:${password}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`;

console.log('Testing Manual Pooler Connection:', connectionString.replace(password, '****'));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString
    }
  }
});

async function testManualConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ Connection Successful!', result);
  } catch (error: any) {
    console.error('❌ Connection Failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testManualConnection();
