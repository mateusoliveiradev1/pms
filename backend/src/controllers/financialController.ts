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

        res.json({
            supplier,
            ledger
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching supplier financials', error: error.message });
    }
};

export const withdrawFunds = async (req: Request, res: Response) => {
  const { supplierId, amount, pixKey } = req.body;
  try {
    const result = await FinancialService.processWithdraw(
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
