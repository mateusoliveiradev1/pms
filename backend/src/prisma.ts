import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dns from 'dns';

// DNS Patch: Force IPv4 for Supabase Alias to bypass Render IPv6 issues
const originalLookup = dns.lookup;
const SUPABASE_HOST = 'db.dimvlcrgaqeqarohpszl.supabase.co';
const REGIONAL_IPV4 = '52.67.1.88'; // aws-0-sa-east-1.pooler.supabase.com

// Robust DNS Patch that handles all argument permutations
(dns as any).lookup = (hostname: string, options: any, callback: any) => {
    let cb = callback;
    let opts = options;

    // Handle optional options argument
    if (typeof options === 'function') {
        cb = options;
        opts = {};
    }

    if (hostname === SUPABASE_HOST) {
        console.log(`[DNS Patch] Intercepting lookup for ${hostname} -> ${REGIONAL_IPV4}`);
        // Return IPv4 address immediately
        if (cb) {
             return cb(null, REGIONAL_IPV4, 4);
        }
    }
    
    return originalLookup(hostname, opts, cb);
};

// Use pg driver (which uses Node's DNS/net) instead of Rust Engine
const connectionString = process.env.DATABASE_URL;

const adapter = connectionString ? new PrismaPg(new Pool({ 
    connectionString,
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
