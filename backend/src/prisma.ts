import { PrismaClient } from '@prisma/client';

// Runtime Fix for Render/Supabase IPv6 issues
// Force usage of Regional IPv4 Pooler Hostname
const getDatabaseUrl = () => {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // If using the alias host which resolves to IPv6 only
  if (url.includes('db.dimvlcrgaqeqarohpszl.supabase.co')) {
    console.warn('[Prisma] Replacing Supabase Alias with Regional IPv4 Pooler Host');
    // Replace with SA East 1 Pooler (IPv4 compatible)
    url = url.replace('db.dimvlcrgaqeqarohpszl.supabase.co', 'aws-0-sa-east-1.pooler.supabase.com');
    
    // Ensure port is 6543 (Pooler) and pgbouncer is enabled
    if (!url.includes(':6543')) {
        url = url.replace(':5432', ':6543');
    }
    if (!url.includes('pgbouncer=true')) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}pgbouncer=true`;
    }
    // Remove connection_limit if present to let pooler handle it, or keep it small
    if (!url.includes('connection_limit')) {
         url += '&connection_limit=1';
    }
  }
  return url;
};

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

export default prisma;
