import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Configuration for Supabase IPv4 Bypass
const SUPABASE_HOST = 'db.dimvlcrgaqeqarohpszl.supabase.co';
const REGIONAL_IPV4 = '52.67.1.88'; // aws-0-sa-east-1.pooler.supabase.com

const connectionString = process.env.DATABASE_URL;

let adapter: PrismaPg | null = null;

if (connectionString) {
    // If we are on Render (or production) and using the problematic Supabase Host
    if (connectionString.includes(SUPABASE_HOST)) {
        console.log('[Prisma] Configuring SNI Bypass for Render/Supabase IPv6 issue');
        
        // Construct a modified connection string that points to the IP directly
        // but keeps user/pass/db intact.
        // NOTE: We replace the HOSTNAME with the IP in the string passed to Pool
        // But we MUST enforce SNI in the ssl config below.
        const ipConnectionString = connectionString.replace(SUPABASE_HOST, REGIONAL_IPV4);

        const pool = new Pool({ 
            connectionString: ipConnectionString,
            ssl: {
                servername: SUPABASE_HOST, // CRITICAL: This tells Supavisor which project we want
                rejectUnauthorized: false // Supabase cert matches the alias, not the IP
            },
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000
        });
        
        adapter = new PrismaPg(pool);
    } else {
        // Standard connection for local dev or other databases
        adapter = new PrismaPg(new Pool({ 
            connectionString,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000
        }));
    }
}

const prismaOptions: any = {
    log: ['error']
};

if (adapter) {
    prismaOptions.adapter = adapter;
}

const prisma = new PrismaClient(prismaOptions);

export default prisma;
