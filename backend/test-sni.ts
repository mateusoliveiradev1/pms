import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const password = encodeURIComponent('46257688884@Mateus');
const IP_ADDRESS = '52.67.1.88'; // aws-0-sa-east-1 (IPv4)
const SNI_HOST = 'db.dimvlcrgaqeqarohpszl.supabase.co';

// Construct URL with IP directly
const connectionString = `postgres://postgres:${password}@${IP_ADDRESS}:5432/postgres?connect_timeout=30`;

const pool = new Pool({
    connectionString,
    ssl: {
        servername: SNI_HOST, // Force SNI to match the project alias
        rejectUnauthorized: false // Supabase cert matches the alias, not the IP, so we might need this or CA
    }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error'] });

async function testSNI() {
    console.log(`Testing Connection to ${IP_ADDRESS} with SNI: ${SNI_HOST}`);
    try {
        const result = await prisma.$queryRaw`SELECT 1 as result`;
        console.log('✅ SNI Connection Successful!', result);
    } catch (e: any) {
        console.error('❌ SNI Connection Failed:', e.message);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

testSNI();
