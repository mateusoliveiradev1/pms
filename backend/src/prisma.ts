import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dns from 'dns';

// --- DNS Monkey Patch for Render (IPv4) -> Supabase (IPv6) ---
// This forces Node.js to use the IPv4 address for the Supabase hostname.
// However, CRITICALLY, the 'pg' driver MUST send the original hostname in the SSL SNI header.
const SUPABASE_HOST = 'db.dimvlcrgaqeqarohpszl.supabase.co';
const REGIONAL_IPV4 = '52.67.1.88'; // AWS sa-east-1 Load Balancer

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

const connectionString = process.env.DATABASE_URL;

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
