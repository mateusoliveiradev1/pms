import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dns from 'dns';

// --- DNS Monkey Patch for Render (IPv4) -> Supabase (IPv6) ---
// This forces Node.js to use the IPv4 address for the Supabase hostname,
// allowing the 'pg' driver to connect successfully from Render's IPv4-only environment
// while still passing the correct hostname for SNI (Server Name Indication).

const SUPABASE_HOST = 'db.dimvlcrgaqeqarohpszl.supabase.co';
const REGIONAL_IPV4 = '52.67.1.88'; // AWS sa-east-1 Load Balancer

const originalLookup = dns.lookup;

(dns as any).lookup = (hostname: string, options: any, callback: any) => {
    let cb = callback;
    let opts = options;

    // Handle optional options argument (Node.js signature)
    if (typeof options === 'function') {
        cb = options;
        opts = {};
    }

    if (hostname === SUPABASE_HOST) {
        // console.log(`[DNS Patch] Intercepting lookup for ${hostname} -> ${REGIONAL_IPV4}`);
        const address = REGIONAL_IPV4;
        const family = 4;

        // Handle 'all: true' option (returns array) - Critical for some pg versions
        if (opts && opts.all) {
            return cb(null, [{ address, family }]);
        }
        
        return cb(null, address, family);
    }
    
    return originalLookup(hostname, opts, cb);
};

// --- Prisma Initialization ---

const connectionString = process.env.DATABASE_URL;

// Configure Connection Pool
const pool = new Pool({ 
    connectionString,
    connectionTimeoutMillis: 10000, // 10s timeout
    idleTimeoutMillis: 30000,       // 30s idle
    max: 10                         // Max 10 connections
});

// Initialize Adapter (Version 5.22.0 compatible)
const adapter = new PrismaPg(pool);

// Initialize Client
const prisma = new PrismaClient({ 
    adapter,
    log: ['error'] // Keep logs clean in production
});

export default prisma;
