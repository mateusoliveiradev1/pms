import { Request, Response } from 'express';
import { FinancialService } from '../services/financialService';
import prisma from '../prisma';

export const checkOverdue = async (req: Request, res: Response) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers['x-cron-secret'] !== cronSecret) {
        res.status(403).json({ message: 'Forbidden: Invalid Cron Secret' });
        return;
    }
    
    const results = await FinancialService.updateOverdueSuppliers();
    res.json({ message: 'Overdue check completed', updatedCount: results.length, details: results });
  } catch (error: any) {
    res.status(500).json({ message: 'Error checking overdue suppliers', error: error.message });
  }
};

export const paySubscription = async (req: Request, res: Response) => {
  const { supplierId, amount, method, paymentToken } = req.body;
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (authUser.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: { accountId: true, role: true },
      });
      if (!user?.accountId) {
        res.status(400).json({ message: 'Usuário sem conta vinculada' });
        return;
      }

      const supplier = await prisma.supplier.findUnique({
        where: { id: String(supplierId) },
        select: { userId: true, accountId: true },
      });
      if (!supplier) {
        res.status(404).json({ message: 'Supplier not found' });
        return;
      }

      if (supplier.accountId !== user.accountId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      if (user.role === 'SUPPLIER' && supplier.userId !== authUser.userId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
    }

    const result = await FinancialService.processSubscriptionPayment(
      String(supplierId),
      Number(amount),
      method === 'BALANCE' ? 'BALANCE' : 'CARD',
      paymentToken
    );
    res.json({ message: 'Subscription paid successfully', supplier: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

export const getLedger = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { supplierId } = req.query;
    if (supplierId && authUser.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: { accountId: true, role: true },
      });
      if (!user?.accountId) {
        res.status(400).json({ message: 'Usuário sem conta vinculada' });
        return;
      }

      const supplier = await prisma.supplier.findUnique({
        where: { id: String(supplierId) },
        select: { userId: true, accountId: true },
      });
      if (!supplier) {
        res.status(404).json({ message: 'Supplier not found' });
        return;
      }
      if (supplier.accountId !== user.accountId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      if (user.role === 'SUPPLIER' && supplier.userId !== authUser.userId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
    }

    let where: any = {};
    if (supplierId) {
      where = { supplierId: String(supplierId) };
    } else if (authUser.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: { accountId: true, role: true },
      });
      if (!user?.accountId) {
        res.json([]);
        return;
      }

      const suppliers =
        user.role === 'SUPPLIER'
          ? await prisma.supplier.findMany({ where: { userId: authUser.userId }, select: { id: true } })
          : await prisma.supplier.findMany({ where: { accountId: user.accountId }, select: { id: true } });

      where = { supplierId: { in: suppliers.map((s) => s.id) } };
    }
    
    const ledger = await prisma.financialLedger.findMany({
      where,
      include: { supplier: true },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(ledger);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching ledger', error: error.message });
  }
};

export const getSupplierFinancials = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
        if (!authUser?.userId) {
          res.status(401).json({ message: 'Unauthorized' });
          return;
        }

        // Permission check
        if (authUser.role !== 'ADMIN') {
             const user = await prisma.user.findUnique({
               where: { id: authUser.userId },
               select: { accountId: true, role: true },
             });
             if (!user?.accountId) {
               res.status(400).json({ message: 'Usuário sem conta vinculada' });
               return;
             }

             const supplierCheck = await prisma.supplier.findUnique({
               where: { id },
               select: { userId: true, accountId: true },
             });
             if (!supplierCheck) {
                 res.status(404).json({ message: 'Supplier not found' });
                 return;
             }
             if (supplierCheck.accountId !== user.accountId) {
                 res.status(403).json({ message: 'Forbidden' });
                 return;
             }
             if (user.role === 'SUPPLIER' && supplierCheck.userId !== authUser.userId) {
                 res.status(403).json({ message: 'Forbidden' });
                 return;
             }
        }

        const data = await FinancialService.getSupplierFinancials(id);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching supplier financials', error: error.message });
    }
};

export const withdrawFunds = async (req: Request, res: Response) => {
  const { supplierId, amount, pixKey } = req.body;
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (authUser.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: { accountId: true, role: true },
      });
      if (!user?.accountId) {
        res.status(400).json({ message: 'Usuário sem conta vinculada' });
        return;
      }

      const supplier = await prisma.supplier.findUnique({
        where: { id: String(supplierId) },
        select: { userId: true, accountId: true },
      });
      if (!supplier) {
        res.status(404).json({ message: 'Supplier not found' });
        return;
      }
      if (supplier.accountId !== user.accountId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      if (user.role === 'SUPPLIER' && supplier.userId !== authUser.userId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
    }

    const result = await FinancialService.requestWithdrawal(
      String(supplierId),
      Number(amount),
      String(pixKey)
    );
    res.json({ message: 'Withdraw processed successfully', supplier: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Error processing withdraw', error: error.message });
  }
};

export const changePlan = async (req: Request, res: Response) => {
  const { supplierId, planId } = req.body;
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (authUser.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: { accountId: true, role: true },
      });
      if (!user?.accountId) {
        res.status(400).json({ message: 'Usuário sem conta vinculada' });
        return;
      }

      const supplier = await prisma.supplier.findUnique({
        where: { id: String(supplierId) },
        select: { userId: true, accountId: true },
      });
      if (!supplier) {
        res.status(404).json({ message: 'Supplier not found' });
        return;
      }
      if (supplier.accountId !== user.accountId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      if (user.role === 'SUPPLIER' && supplier.userId !== authUser.userId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
    }

    const supplier = await FinancialService.assignPlanToSupplier(String(supplierId), String(planId));
    res.json({ message: 'Plan changed successfully', supplier });
  } catch (error: any) {
    res.status(500).json({ message: 'Error changing plan', error: error.message });
  }
};

