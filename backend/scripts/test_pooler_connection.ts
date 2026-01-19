import { PrismaClient } from '@prisma/client';

// Configuração IPv4 Explícita para o Supavisor
// Host: aws-0-sa-east-1.pooler.supabase.com (Endereço físico do pooler)
// User: postgres.dimvlcrgaqeqarohpszl (Tenant explícito para roteamento)
// Port: 6543 (Transaction Mode)
// SSL: pgbouncer=true desabilita prepared statements, essencial para Transaction Mode

const DATABASE_URL = "postgresql://postgres.dimvlcrgaqeqarohpszl:46257688884%40Mateus@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: DATABASE_URL
        }
    },
    log: ['info', 'warn', 'error']
});

async function testConnection() {
    console.log('🧪 Testando conexão IPv4 Explícita...');
    console.log(`URL: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);

    try {
        await prisma.$connect();
        console.log('✅ Conectado ao Pooler IPv4!');
        
        const user = await prisma.user.findFirst({ select: { id: true, email: true } });
        console.log('✅ Query OK:', user);
        
    } catch (e: any) {
        console.error('❌ Erro:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
