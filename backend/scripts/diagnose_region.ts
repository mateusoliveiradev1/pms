import { PrismaClient } from '@prisma/client';

const PROJECT_REF = 'dimvlcrgaqeqarohpszl';
const PASSWORD = encodeURIComponent('46257688884@Mateus');

const REGIONS = [
    { name: 'US East 1 (N. Virginia)', host: 'aws-0-us-east-1.pooler.supabase.com' },
    { name: 'US West 1 (N. California)', host: 'aws-0-us-west-1.pooler.supabase.com' },
    { name: 'US West 2 (Oregon)', host: 'aws-0-us-west-2.pooler.supabase.com' },
    { name: 'EU Central 1 (Frankfurt)', host: 'aws-0-eu-central-1.pooler.supabase.com' },
    { name: 'EU West 1 (Ireland)', host: 'aws-0-eu-west-1.pooler.supabase.com' },
    { name: 'EU West 2 (London)', host: 'aws-0-eu-west-2.pooler.supabase.com' },
    { name: 'EU West 3 (Paris)', host: 'aws-0-eu-west-3.pooler.supabase.com' },
    { name: 'AP Southeast 1 (Singapore)', host: 'aws-0-ap-southeast-1.pooler.supabase.com' },
    { name: 'AP Southeast 2 (Sydney)', host: 'aws-0-ap-southeast-2.pooler.supabase.com' },
    { name: 'AP Northeast 1 (Tokyo)', host: 'aws-0-ap-northeast-1.pooler.supabase.com' },
    { name: 'AP Northeast 2 (Seoul)', host: 'aws-0-ap-northeast-2.pooler.supabase.com' },
    { name: 'SA East 1 (São Paulo)', host: 'aws-0-sa-east-1.pooler.supabase.com' },
    { name: 'CA Central 1 (Canada)', host: 'aws-0-ca-central-1.pooler.supabase.com' },
    { name: 'AP South 1 (Mumbai)', host: 'aws-0-ap-south-1.pooler.supabase.com' }
];

async function testRegion(region: { name: string, host: string }) {
    console.log(`\n🌎 Testando região: ${region.name}`);
    const url = `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@${region.host}:6543/postgres?pgbouncer=true`;
    console.log(`   URL: postgresql://postgres.${PROJECT_REF}:****@${region.host}:6543/postgres?pgbouncer=true`);

    const prisma = new PrismaClient({
        datasources: { db: { url } },
        log: []
    });

    try {
        await prisma.$connect();
        // Tenta uma query simples
        await prisma.$queryRaw`SELECT 1`;
        console.log(`   ✅ SUCESSO! O projeto está nesta região.`);
        return { success: true, url };
    } catch (e: any) {
        const msg = e.message || '';
        if (msg.includes('Tenant or user not found')) {
            console.log(`   ❌ Falha: Tenant não encontrado (Provavelmente não é a região correta).`);
        } else {
            console.log(`   ❌ Falha: ${msg.split('\n').pop()}`);
        }
        return { success: false };
    } finally {
        await prisma.$disconnect();
    }
}

async function run() {
    console.log('🕵️ Diagnóstico de Região Supabase');
    
    for (const region of REGIONS) {
        const result = await testRegion(region);
        if (result.success) {
            console.log('\n🎉 REGIÃO CORRETA IDENTIFICADA!');
            console.log(`👉 Use esta URL no Render:`);
            console.log(result.url!.replace(PASSWORD, '46257688884%40Mateus'));
            process.exit(0);
        }
    }

    console.log('\n😭 Nenhuma região aceitou a conexão.');
    process.exit(1);
}

run();
