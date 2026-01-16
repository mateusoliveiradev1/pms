import { PrismaClient } from '@prisma/client';
import dns from 'dns';

// Mock the Patch
const originalLookup = dns.lookup;
const SUPABASE_HOST = 'db.dimvlcrgaqeqarohpszl.supabase.co';
const REGIONAL_IPV4 = '52.67.1.88'; // aws-0-sa-east-1

(dns as any).lookup = (hostname: string, options: any, callback: any) => {
    if (hostname === SUPABASE_HOST) {
        console.log(`[DNS Patch] Intercepting lookup for ${hostname} -> ${REGIONAL_IPV4}`);
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        return callback(null, REGIONAL_IPV4, 4);
    }
    return originalLookup(hostname, options, callback);
};

// Use the ALIAS (which relies on the patch to resolve to IPv4)
const password = encodeURIComponent('46257688884@Mateus');
// Testing Port 6543 (Pooler)
const connectionString = `postgres://postgres:${password}@db.dimvlcrgaqeqarohpszl.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString
    }
  }
});

async function testPatch() {
  console.log('Testing DNS Patch Connection...');
  try {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ Connection Successful!', result);
  } catch (error: any) {
    console.error('❌ Connection Failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPatch();
