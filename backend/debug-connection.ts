import { PrismaClient } from '@prisma/client';

const PASSWORD = encodeURIComponent('46257688884@Mateus');
const TENANT = 'dimvlcrgaqeqarohpszl';
const HOST_IPV4 = 'aws-0-sa-east-1.pooler.supabase.com'; // Resolved to 52.67.1.88
const HOST_ALIAS = 'db.dimvlcrgaqeqarohpszl.supabase.co';

const combinations = [
    {
        name: 'Pooler Regional (6543) - User.Tenant',
        url: `postgres://postgres.${TENANT}:${PASSWORD}@${HOST_IPV4}:6543/postgres?pgbouncer=true`
    },
    {
        name: 'Pooler Regional (5432) - User.Tenant',
        url: `postgres://postgres.${TENANT}:${PASSWORD}@${HOST_IPV4}:5432/postgres?connect_timeout=10`
    },
    {
        name: 'Direct IP (5432) - User.Tenant',
        url: `postgres://postgres.${TENANT}:${PASSWORD}@52.67.1.88:5432/postgres?connect_timeout=10`
    },
    {
        name: 'Direct IP (5432) - Simple User',
        url: `postgres://postgres:${PASSWORD}@52.67.1.88:5432/postgres?connect_timeout=10`
    },
     {
        name: 'Pooler Regional (6543) - Simple User',
        url: `postgres://postgres:${PASSWORD}@${HOST_IPV4}:6543/postgres?pgbouncer=true`
    }
];

async function testCombination(combo: any) {
    console.log(`\n🧪 Testing: ${combo.name}`);
    console.log(`   URL: ${combo.url.replace(PASSWORD, '****')}`);
    
    const prisma = new PrismaClient({
        datasources: { db: { url: combo.url } },
        log: ['error']
    });

    try {
        await prisma.$connect();
        const result = await prisma.$queryRaw`SELECT 1 as result`;
        console.log('   ✅ SUCCESS!');
        return true;
    } catch (e: any) {
        console.log('   ❌ FAILED:', e.message.split('\n').pop()); // Log last line of error
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

async function run() {
    for (const combo of combinations) {
        if (await testCombination(combo)) {
            console.log('\n🎉 FOUND WORKING CONFIGURATION!');
            process.exit(0);
        }
    }
    console.log('\n😭 ALL COMBINATIONS FAILED.');
}

run();
