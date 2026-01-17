import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dns from 'dns';

// --- DNS Monkey Patch for Render (IPv4) -> Supabase (IPv6) ---
// This forces Node.js to use the IPv4 address for the Supabase hostname.
// However, CRITICALLY, the 'pg' driver MUST send the original hostname in the SSL SNI header.
const SUPABASE_HOST = 'db.dimvlcrgaqeqarohpszl.supabase.co';

// CORRECTED REGION: us-east-1 (N. Virginia) - derived from IPv6 resolution and nslookup
// Old (Wrong): 52.67.1.88 (sa-east-1)
const REGIONAL_IPV4 = '44.208.221.186'; // aws-0-us-east-1.pooler.supabase.com

const PROJECT_REF = 'dimvlcrgaqeqarohpszl'; // Extracted from hostname

const originalLookup = dns.lookup;

(dns as any).lookup = (hostname: string, options: any, callback: any) => {
    let cb = callback;
    let opts = options;

    if (typeof options === 'function') {
        cb = options;
        opts = {};
    }

    if (hostname === SUPABASE_HOST) {
        const address = REGIONAL_IPV4;
        const family = 4;
        if (opts && opts.all) {
            return cb(null, [{ address, family }]);
        }
        return cb(null, address, family);
    }
    
    return originalLookup(hostname, opts, cb);
};

// --- Prisma Initialization ---

let connectionString = process.env.DATABASE_URL;

// FIX: Force username to be 'postgres.[PROJECT_REF]' if it's just 'postgres'
// This is required when connecting via the Pooler/IPv4 Load Balancer
if (connectionString && connectionString.includes('postgres:')) {
    // Check if username is just 'postgres' and replace it
    // Regex matches "postgres://" followed by "postgres" and a colon
    if (connectionString.includes('://postgres:')) {
        console.log('[Prisma] Patching username for Supabase Pooler compatibility...');
        connectionString = connectionString.replace('://postgres:', `://postgres.${PROJECT_REF}:`);
    }
}

// Configure Connection Pool with Explicit SNI
// This ensures that even though we connect to the IPv4 IP, 
// the SSL handshake says "I want to talk to db.dimvlcrgaqeqarohpszl.supabase.co"
const pool = new Pool({ 
    connectionString,
    connectionTimeoutMillis: 10000, 
    idleTimeoutMillis: 30000,       
    max: 10,
    ssl: {
        rejectUnauthorized: false, // Supabase uses self-signed in some contexts or we trust the CA
        servername: SUPABASE_HOST  // <--- THE CRITICAL FIX: Forces SNI to match the tenant host
    }
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ 
    adapter,
    log: ['error'] 
});

export default prisma;
