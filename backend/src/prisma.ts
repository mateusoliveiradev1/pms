import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dns from 'dns';

// DNS Patch: Force IPv4 for Supabase Alias to bypass Render IPv6 issues
const originalLookup = dns.lookup;
const SUPABASE_HOST = 'db.dimvlcrgaqeqarohpszl.supabase.co';
const REGIONAL_IPV4 = '52.67.1.88'; // aws-0-sa-east-1.pooler.supabase.com

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

// Use pg driver (which uses Node's DNS/net) instead of Rust Engine
// This ensures our DNS patch is respected
const connectionString = process.env.DATABASE_URL;

// Ensure we only use adapter if URL is available
const adapter = connectionString ? new PrismaPg(new Pool({ 
    connectionString,
    // Increase timeouts for pooler
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
})) : null;

const prismaOptions: any = {
    log: ['error']
};

if (adapter) {
    prismaOptions.adapter = adapter;
}

const prisma = new PrismaClient(prismaOptions);

export default prisma;
