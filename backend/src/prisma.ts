import { PrismaClient } from '@prisma/client';

// Runtime Fix for Render/Supabase connection issues
// Force port 5432 (Session) instead of 6543 (Pooler) if misconfigured
const getDatabaseUrl = () => {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  if (url.includes(':6543')) {
    console.warn('[Prisma] Detected Transaction Pooler (6543). Switching to Session Mode (5432) for stability.');
    url = url.replace(':6543', ':5432').replace('?pgbouncer=true', '').replace('&pgbouncer=true', '');
    
    // Ensure timeouts
    if (!url.includes('connect_timeout')) {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}connect_timeout=30&pool_timeout=30`;
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
