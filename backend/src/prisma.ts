import { PrismaClient } from '@prisma/client';

// Standard Prisma Client instantiation
// relying on DATABASE_URL from environment
const prisma = new PrismaClient({
  log: ['error'],
});

export default prisma;
