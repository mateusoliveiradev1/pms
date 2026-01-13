import prisma from '../src/prisma';
import { CommissionService } from '../src/services/commissionService';
import { FinancialService } from '../src/services/financialService';

async function run() {
  const now = new Date();
  const account = await prisma.account.create({
    data: {
      name: 'Smoke Account',
      email: 'smoke@account.local',
      type: 'COMPANY',
      plan: {
        create: {
          name: 'Pro',
          monthlyPrice: 99,
          cycleDays: 30,
          maxSuppliers: 5,
          maxUsers: 10,
          limitProducts: 1000,
          limitOrders: 5000,
          commissionPercent: 12,
          priorityLevel: 2,
          withdrawalLimit: 4,
          minWithdrawal: 50,
          releaseDays: 14,
          maxInternalSuppliers: 3,
          maxExternalSuppliers: 2
        }
      }
    },
    include: { plan: true }
  });

  const supplierInternal = await prisma.supplier.create({
    data: {
      name: 'Internal Supplier',
      type: 'COMPANY',
      supplierType: 'INTERNAL',
      integrationType: 'MANUAL',
      status: 'ACTIVE',
      active: true,
      accountId: account.id,
      planId: account.planId,
      financialStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      commissionRate: 0
    }
  });

  const supplierExternal = await prisma.supplier.create({
    data: {
      name: 'External Seller',
      type: 'COMPANY',
      supplierType: 'EXTERNAL',
      integrationType: 'MANUAL',
      status: 'ACTIVE',
      active: true,
      accountId: account.id,
      planId: account.planId,
      financialStatus: 'ACTIVE',
      verificationStatus: 'APPROVED',
      commissionRate: 15
    }
  });

  await prisma.supplierCommission.create({
    data: {
      supplierId: supplierExternal.id,
      accountId: account.id,
      commissionRate: 18,
      overridePlanRate: true
    }
  });

  const product = await prisma.product.create({
    data: {
      sku: 'SKU-SMOKE-' + Date.now(),
      name: 'Smoke Product',
      price: 100,
      stockAvailable: 100,
      suppliers: {
        create: [{
          supplierId: supplierExternal.id,
          externalId: 'EXT-1',
          price: 60,
          stock: 50,
          virtualStock: 50,
          safetyStock: 0
        }]
      }
    }
  });

  const orderExternal = await prisma.order.create({
    data: {
      orderNumber: 'ORD-EXT-' + Date.now(),
      supplierId: supplierExternal.id,
      status: 'PENDING',
      totalAmount: 200,
      items: {
        create: [{
          productId: product.id,
          sku: product.sku,
          quantity: 2,
          unitPrice: 100,
          total: 200
        }]
      }
    }
  });

  const orderInternal = await prisma.order.create({
    data: {
      orderNumber: 'ORD-INT-' + Date.now(),
      supplierId: supplierInternal.id,
      status: 'PENDING',
      totalAmount: 200,
      items: {
        create: [{
          productId: product.id,
          sku: product.sku,
          quantity: 2,
          unitPrice: 100,
          total: 200
        }]
      }
    }
  });

  const extId = 'ext-' + Date.now();
  const intId = 'int-' + Date.now();
  const rateExt = await CommissionService.getCommissionRateForSupplier(supplierExternal.id);
  const calcExt = FinancialService.calculateOrderFinancials(200, rateExt, 0);
  const rateInt = await CommissionService.getCommissionRateForSupplier(supplierInternal.id);
  const calcInt = FinancialService.calculateOrderFinancials(200, rateInt, 0);
  const rel = new Date();
  rel.setDate(rel.getDate() + 14);
  await prisma.financialLedger.create({
    data: { supplierId: supplierExternal.id, type: 'ORDER_PAYMENT', amount: 200, status: 'COMPLETED', referenceId: orderExternal.id, description: 'Pagamento Pedido Smoke Ext' }
  });
  if (calcExt.platformCommission > 0) {
    await prisma.financialLedger.create({
      data: { supplierId: supplierExternal.id, type: 'PLATFORM_COMMISSION', amount: -calcExt.platformCommission, status: 'COMPLETED', referenceId: orderExternal.id, description: 'Comissão Smoke Ext' }
    });
  }
  await prisma.financialLedger.create({
    data: { supplierId: supplierExternal.id, type: 'ORDER_CREDIT_PENDING', amount: calcExt.supplierPayout, status: 'PENDING', referenceId: orderExternal.id, description: 'Crédito Smoke Ext', releaseDate: rel }
  });
  await prisma.supplier.update({ where: { id: supplierExternal.id }, data: { pendingBalance: { increment: calcExt.supplierPayout } } });
  await prisma.financialLedger.create({
    data: { supplierId: supplierInternal.id, type: 'ORDER_PAYMENT', amount: 200, status: 'COMPLETED', referenceId: orderInternal.id, description: 'Pagamento Pedido Smoke Int' }
  });
  if (calcInt.platformCommission > 0) {
    await prisma.financialLedger.create({
      data: { supplierId: supplierInternal.id, type: 'PLATFORM_COMMISSION', amount: -calcInt.platformCommission, status: 'COMPLETED', referenceId: orderInternal.id, description: 'Comissão Smoke Int' }
    });
  }
  await prisma.financialLedger.create({
    data: { supplierId: supplierInternal.id, type: 'ORDER_CREDIT_PENDING', amount: calcInt.supplierPayout, status: 'PENDING', referenceId: orderInternal.id, description: 'Crédito Smoke Int', releaseDate: rel }
  });
  await prisma.supplier.update({ where: { id: supplierInternal.id }, data: { pendingBalance: { increment: calcInt.supplierPayout } } });

  const ledgerExternal = await prisma.financialLedger.findMany({
    where: { supplierId: supplierExternal.id },
    orderBy: { createdAt: 'asc' }
  });
  const ledgerInternal = await prisma.financialLedger.findMany({
    where: { supplierId: supplierInternal.id },
    orderBy: { createdAt: 'asc' }
  });

  const commissionExt = ledgerExternal.filter(l => l.type === 'PLATFORM_COMMISSION').reduce((a, b) => a + b.amount, 0);
  const commissionInt = ledgerInternal.filter(l => l.type === 'PLATFORM_COMMISSION').reduce((a, b) => a + b.amount, 0);
  const creditExt = ledgerExternal.filter(l => l.type === 'ORDER_CREDIT_PENDING').reduce((a, b) => a + b.amount, 0);
  const creditInt = ledgerInternal.filter(l => l.type === 'ORDER_CREDIT_PENDING').reduce((a, b) => a + b.amount, 0);

  const accountMetricsGMV = await prisma.order.aggregate({
    where: { supplierId: { in: [supplierInternal.id, supplierExternal.id] }, status: { not: 'CANCELLED' } },
    _sum: { totalAmount: true }
  });

  console.log(JSON.stringify({
    accountId: account.id,
    supplierExternal: { id: supplierExternal.id, commission: commissionExt, credit: creditExt },
    supplierInternal: { id: supplierInternal.id, commission: commissionInt, credit: creditInt },
    gmvTotal: accountMetricsGMV._sum.totalAmount || 0
  }, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
