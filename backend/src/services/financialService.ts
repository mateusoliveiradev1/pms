import { 
  PrismaClient, 
  Prisma, 
  Supplier, 
  SupplierSubscription, 
  Plan, 
  FinancialLedger, 
  WithdrawalRequest, 
  Order 
} from '@prisma/client';

const prisma = new PrismaClient();

interface FinancialCalculation {
  marketplaceFee: number;
  platformCommission: number;
  supplierPayout: number;
}

interface SupplierWallet {
  balances: {
    available: number;
    pending: number;
    blocked: number;
  };
  status: {
    verified: boolean;
    active: boolean;
  };
  history: FinancialLedger[];
  withdrawals: WithdrawalRequest[];
}

interface AdminDashboardStats {
  revenue: {
    commissions: number;
    subscriptions: number;
    total: number;
  };
  pendingWithdrawals: number;
}

export const FinancialService = {
  // Returns active subscription for a supplier
  getActiveSubscription: async (supplierId: string): Promise<(SupplierSubscription & { plan: Plan }) | null> => {
    const now = new Date();
    return prisma.supplierSubscription.findFirst({
      where: { supplierId, status: 'ATIVA', endDate: { gt: now } },
      include: { plan: true }
    });
  },

  /**
   * Calculates the financial split for an order
   */
  calculateOrderFinancials: (
    totalAmount: number,
    commissionRatePercentage: number,
    marketplaceFeeValue: number = 0
  ): FinancialCalculation => {
    const netAmount = totalAmount - marketplaceFeeValue;
    const platformCommission = netAmount * (commissionRatePercentage / 100);
    const supplierPayout = netAmount - platformCommission;

    return {
      marketplaceFee: marketplaceFeeValue,
      platformCommission: parseFloat(platformCommission.toFixed(2)),
      supplierPayout: parseFloat(supplierPayout.toFixed(2))
    };
  },

  // ==========================================
  // CARTEIRA DO FORNECEDOR (SUPPLIER WALLET)
  // ==========================================

  processReleases: async (supplierId: string) => {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const now = new Date();
        
        // Find pending items that are ready to be released
        const releasableItems = await tx.financialLedger.findMany({
            where: {
                supplierId,
                status: 'PENDING',
                releaseDate: { lte: now }
            }
        });

        if (releasableItems.length === 0) return { releasedAmount: 0, count: 0 };

        let totalReleased = 0;
        
        for (const item of releasableItems) {
            totalReleased += item.amount;
            await tx.financialLedger.update({
                where: { id: item.id },
                data: { status: 'COMPLETED' }
            });
        }

        if (totalReleased > 0) {
            await tx.supplier.update({
                where: { id: supplierId },
                data: {
                    walletBalance: { increment: totalReleased },
                    pendingBalance: { decrement: totalReleased }
                }
            });
        }

        return { releasedAmount: totalReleased, count: releasableItems.length };
    });
  },

  getSupplierWallet: async (supplierId: string): Promise<SupplierWallet> => {
    // Process releases before fetching
    await FinancialService.processReleases(supplierId);

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        walletBalance: true,
        pendingBalance: true,
        blockedBalance: true,
        verificationStatus: true,
        financialStatus: true,
        plan: true
      }
    });
    
    if (!supplier) throw new Error('Supplier not found');

    // Histórico recente (Ledger)
    const ledger = await prisma.financialLedger.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Saques recentes
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { supplierId },
      orderBy: { requestedAt: 'desc' },
      take: 10
    });

    return {
      balances: {
        available: supplier.walletBalance,
        pending: supplier.pendingBalance,
        blocked: supplier.blockedBalance
      },
      status: {
        verified: supplier.verificationStatus === 'VERIFIED',
        active: supplier.financialStatus === 'ACTIVE'
      },
      history: ledger,
      withdrawals
    };
  },

  getSupplierFinancials: async (supplierId: string): Promise<any> => {
    // Process releases first
    await FinancialService.processReleases(supplierId);

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { plan: true }
    });
    if (!supplier) throw new Error('Supplier not found');

    const ledger = await prisma.financialLedger.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const subscription = await prisma.supplierSubscription.findFirst({
      where: { supplierId, status: 'ATIVA' },
      include: { plan: true }
    });

    // Calculate Limits
    const settings = await prisma.financialSettings.findUnique({ where: { id: 'global' } });
    const minWithdrawal = supplier.plan?.minWithdrawal || settings?.defaultMinWithdrawal || 50;
    const limitCount = supplier.plan?.withdrawalLimit || settings?.defaultWithdrawalLimit || 4;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const usedCount = await prisma.withdrawalRequest.count({
      where: {
        supplierId,
        requestedAt: { gte: startOfMonth }
      }
    });

    return { 
      supplier, 
      ledger, 
      subscription,
      withdrawalLimits: {
        min: minWithdrawal,
        limitCount: limitCount,
        usedCount: usedCount,
        remaining: Math.max(0, limitCount - usedCount)
      }
    };
  },

  requestWithdrawal: async (supplierId: string, amount: number, pixKey?: string): Promise<WithdrawalRequest> => {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const supplier = await tx.supplier.findUnique({ 
          where: { id: supplierId },
          include: { plan: true } 
      });
      if (!supplier) throw new Error('Supplier not found');

      const settings = await tx.financialSettings.findUnique({ where: { id: 'global' } });
      const minWithdrawal = supplier.plan?.minWithdrawal || settings?.defaultMinWithdrawal || 50;
      const withdrawalLimit = supplier.plan?.withdrawalLimit || settings?.defaultWithdrawalLimit || 4;

      if (amount < minWithdrawal) {
          throw new Error(`O valor mínimo para saque é R$ ${minWithdrawal.toFixed(2)}`);
      }

      // Check monthly limit
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const withdrawalsThisMonth = await tx.withdrawalRequest.count({
          where: {
              supplierId,
              requestedAt: { gte: startOfMonth }
          }
      });

      if (withdrawalsThisMonth >= withdrawalLimit) {
          throw new Error(`Limite mensal de saques atingido (${withdrawalLimit}).`);
      }

      if (supplier.verificationStatus !== 'VERIFIED') {
        throw new Error('Conta não verificada. Complete a verificação para sacar.');
      }
      if (supplier.financialStatus !== 'ACTIVE') {
        throw new Error('Conta suspensa ou com pendências financeiras.');
      }
      // Check active subscription
      const activeSub = await tx.supplierSubscription.findFirst({
        where: { supplierId, status: 'ATIVA', endDate: { gt: new Date() } }
      });
      if (!activeSub) {
        throw new Error('Plano vencido ou inativo. Renove para realizar saques.');
      }

      if (supplier.walletBalance < amount) {
        throw new Error('Saldo disponível insuficiente.');
      }
      if (amount <= 0) {
        throw new Error('Valor inválido.');
      }

      // Move from Available to Blocked
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          walletBalance: { decrement: amount },
          blockedBalance: { increment: amount }
        }
      });

      // Create Request
      const request = await tx.withdrawalRequest.create({
        data: {
          supplierId,
          amount,
          pixKey,
          status: 'PENDING'
        }
      });
      
      return request;
    });
  },

  // ==========================================
  // FINANCEIRO DA PLATAFORMA (ADMIN)
  // ==========================================

  getAdminDashboard: async (): Promise<AdminDashboardStats> => {
    // Totais acumulados
    const totalCommission = await prisma.financialLedger.aggregate({
      where: { type: 'SALE_COMMISSION' },
      _sum: { amount: true }
    });
    
    const totalSubscription = await prisma.financialLedger.aggregate({
      where: { type: 'SUBSCRIPTION_PAYMENT' },
      _sum: { amount: true }
    });

    const pendingWithdrawals = await prisma.withdrawalRequest.count({
      where: { status: 'PENDING' }
    });

    return {
      revenue: {
        commissions: totalCommission._sum.amount || 0,
        subscriptions: totalSubscription._sum.amount || 0,
        total: (totalCommission._sum.amount || 0) + (totalSubscription._sum.amount || 0)
      },
      pendingWithdrawals
    };
  },

  getWithdrawalRequests: async (status: string = 'PENDING'): Promise<(WithdrawalRequest & { supplier: { name: string; billingDoc: string | null } })[]> => {
    return await prisma.withdrawalRequest.findMany({
      where: { status },
      include: { supplier: { select: { name: true, billingDoc: true } } },
      orderBy: { requestedAt: 'asc' }
    });
  },

  approveWithdrawal: async (requestId: string, adminId: string, adminName: string): Promise<WithdrawalRequest> => {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const req = await tx.withdrawalRequest.findUnique({ 
        where: { id: requestId },
        include: { supplier: true }
      });
      if (!req || req.status !== 'PENDING') throw new Error('Request not pending');

      // 1. Remove from Blocked Balance (It leaves the system)
      await tx.supplier.update({
        where: { id: req.supplierId },
        data: {
          blockedBalance: { decrement: req.amount }
        }
      });

      // 2. Update Request Status
      const updatedReq = await tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'PAID', 
          processedAt: new Date(),
          processedBy: adminId
        }
      });

      // 3. Ledger Entry (Payout Completed)
      await tx.financialLedger.create({
        data: {
          type: 'PAYOUT',
          amount: req.amount,
          supplierId: req.supplierId,
          description: `Saque aprovado #${req.id}`,
          status: 'COMPLETED'
        }
      });

      // 4. Admin Log
      await tx.adminLog.create({
          data: {
              adminId,
              adminName,
              action: 'APPROVE_WITHDRAWAL',
              targetId: requestId,
              details: `Approved withdrawal of R$ ${req.amount}`
          }
      });

      return updatedReq;
    });
  },

  rejectWithdrawal: async (requestId: string, reason: string, adminId: string, adminName: string): Promise<WithdrawalRequest> => {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const req = await tx.withdrawalRequest.findUnique({ where: { id: requestId } });
      if (!req || req.status !== 'PENDING') throw new Error('Request not pending');

      // 1. Return to Wallet Balance (Available)
      await tx.supplier.update({
        where: { id: req.supplierId },
        data: {
          blockedBalance: { decrement: req.amount },
          walletBalance: { increment: req.amount }
        }
      });

      // 2. Update Request
      const updatedReq = await tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          notes: reason,
          processedAt: new Date(),
          processedBy: adminId
        }
      });

      // 3. Admin Log
      await tx.adminLog.create({
        data: {
            adminId,
            adminName,
            action: 'REJECT_WITHDRAWAL',
            targetId: requestId,
            reason: reason,
            details: `Rejected withdrawal of R$ ${req.amount}`
        }
      });

      return updatedReq;
    });
  },

  // ==========================================
  // AUTOMATION & INTERNAL
  // ==========================================

  processOrderPayout: async (orderId: string): Promise<Order> => {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { supplier: { include: { plan: true } } }
      });

      if (!order) throw new Error('Order not found');
      if (order.status !== 'DELIVERED') throw new Error('Order must be DELIVERED to process payout');
      if (order.financialStatus === 'RELEASED') throw new Error('Payout already released for this order');
      if (!order.supplier) throw new Error('Order has no linked supplier');

      // Calculate Release Date
      const settings = await tx.financialSettings.findUnique({ where: { id: 'global' } });
      const releaseDays = order.supplier.plan?.releaseDays || settings?.defaultReleaseDays || 14;
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + releaseDays);

      // Add to Pending Balance (It will be moved to Available later by processReleases)
      await tx.supplier.update({
        where: { id: order.supplier.id },
        data: {
          pendingBalance: { increment: order.supplierPayout }
        }
      });

      await tx.order.update({
        where: { id: order.id },
        data: { financialStatus: 'RELEASED' }
      });

      // Ledger Entry: Revenue Released to Pending
      await tx.financialLedger.create({
        data: {
          type: 'SALE_REVENUE', 
          amount: order.supplierPayout,
          supplierId: order.supplier.id,
          orderId: order.id,
          description: `Receita de venda #${order.id.slice(0,8)}`,
          status: 'PENDING',
          releaseDate: releaseDate
        }
      });

      // Ledger Entry: Platform Commission (Completed immediately)
      await tx.financialLedger.create({
        data: {
          type: 'SALE_COMMISSION',
          amount: order.platformCommission,
          supplierId: order.supplier.id, // Linked for reference
          orderId: order.id,
          description: `Comissão plataforma #${order.id.slice(0,8)}`,
          status: 'COMPLETED'
        }
      });
      
      return order;
    });
  },
  
  processSubscriptionPayment: async (supplierId: string, amount: number, method: 'BALANCE' | 'CARD' = 'CARD'): Promise<Supplier> => {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId },
        include: { plan: true }
      });
      if (!supplier) throw new Error('Supplier not found');

      if (method === 'BALANCE') {
          if (supplier.walletBalance < amount) {
             throw new Error('Insufficient wallet balance');
          }
          await tx.supplier.update({
              where: { id: supplierId },
              data: { walletBalance: { decrement: amount } }
          });
      }

      const now = new Date();
      const cycleDays = supplier.plan?.cycleDays || 30;
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + cycleDays);

      await tx.financialLedger.create({
        data: {
          type: 'SUBSCRIPTION_PAYMENT',
          amount: amount,
          supplierId: supplier.id,
          description: method === 'BALANCE' ? 'Pagamento de Mensalidade (Saldo)' : 'Pagamento de Mensalidade (Cartão)',
          status: 'COMPLETED'
        }
      });

      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          nextBillingDate: nextDate,
          financialStatus: 'ACTIVE',
          status: 'ACTIVE'
        }
      });

      const activeSub = await tx.supplierSubscription.findFirst({
        where: { supplierId: supplier.id, status: 'ATIVA' }
      });
      
      if (activeSub) {
          await tx.supplierSubscription.update({
              where: { id: activeSub.id },
              data: { status: 'SUSPENSA' }
          });
      }
      
      if (!supplier.planId) {
          throw new Error('Supplier has no plan assigned to renew subscription');
      }

      await tx.supplierSubscription.create({
          data: {
              supplierId: supplier.id,
              planId: supplier.planId,
              startDate: now,
              endDate: nextDate,
              status: 'ATIVA'
          }
      });

      return updatedSupplier;
    });
  },

  assignPlanToSupplier: async (supplierId: string, planId: string): Promise<Supplier> => {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const plan = await tx.plan.findUnique({ where: { id: planId } });
      if (!plan) throw new Error('Plan not found');

      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          planId: plan.id,
          commissionRate: plan.commissionPercent,
        }
      });
      return updatedSupplier;
    });
  },

  updateOverdueSuppliers: async (): Promise<string[]> => {
    const now = new Date();
    const overdueSubs = await prisma.supplierSubscription.findMany({
      where: {
        status: 'ATIVA',
        endDate: { lt: now }
      },
      include: { supplier: true }
    });

    const results: string[] = [];
    for (const sub of overdueSubs) {
      await prisma.supplierSubscription.update({
        where: { id: sub.id },
        data: { status: 'VENCIDA' }
      });
      await prisma.supplier.update({
        where: { id: sub.supplierId },
        data: { financialStatus: 'OVERDUE' }
      });
      results.push(sub.supplierId);
    }
    return results;
  }
};
