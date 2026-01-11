import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  /* 
  // USERS ARE MANAGED BY SUPABASE AUTH NOW
  // Seed via Auth API or manually in Dashboard
  */
  
  // Seed Financial Settings
  await prisma.financialSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      defaultReleaseDays: 14,
      defaultMinWithdrawal: 50.0,
      defaultWithdrawalLimit: 4
    }
  });
  console.log('Financial Settings seeded');

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
      priorityLevel: 1,
      withdrawalLimit: 2,
      minWithdrawal: 100.0,
      releaseDays: 14
    },
    {
      id: 'pro',
      name: 'Plano Profissional',
      monthlyPrice: 99.90,
      cycleDays: 30,
      commissionPercent: 10.0,
      limitOrders: 1000,
      limitProducts: 1000,
      priorityLevel: 2,
      withdrawalLimit: 4,
      minWithdrawal: 50.0,
      releaseDays: 7
    },
    {
      id: 'enterprise',
      name: 'Plano Enterprise',
      monthlyPrice: 199.90,
      cycleDays: 30,
      commissionPercent: 8.0,
      limitOrders: 5000,
      limitProducts: 5000,
      priorityLevel: 3,
      withdrawalLimit: 8,
      minWithdrawal: 20.0,
      releaseDays: 2
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
        priorityLevel: p.priorityLevel,
        withdrawalLimit: p.withdrawalLimit,
        minWithdrawal: p.minWithdrawal,
        releaseDays: p.releaseDays
      },
      create: p
    });
  }
  
  console.log('Plans seeded successfully');

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30);

  /*
  // SUPPLIERS NEED A VALID AUTH USER ID (UUID) FROM SUPABASE
  // Skipping Supplier/Ledger seed for now.
  
  const supplier = await prisma.supplier.upsert({
    where: { id: 'supplier_test' },
    update: {
      name: 'Fornecedor Teste',
      integrationType: 'MANUAL',
      status: 'ACTIVE',
      userId: supplierUser.id,
      planId: 'basic',
      commissionRate: 12.0,
      walletBalance: 150.0,
      pendingBalance: 50.0,
      blockedBalance: 0.0,
      verificationStatus: 'VERIFIED',
      financialStatus: 'ACTIVE',
      nextBillingDate: endDate,
      billingName: 'Fornecedor Teste',
      billingDoc: '00.000.000/0001-00',
      billingAddress: 'Rua Teste, 123, Centro, São Paulo - SP',
      billingEmail: 'fornecedor@pms.com'
    },
    create: {
      id: 'supplier_test',
      name: 'Fornecedor Teste',
      integrationType: 'MANUAL',
      status: 'ACTIVE',
      userId: supplierUser.id,
      planId: 'basic',
      commissionRate: 12.0,
      walletBalance: 150.0,
      pendingBalance: 50.0,
      blockedBalance: 0.0,
      verificationStatus: 'VERIFIED',
      financialStatus: 'ACTIVE',
      nextBillingDate: endDate,
      billingName: 'Fornecedor Teste',
      billingDoc: '00.000.000/0001-00',
      billingAddress: 'Rua Teste, 123, Centro, São Paulo - SP',
      billingEmail: 'fornecedor@pms.com'
    },
  });

  const activeSub = await prisma.supplierSubscription.findFirst({
    where: { supplierId: supplier.id, status: 'ATIVA' }
  });

  if (!activeSub) {
    await prisma.supplierSubscription.create({
      data: {
        supplierId: supplier.id,
        planId: 'basic',
        startDate: now,
        endDate,
        status: 'ATIVA'
      }
    });
  }

  const existingTestRevenue = await prisma.financialLedger.findFirst({
    where: { supplierId: supplier.id, type: 'SALE_REVENUE', description: 'Crédito de teste' }
  });
  if (!existingTestRevenue) {
    await prisma.financialLedger.create({
      data: {
        type: 'SALE_REVENUE',
        amount: 200.0,
        supplierId: supplier.id,
        description: 'Crédito de teste',
        status: 'COMPLETED'
      }
    });
  }

  const existingTestCommission = await prisma.financialLedger.findFirst({
    where: { supplierId: supplier.id, type: 'SALE_COMMISSION', description: 'Comissão de teste' }
  });
  if (!existingTestCommission) {
    await prisma.financialLedger.create({
      data: {
        type: 'SALE_COMMISSION',
        amount: 20.0,
        supplierId: supplier.id,
        description: 'Comissão de teste',
        status: 'COMPLETED'
      }
    });
  }
  */
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
