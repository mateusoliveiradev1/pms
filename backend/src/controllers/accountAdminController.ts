
import { Request, Response } from 'express';
import prisma from '../prisma';

// ACCOUNT_ADMIN Controller
// Scope: Single Tenant (Account)

export const getAccountDetails = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const accountId = user.role === 'SYSTEM_ADMIN' ? req.params.accountId : await getUserAccountId(user.userId);

        if (!accountId) {
            res.status(400).json({ message: 'Account context missing' });
            return;
        }

        const account = await prisma.account.findUnique({
            where: { id: accountId },
            include: {
                plan: true,
                users: { select: { id: true, name: true, email: true, role: true, status: true } },
                suppliers: true
            }
        });

        if (!account) {
            res.status(404).json({ message: 'Account not found' });
            return;
        }

        res.json(account);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching account details', error: error.message });
    }
};

export const getAccountFinancials = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const accountId = user.role === 'SYSTEM_ADMIN' ? req.params.accountId : await getUserAccountId(user.userId);

        if (!accountId) {
             res.status(403).json({ message: 'Forbidden' });
             return;
        }

        // Aggregate stats for all suppliers in this account
        const suppliers = await prisma.supplier.findMany({
            where: { accountId },
            select: { id: true }
        });

        const supplierIds = suppliers.map(s => s.id);

        if (supplierIds.length === 0) {
            res.json({ totalRevenue: 0, totalCommissions: 0, totalWithdrawals: 0, balance: 0 });
            return;
        }

        const [revenue, withdrawals, wallet] = await Promise.all([
            prisma.financialLedger.aggregate({
                where: { supplierId: { in: supplierIds }, type: 'SALE_REVENUE' },
                _sum: { amount: true }
            }),
            prisma.financialLedger.aggregate({
                where: { supplierId: { in: supplierIds }, type: 'WITHDRAWAL' },
                _sum: { amount: true }
            }),
            prisma.supplier.aggregate({
                where: { accountId },
                _sum: { walletBalance: true, pendingBalance: true, blockedBalance: true }
            })
        ]);

        res.json({
            totalRevenue: revenue._sum.amount || 0,
            totalWithdrawals: Math.abs(withdrawals._sum.amount || 0),
            balance: {
                available: wallet._sum.walletBalance || 0,
                pending: wallet._sum.pendingBalance || 0,
                blocked: wallet._sum.blockedBalance || 0
            }
        });

    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching account financials', error: error.message });
    }
};

// Helper
async function getUserAccountId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountId: true } });
    return user?.accountId || null;
}
