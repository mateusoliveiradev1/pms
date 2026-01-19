import { PrismaClient } from '@prisma/client';

// Tentativa de conexão usando IP direto da AWS (SA-East-1)
// IP obtido via ping/nslookup: 54.94.90.106
// User: postgres (Padrão) - Supabase Pooler deve rotear via SNI (se funcionar) ou User Mapping
// Se SNI falhar, tentar User Mapping: postgres.dimvlcrgaqeqarohpszl

const HOST_IP = '54.94.90.106'; 
const PASSWORD = encodeURIComponent('46257688884@Mateus');
const PROJECT_REF = 'dimvlcrgaqeqarohpszl';

const variants = [
    {
        name: 'Direct IP - Port 6543 - User Mapping',
        url: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@${HOST_IP}:6543/postgres?pgbouncer=true`
    },
    {
        name: 'Direct IP - Port 5432 - User Mapping',
        url: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@${HOST_IP}:5432/postgres`
    }
];

async function testVariant(v: any) {
    console.log(`\n🧪 Testando: ${v.name}`);
    console.log(`   URL: ${v.url.replace(PASSWORD, '****')}`);

    const prisma = new PrismaClient({
        datasources: { db: { url: v.url } },
        log: []
    });

    try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        console.log(`   ✅ SUCESSO!`);
        return true;
    } catch (e: any) {
        console.log(`   ❌ Falha: ${e.message.split('\n').pop()}`);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

async function run() {
    for (const v of variants) {
        if (await testVariant(v)) {
            console.log('\n🎉 SUCESSO! Use esta URL.');
            process.exit(0);
        }
    }
    console.log('\n😭 Todas as tentativas falharam.');
}

run();
