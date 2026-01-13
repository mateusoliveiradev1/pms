import prisma from '../prisma';

export const CommissionService = {
  getCommissionRateForSupplier: async (supplierId: string): Promise<number> => {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { account: { include: { plan: true } } }
    });
    if (!supplier) return 10;
    if (supplier.supplierType === 'INTERNAL') return 0;

    const accountId = supplier.accountId;

    const supplierOverride = await prisma.supplierCommission.findUnique({
      where: { supplierId_accountId: { supplierId, accountId } }
    });
    if (supplierOverride) return supplierOverride.commissionRate;

    if (supplier.commissionRate !== undefined && supplier.commissionRate !== null) {
      return supplier.commissionRate;
    }

    if (supplier.account?.defaultCommissionRate !== undefined && supplier.account?.defaultCommissionRate !== null) {
      return supplier.account.defaultCommissionRate!;
    }

    return supplier.account?.plan?.commissionPercent ?? 10;
  },

  getCommissionRate: async (accountId: string, supplierId: string): Promise<number> => {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { account: { include: { plan: true } } }
    });
    if (!supplier) return 10;
    if (supplier.supplierType === 'INTERNAL') return 0;

    const supplierOverride = await prisma.supplierCommission.findUnique({
      where: { supplierId_accountId: { supplierId, accountId } }
    });
    if (supplierOverride) return supplierOverride.commissionRate;

    if (supplier.account?.defaultCommissionRate !== undefined && supplier.account?.defaultCommissionRate !== null) {
      return supplier.account.defaultCommissionRate!;
    }

    return supplier.account?.plan?.commissionPercent ?? supplier.commissionRate ?? 10;
  }
};
