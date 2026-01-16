import { PrismaClient } from '@prisma/client';

// URL for Transaction Pooler (6543) with pgBouncer mode and minimal connection limit
const connectionString = "postgresql://postgres:46257688884%40Mateus@db.dimvlcrgaqeqarohpszl.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString
    }
  }
});

async function testPooler() {
  console.log('Testing connection to Supabase Transaction Pooler (6543)...');
  console.log('URL:', connectionString.replace(/:[^:]*@/, ':****@')); // Hide password in logs

  try {
    // Try a simple query
    const start = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    const duration = Date.now() - start;

    console.log('✅ Connection Successful!');
    console.log(`⏱️ Latency: ${duration}ms`);
    console.log('📦 Result:', result);
    
    // Check if we can find the user (ensuring read access works)
    const user = await prisma.user.findUnique({
        where: { email: 'supplier_admin@pms.com' },
        select: { id: true, email: true }
    });
    console.log('👤 User Check:', user ? 'Found' : 'Not Found');

  } catch (error: any) {
    console.error('❌ Connection Failed:', error.message);
    if (error.code) console.error('Error Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testPooler();
