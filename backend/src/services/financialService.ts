import { PrismaClient, Supplier, Order } from '@prisma/client';

const prisma = new PrismaClient();

interface FinancialCalculation {
  marketplaceFee: number;
  platformCommission: number;
  supplierPayout: number;
}

export const FinancialService = {
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
      const supplier = await tx.supplier.findUnique({ 
          where: { id: supplierId }, 
          include: { plan: true } 
      });
      if (!supplier) throw new Error('Supplier not found');

      if (method === 'BALANCE' && supplier.walletBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }

      // Calculate new date
      // If currently overdue (date in past), start from NOW.
      // If active (date in future), add to current date.
      const now = new Date();
      const currentNextDate = supplier.nextBillingDate ? new Date(supplier.nextBillingDate) : now;
      
      let baseDate = currentNextDate < now ? now : currentNextDate;
      
      const cycleDays = supplier.plan?.cycleDays || 30;
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + cycleDays);

      // Create Ledger
      await tx.financialLedger.create({
        data: {
          type: 'SUBSCRIPTION_PAYMENT',
          amount: amount,
          supplierId: supplier.id,
          description: method === 'BALANCE' ? 'Pagamento de Mensalidade (Saldo)' : 'Pagamento de Mensalidade (Cartão)',
          status: 'COMPLETED'
        }
      });

      // Update Supplier
      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          nextBillingDate: nextDate,
          financialStatus: 'ACTIVE',
          status: 'ACTIVE', // Reactivate if paused
          walletBalance: method === 'BALANCE' ? { decrement: amount } : undefined
        }
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
      
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new Error('Supplier not found');
      
      const updated = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          planId: planId,
          // Keep nextBillingDate as is; new plan applies next cycle
          financialStatus: supplier.financialStatus === 'SUSPENDED' ? 'ACTIVE' : supplier.financialStatus,
          status: supplier.status === 'PAUSED' ? 'ACTIVE' : supplier.status
        },
        include: { plan: true }
      });
      
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

    // TODO: Add date check logic here (nextBillingDate < now -> suspend)
    // For now, relies on the explicit status field
    return true;
  }
};
