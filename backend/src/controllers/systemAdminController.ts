
import { Request, Response } from 'express';
import prisma from '../prisma';

// SYSTEM_ADMIN Controller
// Scope: Global System Access

export const listAccounts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
            plan: true,
            _count: { select: { suppliers: true, users: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.account.count({ where })
    ]);

    res.json({ accounts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error: any) {
    res.status(500).json({ message: 'Error listing accounts', error: error.message });
  }
};

export const getGlobalMetrics = async (req: Request, res: Response) => {
  try {
    const [totalAccounts, totalSuppliers, totalUsers, totalOrders, totalGmv] = await Promise.all([
        prisma.account.count(),
        prisma.supplier.count(),
        prisma.user.count(),
        prisma.order.count(),
        prisma.order.aggregate({ _sum: { totalAmount: true } })
    ]);

    res.json({
        totalAccounts,
        totalSuppliers,
        totalUsers,
        totalOrders,
        gmv: totalGmv._sum.totalAmount || 0
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching global metrics', error: error.message });
  }
};

export const suspendAccount = async (req: Request, res: Response) => {
    const { accountId } = req.params;
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Suspend Users linked to the account
            const usersUpdate = await tx.user.updateMany({
                where: { accountId },
                data: { status: 'SUSPENDED' }
            });

            // 2. Suspend Suppliers linked to the account
            const suppliersUpdate = await tx.supplier.updateMany({
                where: { accountId },
                data: { 
                    status: 'SUSPENDED',
                    financialStatus: 'SUSPENDED'
                }
            });

            // 3. Suspend the Account itself
            const accountUpdate = await tx.account.update({
                where: { id: accountId },
                data: { onboardingStatus: 'SUSPENDED' }
            });

            return {
                usersAffected: usersUpdate.count,
                suppliersAffected: suppliersUpdate.count,
                accountAffected: 1
            };
        });
        
        console.log(`Account ${accountId} suspended. Affected: ${result.usersAffected} users, ${result.suppliersAffected} suppliers.`);

        res.json({ 
            message: 'Conta suspensa com sucesso.',
            details: {
                usersSuspended: result.usersAffected,
                suppliersSuspended: result.suppliersAffected,
                accountStatus: 'SUSPENDED'
            }
        });
    } catch (error: any) {
        console.error(`Error suspending account ${accountId}:`, error);
        res.status(500).json({ message: 'Erro ao suspender conta', error: error.message });
    }
};
