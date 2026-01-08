import { PrismaClient, Supplier, Order } from '@prisma/client';

const prisma = new PrismaClient();

interface FinancialCalculation {
  marketplaceFee: number;
  platformCommission: number;
  supplierPayout: number;
}

export const FinancialService = {
  // Returns active subscription for a supplier
  getActiveSubscription: async (supplierId: string) => {
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
    // 1. Marketplace takes its cut first (usually)
    // Assuming marketplaceFeeValue is provided (e.g., from Mercado Livre API)
    // If not, we might need a rule for it. For now, we accept it as input.
    
    const netAmount = totalAmount - marketplaceFeeValue;
    
    // 2. Platform commission is applied on the Net Amount (or Total, depending on business rule).
    // The prompt says: "Comissão calculada sobre: Valor líquido da venda (após taxa do marketplace)"
    const platformCommission = netAmount * (commissionRatePercentage / 100);
    
    // 3. The rest goes to the supplier
    const supplierPayout = netAmount - platformCommission;

    return {
      marketplaceFee: marketplaceFeeValue,
      platformCommission: parseFloat(platformCommission.toFixed(2)),
      supplierPayout: parseFloat(supplierPayout.toFixed(2))
    };
  },

  /**
   * Processes the payout for a delivered order.
   * Atomic transaction: Updates Order Status -> Updates Supplier Balance -> Creates Ledger Entry
   */
  processOrderPayout: async (orderId: string) => {
    return await prisma.$transaction(async (tx) => {
      // 1. Get the order with supplier info
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { supplier: true }
      });

      if (!order) throw new Error('Order not found');
      if (order.status !== 'DELIVERED') throw new Error('Order must be DELIVERED to process payout');
      if (order.financialStatus === 'RELEASED') throw new Error('Payout already released for this order');
      if (!order.supplier) throw new Error('Order has no linked supplier');

      // 2. Update Supplier Balance
      const updatedSupplier = await tx.supplier.update({
        where: { id: order.supplier.id },
        data: {
          walletBalance: { increment: order.supplierPayout }
        }
      });

      // 3. Create Ledger Entry for Payout
      await tx.financialLedger.create({
        data: {
          type: 'PAYOUT',
          amount: order.supplierPayout,
          supplierId: order.supplier.id,
          orderId: order.id,
          description: `Repasse referente ao pedido ${order.id}`,
          status: 'COMPLETED'
        }
      });

      // 4. Create Ledger Entry for Platform Commission (Revenue)
      await tx.financialLedger.create({
        data: {
          type: 'SALE_COMMISSION',
          amount: order.platformCommission,
          supplierId: order.supplier.id, // Linked to supplier for tracking
          orderId: order.id,
          description: `Comissão da plataforma sobre pedido ${order.id}`,
          status: 'COMPLETED'
        }
      });
      await tx.log.create({
        data: {
          level: 'INFO',
          message: 'Comissão aplicada em pedido',
          context: JSON.stringify({ orderId: order.id, supplierId: order.supplier.id, commission: order.platformCommission })
        }
      });

      // 5. Update Order Financial Status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { financialStatus: 'RELEASED' }
      });

      return { updatedOrder, updatedSupplier };
    });
  },

  /**
   * Process a subscription payment for a supplier
   */
  processSubscriptionPayment: async (supplierId: string, amount: number, method: 'BALANCE' | 'CARD' = 'CARD') => {
    return await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId }, include: { plan: true } });
      if (!supplier) throw new Error('Supplier not found');
      if (!supplier.planId) throw new Error('Supplier has no plan assigned');

      if (method === 'BALANCE' && supplier.walletBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      const now = new Date();
      const cycleDays = supplier.plan?.cycleDays || 30;
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + cycleDays);

      await tx.financialLedger.create({
        data: {
          type: 'SUBSCRIPTION_PAYMENT',
          amount,
          supplierId: supplier.id,
          description: method === 'BALANCE' ? 'Pagamento de Mensalidade (Saldo)' : 'Pagamento de Mensalidade (Cartão)',
          status: 'COMPLETED'
        }
      });

      const activeSub = await tx.supplierSubscription.findFirst({
        where: { supplierId, status: 'ATIVA' }
      });
      if (activeSub) {
        await tx.supplierSubscription.update({
          where: { id: activeSub.id },
          data: { planId: supplier.planId, startDate: now, endDate, status: 'ATIVA' }
        });
      } else {
        await tx.supplierSubscription.create({
          data: { supplierId, planId: supplier.planId, startDate: now, endDate, status: 'ATIVA' }
        });
      }

      // Apply scheduled downgrade at renewal
      const finalPlanId = supplier.scheduledPlanId ? supplier.scheduledPlanId : supplier.planId;

      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          planId: finalPlanId,
          scheduledPlanId: null,
          nextBillingDate: endDate,
          financialStatus: 'ACTIVE',
          status: 'ACTIVE',
          walletBalance: method === 'BALANCE' ? { decrement: amount } : undefined
        },
        include: { plan: true }
      });

      await tx.log.create({
        data: { level: 'INFO', message: 'Assinatura ativada após pagamento', context: JSON.stringify({ supplierId, planId: updatedSupplier.planId }) }
      });

      return updatedSupplier;
    });
  },
  
  /**
   * Process a withdraw (PAYOUT) from supplier wallet with PIX
   */
  processWithdraw: async (supplierId: string, amount: number, pixKey: string) => {
    return await prisma.$transaction(async (tx) => {
      if (!amount || amount <= 0) throw new Error('Invalid amount');
      
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new Error('Supplier not found');
      if (supplier.financialStatus !== 'ACTIVE') throw new Error('Withdraw blocked: supplier not active');
      const sub = await tx.supplierSubscription.findFirst({ where: { supplierId, status: 'ATIVA' } });
      if (!sub || sub.endDate < new Date()) throw new Error('Withdraw blocked: subscription overdue');
      if (supplier.walletBalance < amount) throw new Error('Insufficient wallet balance');

      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          walletBalance: { decrement: amount }
        }
      });

      await tx.financialLedger.create({
        data: {
          type: 'PAYOUT',
          amount,
          supplierId,
          description: `Saque PIX (${pixKey})`,
          status: 'COMPLETED'
        }
      });

      return updatedSupplier;
    });
  },
  
  /**
   * Assign a plan to supplier
   */
  assignPlanToSupplier: async (supplierId: string, planId: string) => {
    return await prisma.$transaction(async (tx) => {
      const plan = await tx.plan.findUnique({ where: { id: planId } });
      if (!plan) throw new Error('Plan not found');
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId }, include: { plan: true } });
      if (!supplier) throw new Error('Supplier not found');
      const currentPriority = supplier.plan?.priorityLevel ?? 1;
      const isUpgrade = plan.priorityLevel > currentPriority || plan.monthlyPrice >= (supplier.plan?.monthlyPrice ?? 0);

      let updated;
      if (isUpgrade) {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + (plan.cycleDays || 30));

        const activeSub = await tx.supplierSubscription.findFirst({ where: { supplierId, status: 'ATIVA' } });
        if (activeSub) {
          await tx.supplierSubscription.update({ where: { id: activeSub.id }, data: { planId: plan.id, startDate: now, endDate, status: 'ATIVA' } });
        } else {
          await tx.supplierSubscription.create({ data: { supplierId, planId: plan.id, startDate: now, endDate, status: 'ATIVA' } });
        }

        updated = await tx.supplier.update({
          where: { id: supplierId },
          data: { planId: plan.id, nextBillingDate: endDate, scheduledPlanId: null, financialStatus: 'ACTIVE', status: 'ACTIVE' },
          include: { plan: true }
        });
        await tx.log.create({ data: { level: 'INFO', message: 'Upgrade de plano imediato', context: JSON.stringify({ supplierId, planId: plan.id }) } });
      } else {
        updated = await tx.supplier.update({
          where: { id: supplierId },
          data: { scheduledPlanId: plan.id },
          include: { plan: true }
        });
        await tx.log.create({ data: { level: 'INFO', message: 'Downgrade agendado para próximo ciclo', context: JSON.stringify({ supplierId, planId: plan.id }) } });
      }
      
      await tx.financialLedger.create({
        data: {
          type: 'ADJUSTMENT',
          amount: 0,
          supplierId,
          description: `Alteração de plano para ${plan.name}`,
          status: 'COMPLETED'
        }
      });
      
      return updated;
    });
  },

  /**
   * Checks and updates status for overdue suppliers
   * Should be called by a Cron Job or Admin Trigger
   */
  updateOverdueSuppliers: async () => {
      const now = new Date();
      
      // 1. Find suppliers with expired billing date and currently ACTIVE
      const overdueSuppliers = await prisma.supplier.findMany({
          where: {
              nextBillingDate: { lt: now },
              financialStatus: 'ACTIVE'
          }
      });

      const results = [];

      for (const s of overdueSuppliers) {
          // Mark as OVERDUE and PAUSED
          const updated = await prisma.supplier.update({
              where: { id: s.id },
              data: {
                  financialStatus: 'OVERDUE',
                  status: 'PAUSED'
              }
          });
          results.push(updated);
          // Suspend active subscription
          const activeSub = await prisma.supplierSubscription.findFirst({ where: { supplierId: s.id, status: 'ATIVA' } });
          if (activeSub) {
            await prisma.supplierSubscription.update({ where: { id: activeSub.id }, data: { status: 'SUSPENSA' } });
          }
          // Log it
          await prisma.log.create({
              data: {
                  level: 'WARN',
                  message: `Supplier ${s.name} marked as OVERDUE/PAUSED`,
                  context: JSON.stringify({ supplierId: s.id, nextBillingDate: s.nextBillingDate })
              }
          });
      }
      
      return results;
  },

  /**
   * Checks if supplier is active and subscription is up to date
   */
  checkSupplierStatus: async (supplierId: string): Promise<boolean> => {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) return false;
    
    // Simple check: Status must be ACTIVE
    if (supplier.status !== 'ACTIVE') return false;
    if (supplier.financialStatus === 'SUSPENDED') return false;

    const sub = await prisma.supplierSubscription.findFirst({ where: { supplierId, status: 'ATIVA' } });
    if (!sub || sub.endDate < new Date()) return false;
    return true;
  }
};
