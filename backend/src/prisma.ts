import { PrismaClient } from '@prisma/client';
import dns from 'dns';

// DNS Patch: Force IPv4 for Supabase Alias to bypass Render IPv6 issues
// This keeps the original hostname in the connection string (important for SNI/Auth)
// but resolves it to the IPv4 address of the regional pooler.
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
        // Return IPv4 address
        return callback(null, REGIONAL_IPV4, 4);
    }
    return originalLookup(hostname, options, callback);
};

const prisma = new PrismaClient();

export default prisma;
