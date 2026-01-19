import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Configuração para provar que SNI é necessário
// IP: 44.208.221.186 (AWS US-East-1 Pooler IPv4)
// Host (SNI): db.dimvlcrgaqeqarohpszl.supabase.co
// User: postgres (Padrão)

const connectionString = "postgresql://postgres:46257688884%40Mateus@54.94.90.106:6543/postgres?pgbouncer=true";

async function testSNI() {
    console.log('🧪 Testando conexão com IP Manual + SNI Explicito...');
    
    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false,
            servername: 'db.dimvlcrgaqeqarohpszl.supabase.co' // <--- O SEGREDO
        }
    });

    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter, log: [] });

    try {
        await prisma.$connect();
        console.log('✅ SUCESSO! Conexão estabelecida com SNI.');
        
        const user = await prisma.user.findFirst({ select: { id: true, email: true } });
        console.log('✅ Query OK:', user);
        return true;
    } catch (e: any) {
        console.log('❌ Falha:', e.message);
        return false;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

testSNI();
