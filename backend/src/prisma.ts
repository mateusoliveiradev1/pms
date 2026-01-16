import { PrismaClient } from '@prisma/client';
import dns from 'dns';

// Debug DNS Resolution for Supabase
const url = process.env.DATABASE_URL;
if (url) {
    try {
        const hostname = new URL(url).hostname;
        console.log(`[Prisma] Resolving DNS for: ${hostname}`);
        dns.lookup(hostname, (err, address, family) => {
            if (err) console.error('[Prisma] DNS Lookup Failed:', err);
            else console.log(`[Prisma] DNS Resolved: ${address} (IPv${family})`);
        });
    } catch (e) {
        console.error('[Prisma] Invalid Database URL format');
    }
}

const prisma = new PrismaClient();

export default prisma;
