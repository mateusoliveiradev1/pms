import { Request, Response } from 'express';
import prisma from '../prisma';

// 1. Visão Geral Financeira (Overview)
export const getFinancialOverview = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, supplierId } = req.query;

    const start = startDate ? new Date(String(startDate)) : new Date(new Date().setDate(new Date().getDate() - 30)); // Default 30 days
    const end = endDate ? new Date(String(endDate)) : new Date();
    // Adjust end date to include the full day
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    const supplierFilter = supplierId ? { supplierId: String(supplierId) } : {};
    const supplierIdFilter = supplierId ? { id: String(supplierId) } : {};

    // Receita Bruta (Total Amount of Paid Orders)
    const grossRevenueAgg = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        paymentStatus: 'PAID',
        paidAt: { gte: start, lte: endOfDay },
        ...supplierFilter
      }
    });

    // Receita Líquida (Total Commissions)
    const netRevenueAgg = await prisma.financialLedger.aggregate({
      _sum: { amount: true },
      where: {
        type: 'PLATFORM_COMMISSION',
        createdAt: { gte: start, lte: endOfDay },
        ...supplierFilter
      }
    });

    // Subscription Revenue
    const subscriptionRevenueAgg = await prisma.financialLedger.aggregate({
      _sum: { amount: true },
      where: {
        type: 'SUBSCRIPTION_PAYMENT',
        createdAt: { gte: start, lte: endOfDay },
        ...supplierFilter
      }
    });

    // Total Pago em Saques
    const totalWithdrawalsAgg = await prisma.withdrawalRequest.aggregate({
      _sum: { amount: true },
      where: {
        status: 'PAID',
        processedAt: { gte: start, lte: endOfDay },
        ...supplierFilter
      }
    });

    // Pending Withdrawals Count (Snapshot, not period filtered usually, but let's keep it snapshot)
    const pendingWithdrawalsCount = await prisma.withdrawalRequest.count({
        where: { 
            status: 'PENDING',
            ...supplierFilter
        }
    });

    const pendingWithdrawalsAgg = await prisma.withdrawalRequest.aggregate({
        _sum: { amount: true },
        where: { 
            status: 'PENDING',
            ...supplierFilter
        }
    });
    const pendingWithdrawalsAmount = pendingWithdrawalsAgg._sum.amount || 0;

    // Saldo Pendente (D+N) - Snapshot
    const pendingBalanceAgg = await prisma.supplier.aggregate({
      _sum: { 
          pendingBalance: true,
          walletBalance: true,
          blockedBalance: true
      },
      where: supplierIdFilter
    });
    
    // Charts Generation (Revenue Evolution)
    const revenueEntries = await prisma.financialLedger.findMany({
        where: {
            createdAt: { gte: start, lte: endOfDay },
            type: { in: ['PLATFORM_COMMISSION', 'SUBSCRIPTION_PAYMENT'] },
            ...supplierFilter
        },
        select: {
            createdAt: true,
            amount: true,
            type: true
        },
        orderBy: { createdAt: 'asc' }
    });

    const revenueByDate: Record<string, number> = {};
    
    // Fill all dates in range (optional, but good for charts)
    for (let d = new Date(start); d <= endOfDay; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        revenueByDate[key] = 0;
    }

    revenueEntries.forEach(entry => {
        const key = entry.createdAt.toISOString().split('T')[0];
        const val = Math.abs(entry.amount);
        revenueByDate[key] = (revenueByDate[key] || 0) + val;
    });

    const chartData = {
        labels: Object.keys(revenueByDate),
        datasets: [{
            data: Object.values(revenueByDate)
        }]
    };

    const totalCommissions = Math.abs(netRevenueAgg._sum.amount || 0);
    const totalSubscriptions = Math.abs(subscriptionRevenueAgg._sum.amount || 0);

    // Structure matching AdminDashboardStats as much as possible
    res.json({
      revenue: {
        commissions: totalCommissions,
        subscriptions: totalSubscriptions,
        total: totalCommissions + totalSubscriptions,
        gross: grossRevenueAgg._sum.totalAmount || 0 // Extra field
      },
      payouts: {
        totalPaid: totalWithdrawalsAgg._sum.amount || 0,
        pendingCount: pendingWithdrawalsCount,
        pendingAmount: pendingWithdrawalsAmount
      },
      balance: {
        totalHeld: (pendingBalanceAgg._sum.walletBalance || 0) + 
                   (pendingBalanceAgg._sum.pendingBalance || 0) + 
                   (pendingBalanceAgg._sum.blockedBalance || 0)
      },
      charts: {
        revenue: chartData
      }
    });

  } catch (error: any) {
    console.error('Error getting financial overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 2. Reconciliação Financeira (Reconciliation)
export const getReconciliation = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, supplierId } = req.query;
    
    // Default to last 30 days if not provided
    const start = startDate ? new Date(String(startDate)) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(String(endDate)) : new Date();
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    // Query 1: Paid Orders without Ledger
    let paidNoLedgerQuery = `
      SELECT o.id, o."orderNumber", o.status, o."paymentStatus", o."totalAmount", o."supplierId", 'PAID_NO_LEDGER' as issue, o."paidAt"
      FROM "Order" o
      LEFT JOIN "FinancialLedger" fl ON o.id = fl."referenceId" AND fl.type = 'ORDER_PAYMENT'
      WHERE o."paymentStatus" = 'PAID' AND fl.id IS NULL
      AND o."paidAt" >= '${start.toISOString()}' AND o."paidAt" <= '${endOfDay.toISOString()}'
    `;
    
    if (supplierId) {
        paidNoLedgerQuery += ` AND o."supplierId" = '${supplierId}'`;
    }

    const paidWithoutLedger = await prisma.$queryRawUnsafe(paidNoLedgerQuery);

    // Query 2: Refunded Orders without Refund Ledger
    let refundedNoLedgerQuery = `
        SELECT o.id, o."orderNumber", o.status, o."paymentStatus", o."totalAmount", o."supplierId", 'REFUNDED_NO_LEDGER' as issue, o."updatedAt"
        FROM "Order" o
        LEFT JOIN "FinancialLedger" fl ON o.id = fl."referenceId" AND fl.type = 'ORDER_REFUND'
        WHERE o."paymentStatus" = 'REFUNDED' AND fl.id IS NULL
        AND o."updatedAt" >= '${start.toISOString()}' AND o."updatedAt" <= '${endOfDay.toISOString()}'
    `;

    if (supplierId) {
        refundedNoLedgerQuery += ` AND o."supplierId" = '${supplierId}'`;
    }

    const refundedWithoutLedger = await prisma.$queryRawUnsafe(refundedNoLedgerQuery);

    // Query 3: Ledger without Order (Orphaned)
    let orphanedLedgerQuery = `
        SELECT fl.id, fl."referenceId", fl.amount, fl.type, fl."supplierId", 'LEDGER_NO_ORDER' as issue, fl."createdAt"
        FROM "FinancialLedger" fl
        LEFT JOIN "Order" o ON fl."referenceId" = o.id
        WHERE fl.type IN ('ORDER_PAYMENT', 'ORDER_REFUND') AND o.id IS NULL
        AND fl."createdAt" >= '${start.toISOString()}' AND fl."createdAt" <= '${endOfDay.toISOString()}'
    `;

    if (supplierId) {
        orphanedLedgerQuery += ` AND fl."supplierId" = '${supplierId}'`;
    }

    const orphanedLedgers = await prisma.$queryRawUnsafe(orphanedLedgerQuery);

    res.json({
      paidWithoutLedger,
      refundedWithoutLedger,
      orphanedLedgers
    });

  } catch (error: any) {
    console.error('Error getting reconciliation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 3. Fornecedores - Visão Consolidada
export const getSupplierFinancialStats = async (req: Request, res: Response) => {
    try {
        const { search, status } = req.query;

        const where: any = {};
        if (search) {
            where.name = { contains: String(search), mode: 'insensitive' };
        }
        if (status && status !== 'ALL') {
            where.financialStatus = String(status);
        }

        const suppliers = await prisma.supplier.findMany({
            where,
            include: {
                plan: true,
                _count: {
                    select: { orders: true }
                }
            }
        });

        const withdrawals = await prisma.withdrawalRequest.groupBy({
            by: ['supplierId'],
            _sum: { amount: true },
            where: { status: 'PAID' }
        });

        const commissions = await prisma.financialLedger.groupBy({
            by: ['supplierId'],
            _sum: { amount: true },
            where: { type: 'PLATFORM_COMMISSION' } 
        });

        // Map results
        const stats = suppliers.map(supplier => {
            const totalWithdrawn = withdrawals.find(w => w.supplierId === supplier.id)?._sum.amount || 0;
            const totalCommissions = Math.abs(commissions.find(c => c.supplierId === supplier.id)?._sum.amount || 0);
            
            return {
                id: supplier.id,
                name: supplier.name,
                plan: supplier.plan?.name || 'N/A',
                status: supplier.status,
                financialStatus: supplier.financialStatus,
                walletBalance: supplier.walletBalance,
                pendingBalance: supplier.pendingBalance,
                totalWithdrawn,
                totalCommission: totalCommissions, 
                totalOrders: supplier._count.orders
            };
        });

        res.json(stats);

    } catch (error: any) {
        console.error('Error getting supplier stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 4. Alertas Operacionais
export const getOperationalAlerts = async (req: Request, res: Response) => {
    try {
        // a) Pedido pago sem ledger
        const paidNoLedgerCount: any[] = await prisma.$queryRaw`
            SELECT count(*)::int as count
            FROM "Order" o
            LEFT JOIN "FinancialLedger" fl ON o.id = fl."referenceId" AND fl.type = 'ORDER_PAYMENT'
            WHERE o."paymentStatus" = 'PAID' AND fl.id IS NULL
        `;

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        const delayedWithdrawalsCount = await prisma.withdrawalRequest.count({
            where: {
                status: 'PENDING',
                requestedAt: { lt: threeDaysAgo }
            }
        });

        // d) Fornecedor suspenso com saldo disponível
        const suspendedWithBalanceCount = await prisma.supplier.count({
            where: {
                financialStatus: 'SUSPENDED',
                walletBalance: { gt: 0 }
            }
        });

        res.json({
            paidNoLedger: paidNoLedgerCount[0].count || 0,
            delayedWithdrawals: delayedWithdrawalsCount,
            suspendedWithBalance: suspendedWithBalanceCount,
            // For webhook, returning total processed today
            processedWebhooksToday: await prisma.processedWebhookEvent.count({
                where: { processedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }
            })
        });

    } catch (error: any) {
        console.error('Error getting alerts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 5. Listar Saques (Admin)
export const listAllWithdrawals = async (req: Request, res: Response) => {
    try {
        const { status, supplierId } = req.query;
        
        const where: any = {};
        if (status && status !== 'ALL') {
            where.status = String(status);
        }
        if (supplierId) {
            where.supplierId = String(supplierId);
        }

        const withdrawals = await prisma.withdrawalRequest.findMany({
            where,
            include: {
                supplier: {
                    select: { name: true, email: true } // Assuming email is on User, but here simpler
                }
            },
            orderBy: { requestedAt: 'desc' }
        });
        
        res.json(withdrawals);
    } catch (error: any) {
        console.error('Error listing withdrawals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 6. Processar Saque (Admin)
export const processWithdrawal = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { action, reason, adminId } = req.body; // action: APPROVE, REJECT, MARK_PAID
    
    try {
        const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });
        if (!withdrawal) {
            res.status(404).json({ error: 'Withdrawal request not found' });
            return;
        }

        if (withdrawal.status !== 'PENDING' && action !== 'MARK_PAID') {
             // Allow marking paid even if already approved? Usually PENDING -> APPROVED -> PAID
             // Or PENDING -> PAID (skip approval step if simple)
        }

        await prisma.$transaction(async (tx) => {
            if (action === 'REJECT') {
                // Refund balance
                await tx.supplier.update({
                    where: { id: withdrawal.supplierId },
                    data: {
                        walletBalance: { increment: withdrawal.amount },
                        blockedBalance: { decrement: withdrawal.amount }
                    }
                });
                
                await tx.withdrawalRequest.update({
                    where: { id },
                    data: { 
                        status: 'REJECTED', 
                        processedAt: new Date(),
                        adminNote: reason 
                    }
                });

                // Create Ledger entry for refund
                await tx.financialLedger.create({
                    data: {
                        supplierId: withdrawal.supplierId,
                        type: 'ADJUSTMENT',
                        amount: withdrawal.amount,
                        description: `Estorno de saque rejeitado: ${reason || 'Sem motivo'}`,
                        referenceId: withdrawal.id
                    }
                });
            } else if (action === 'APPROVE') {
                // Just change status, money stays blocked until PAID
                await tx.withdrawalRequest.update({
                    where: { id },
                    data: { 
                        status: 'APPROVED', 
                        processedAt: new Date(),
                        adminNote: reason 
                    }
                });
            } else if (action === 'MARK_PAID') {
                // Remove from blocked balance (money leaves system)
                await tx.supplier.update({
                    where: { id: withdrawal.supplierId },
                    data: {
                        blockedBalance: { decrement: withdrawal.amount }
                    }
                });

                await tx.withdrawalRequest.update({
                    where: { id },
                    data: { 
                        status: 'PAID', 
                        processedAt: new Date(),
                        adminNote: reason 
                    }
                });
                
                // Ledger entry for Payout
                await tx.financialLedger.create({
                    data: {
                        supplierId: withdrawal.supplierId,
                        type: 'WITHDRAWAL',
                        amount: -withdrawal.amount, // Negative as it leaves wallet
                        description: 'Saque realizado',
                        referenceId: withdrawal.id
                    }
                });
            }
        });

        res.json({ success: true });

    } catch (error: any) {
        console.error('Error processing withdrawal:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 7. Configurações Globais
export const updateGlobalSettings = async (req: Request, res: Response) => {
    const { defaultReleaseDays, defaultMinWithdrawal, defaultWithdrawalLimit } = req.body;
    
    try {
        const settings = await prisma.financialSettings.upsert({
            where: { id: 'global' },
            update: {
                defaultReleaseDays,
                defaultMinWithdrawal,
                defaultWithdrawalLimit
            },
            create: {
                id: 'global',
                defaultReleaseDays,
                defaultMinWithdrawal,
                defaultWithdrawalLimit
            }
        });
        
        res.json(settings);
    } catch (error: any) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
