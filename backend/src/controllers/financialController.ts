import { Request, Response } from 'express';
import { FinancialService } from '../services/financialService';
import prisma from '../prisma';

export const checkOverdue = async (req: Request, res: Response) => {
  try {
    const results = await FinancialService.updateOverdueSuppliers();
    res.json({ message: 'Overdue check completed', updatedCount: results.length, details: results });
  } catch (error: any) {
    res.status(500).json({ message: 'Error checking overdue suppliers', error: error.message });
  }
};

export const paySubscription = async (req: Request, res: Response) => {
  const { supplierId, amount, method } = req.body;
  try {
    const result = await FinancialService.processSubscriptionPayment(
      String(supplierId),
      Number(amount),
      method === 'BALANCE' ? 'BALANCE' : 'CARD'
    );
    res.json({ message: 'Subscription paid successfully', supplier: result });
  } catch (error: any) {
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

export const getLedger = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.query;
    const where = supplierId ? { supplierId: String(supplierId) } : {};
    
    const ledger = await prisma.financialLedger.findMany({
      where,
      include: { supplier: true, order: true },
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
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: { plan: true }
        });
        
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        const ledger = await prisma.financialLedger.findMany({
            where: { supplierId: id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        
        const subscription = await prisma.supplierSubscription.findFirst({
            where: { supplierId: id, status: 'ATIVA' },
            include: { plan: true }
        });

        res.json({
            supplier,
            ledger,
            subscription
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching supplier financials', error: error.message });
    }
};

export const withdrawFunds = async (req: Request, res: Response) => {
  const { supplierId, amount, pixKey } = req.body;
  try {
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
    const supplier = await FinancialService.assignPlanToSupplier(String(supplierId), String(planId));
    res.json({ message: 'Plan changed successfully', supplier });
  } catch (error: any) {
    res.status(500).json({ message: 'Error changing plan', error: error.message });
  }
};

export const updateBillingInfo = async (req: Request, res: Response) => {
  const { supplierId, billingName, billingDoc, billingAddress, billingEmail } = req.body;
  
  try {
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
    const { status } = req.query;
    try {
        const requests = await FinancialService.getWithdrawalRequests(status ? String(status) : 'PENDING');
        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching withdrawal requests', error: error.message });
    }
};

export const approveWithdraw = async (req: Request, res: Response) => {
    const { id } = req.params;
    // @ts-ignore
    const adminId = req.user?.id || 'admin'; // Fallback if no user attached (should be protected by auth middleware)
    
    try {
        const request = await FinancialService.approveWithdrawal(id, adminId);
        res.json({ message: 'Withdrawal approved', request });
    } catch (error: any) {
        res.status(500).json({ message: 'Error approving withdrawal', error: error.message });
    }
};

export const rejectWithdraw = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    // @ts-ignore
    const adminId = req.user?.id || 'admin';

    try {
        const request = await FinancialService.rejectWithdrawal(id, reason, adminId);
        res.json({ message: 'Withdrawal rejected', request });
    } catch (error: any) {
        res.status(500).json({ message: 'Error rejecting withdrawal', error: error.message });
    }
};
