import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pms.com' },
    update: {},
    create: {
      email: 'admin@pms.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log({ admin });

  // Seed Plans
  const plans = [
    {
      id: 'basic',
      name: 'Plano Básico',
      monthlyPrice: 49.90,
      cycleDays: 30,
      commissionPercent: 12.0,
      limitOrders: 200,
      limitProducts: 200,
      priorityLevel: 1
    },
    {
      id: 'pro',
      name: 'Plano Profissional',
      monthlyPrice: 99.90,
      cycleDays: 30,
      commissionPercent: 10.0,
      limitOrders: 1000,
      limitProducts: 1000,
      priorityLevel: 2
    },
    {
      id: 'enterprise',
      name: 'Plano Enterprise',
      monthlyPrice: 199.90,
      cycleDays: 30,
      commissionPercent: 8.0,
      limitOrders: 5000,
      limitProducts: 5000,
      priorityLevel: 3
    }
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        monthlyPrice: p.monthlyPrice,
        cycleDays: p.cycleDays,
        commissionPercent: p.commissionPercent,
        limitOrders: p.limitOrders,
        limitProducts: p.limitProducts,
        priorityLevel: p.priorityLevel
      },
      create: p
    });
  }
  
  console.log('Plans seeded successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