export const updateBillingInfo = async (req: Request, res: Response) => {
  const { supplierId, billingName, billingDoc, billingAddress, billingEmail } = req.body;
  
  try {
    const authUser = (req as any).user as { userId?: string; role?: string } | undefined;
    if (!authUser?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (authUser.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: { accountId: true, role: true },
      });
      if (!user?.accountId) {
        res.status(400).json({ message: 'Usuário sem conta vinculada' });
        return;
      }

      const supplier = await prisma.supplier.findUnique({
        where: { id: String(supplierId) },
        select: { userId: true, accountId: true },
      });
      if (!supplier) {
        res.status(404).json({ message: 'Supplier not found' });
        return;
      }
      if (supplier.accountId !== user.accountId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      if (user.role === 'SUPPLIER' && supplier.userId !== authUser.userId) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id: String(supplierId) },
      data: {
        billingName,
        billingDoc,
        billingAddress,
        billingEmail
      },
      include: { plan: true } // Return full object for frontend update
    });
    
    res.json({ message: 'Billing info updated successfully', supplier });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating billing info', error: error.message });
  }
};

// ==========================================
// ADMIN ACTIONS
// ==========================================

export const getAdminDashboard = async (req: Request, res: Response) => {
    try {
        const dashboard = await FinancialService.getAdminDashboard();
        res.json(dashboard);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching admin dashboard', error: error.message });
    }
};

export const listWithdrawalRequests = async (req: Request, res: Response) => {
    const { status, startDate, endDate, supplierId } = req.query;
    try {
        const requests = await FinancialService.getWithdrawalRequests(
            status ? String(status) : 'PENDING',
            startDate ? new Date(String(startDate)) : undefined,
            endDate ? new Date(String(endDate)) : undefined,
            supplierId ? String(supplierId) : undefined
        );
        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching withdrawal requests', error: error.message });
    }
};

export const approveWithdraw = async (req: Request, res: Response) => {
    const { id } = req.params;
    // @ts-ignore
    const adminId = req.user?.userId;
    
    try {
        const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
        const adminName = adminUser?.name || 'Admin';

        const request = await FinancialService.approveWithdrawal(id, adminId, adminName);
        res.json({ message: 'Withdrawal approved', request });
    } catch (error: any) {
        res.status(500).json({ message: 'Error approving withdrawal', error: error.message });
    }
};

export const rejectWithdraw = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    // @ts-ignore
    const adminId = req.user?.userId;

    try {
        const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
        const adminName = adminUser?.name || 'Admin';

        const request = await FinancialService.rejectWithdrawal(id, reason, adminId, adminName);
        res.json({ message: 'Withdrawal rejected', request });
    } catch (error: any) {
        res.status(500).json({ message: 'Error rejecting withdrawal', error: error.message });
    }
};

export const getFinancialSettings = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.financialSettings.findUnique({ where: { id: 'global' } });
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching settings', error: error.message });
    }
};

export const updateFinancialSettings = async (req: Request, res: Response) => {
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
        
        // Log this action
        // @ts-ignore
        const adminId = req.user?.userId;
        if (adminId) {
             const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
             await FinancialService.logAdminAction(
                 adminId,
                 adminUser?.name || 'Admin',
                 'UPDATE_SETTINGS',
                 'global',
                 'Configurações financeiras atualizadas',
                 JSON.stringify(settings)
             );
        }

        res.json({ message: 'Settings updated', settings });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating settings', error: error.message });
    }
};

export const getAdminSupplierFinancials = async (req: Request, res: Response) => {
    try {
        const { search, status } = req.query;
        const data = await FinancialService.getAdminSupplierFinancials(
            search ? String(search) : undefined,
            status ? String(status) : undefined
        );
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching supplier financials', error: error.message });
    }
};

export const getAdminAuditLogs = async (req: Request, res: Response) => {
    try {
        const { action, startDate, endDate } = req.query;
        const start = startDate ? new Date(String(startDate)) : undefined;
        const end = endDate ? new Date(String(endDate)) : undefined;

        const logs = await FinancialService.getAdminAuditLogs(
            action ? String(action) : undefined,
            start,
            end
        );
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
    }
};
