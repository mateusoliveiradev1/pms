import { PrismaClient } from '@prisma/client';

const PROJECT_REF = 'dimvlcrgaqeqarohpszl';
const PASSWORD = encodeURIComponent('46257688884@Mateus');
const HOST_US_EAST_1 = 'aws-0-us-east-1.pooler.supabase.com';

const configs = [
    {
        name: 'US-East-1 Pooler (6543) - Transaction Mode',
        url: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@${HOST_US_EAST_1}:6543/postgres?pgbouncer=true`
    },
    {
        name: 'US-East-1 Pooler (5432) - Session Mode',
        url: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@${HOST_US_EAST_1}:5432/postgres`
    }
];

async function testConfig(config: any) {
    console.log(`\n🧪 Testing: ${config.name}`);
    console.log(`   URL: ${config.url.replace(PASSWORD, '****')}`);
    
    const prisma = new PrismaClient({
        datasources: { db: { url: config.url } },
        log: []
    });

    try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        console.log('   ✅ SUCCESS!');
        return true;
    } catch (e: any) {
        console.log(`   ❌ FAILED: ${e.message.split('\n').pop()}`);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

async function run() {
    console.log('🕵️ Validating US-East-1 Connection...');
    
    for (const config of configs) {
        if (await testConfig(config)) {
            console.log('\n🎉 FOUND WORKING CONFIGURATION!');
            console.log(`👉 Use this URL in Render:`);
            console.log(config.url.replace(PASSWORD, '46257688884%40Mateus'));
            process.exit(0);
        }
    }
    console.log('\n😭 ALL COMBINATIONS FAILED.');
}

run();
