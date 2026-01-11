import { FinancialService } from './financialService';
import prisma from '../prisma';
import { logFinancialEvent } from '../lib/logger';

// Mock logger
jest.mock('../lib/logger', () => ({
  logFinancialEvent: jest.fn(),
}));

// Mock prisma
jest.mock('../prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    supplier: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    withdrawalRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    financialLedger: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
    },
    adminLog: {
      create: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    financialSettings: {
      findUnique: jest.fn(),
    },
    supplierSubscription: {
      findFirst: jest.fn(),
    }
  },
}));

describe('FinancialService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock transaction to execute callback immediately
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(prisma);
    });
  });

  describe('calculateOrderFinancials', () => {
    it('should correctly calculate splits with 10% commission', () => {
      const total = 100.00;
      const commission = 10;
      const result = FinancialService.calculateOrderFinancials(total, commission, 0);
      expect(result.platformCommission).toBe(10.00);
      expect(result.supplierPayout).toBe(90.00);
    });
  });

  describe('confirmOrderPayment', () => {
    it('should process payment, create ledger entries, and update supplier balance', async () => {
      const orderId = 'order-123';
      const supplierId = 'supplier-123';
      
      const mockOrder = {
        id: orderId,
        orderNumber: '1001',
        paymentStatus: 'PENDING',
        status: 'PENDING',
        supplierId,
        commissionValue: 10,
        netValue: 90,
        supplier: {
          id: supplierId,
          plan: { releaseDays: 14 }
        }
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, paymentStatus: 'PAID' });
      (prisma.supplier.update as jest.Mock).mockResolvedValue({});

      await FinancialService.confirmOrderPayment(orderId, 'MERCADOPAGO', 'ext-123', 100.00);

      // Verify Order Update
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: orderId },
        data: expect.objectContaining({ paymentStatus: 'PAID', payoutStatus: 'PENDING' })
      }));

      // Verify Ledger Creation (3 entries: Payment, Commission, Credit Pending)
      expect(prisma.financialLedger.create).toHaveBeenCalledTimes(3);
      
      // Verify Supplier Balance Update
      expect(prisma.supplier.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: supplierId },
        data: { pendingBalance: { increment: 90 } }
      }));

      // Verify Audit Log
      expect(logFinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'PAYMENT_CONFIRMED',
        amount: 100.00
      }));
    });

    it('should be idempotent (not process already paid orders)', async () => {
      const mockOrder = {
        id: 'order-paid',
        paymentStatus: 'PAID',
        supplier: { id: 's1' }
      };
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      await FinancialService.confirmOrderPayment('order-paid', 'MP', '123', 100);

      expect(prisma.financialLedger.create).not.toHaveBeenCalled();
      expect(prisma.supplier.update).not.toHaveBeenCalled();
    });
  });

  describe('requestWithdrawal', () => {
    it('should create withdrawal request if balance is sufficient', async () => {
      const supplierId = 'supplier-123';
      const amount = 50.00;
      
      const mockSupplier = {
        id: supplierId,
        walletBalance: 100.00, // Sufficient
        blockedBalance: 0,
        pendingBalance: 0,
        financialStatus: 'ACTIVE',
        verificationStatus: 'VERIFIED'
      };

      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(mockSupplier);
      (prisma.supplier.update as jest.Mock).mockResolvedValue(mockSupplier);
      (prisma.withdrawalRequest.create as jest.Mock).mockResolvedValue({ id: 'req-1', amount, status: 'PENDING' });
      (prisma.supplierSubscription.findFirst as jest.Mock).mockResolvedValue({ id: 'sub-1', status: 'ATIVA' });
      (prisma.withdrawalRequest.count as jest.Mock).mockResolvedValue(0);

      await FinancialService.requestWithdrawal(supplierId, amount, 'PIX-KEY');

      // Verify Balance Deduction (Move to Blocked)
      expect(prisma.supplier.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: supplierId },
        data: {
          walletBalance: { decrement: amount },
          blockedBalance: { increment: amount }
        }
      }));

      // Verify Request Creation
      expect(prisma.withdrawalRequest.create).toHaveBeenCalled();

      // Verify Log
      expect(logFinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'WITHDRAWAL_REQUESTED',
        amount: amount
      }));
    });

    it('should throw error if balance is insufficient', async () => {
      const supplierId = 'supplier-poor';
      const mockSupplier = {
        id: supplierId,
        walletBalance: 10.00, // Insufficient
        blockedBalance: 0,
        verificationStatus: 'VERIFIED',
        financialStatus: 'ACTIVE'
      };
      (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(mockSupplier);
      
      // Mock active subscription to pass check
      (prisma.supplierSubscription.findFirst as jest.Mock).mockResolvedValue({ id: 'sub-1', status: 'ATIVA' });

      await expect(FinancialService.requestWithdrawal(supplierId, 50.00, 'KEY'))
        .rejects.toThrow('Saldo disponível insuficiente.');
      
      expect(prisma.withdrawalRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('approveWithdrawal', () => {
    it('should approve withdrawal, update blocked balance and create payout ledger', async () => {
      const reqId = 'req-1';
      const adminId = 'admin-1';
      
      const mockReq = {
        id: reqId,
        status: 'PENDING',
        amount: 50.00,
        supplierId: 's1'
      };

      (prisma.withdrawalRequest.findUnique as jest.Mock).mockResolvedValue(mockReq);
      (prisma.withdrawalRequest.update as jest.Mock).mockResolvedValue({ ...mockReq, status: 'PAID' });

      await FinancialService.approveWithdrawal(reqId, adminId, 'Admin Name');

      // Verify Balance (Remove from Blocked)
      expect(prisma.supplier.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 's1' },
        data: { blockedBalance: { decrement: 50.00 } }
      }));

      // Verify Ledger (PAYOUT)
      expect(prisma.financialLedger.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'PAYOUT', amount: 50.00 })
      }));

      // Verify Log
      expect(logFinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'WITHDRAWAL_PAID'
      }));
    });

    it('should reject withdrawal, return balance and log event', async () => {
      const reqId = 'req-reject';
      const adminId = 'admin-1';
      const amount = 50.00;
      
      const mockReq = {
        id: reqId,
        status: 'PENDING',
        amount,
        supplierId: 's1'
      };

      (prisma.withdrawalRequest.findUnique as jest.Mock).mockResolvedValue(mockReq);
      (prisma.withdrawalRequest.update as jest.Mock).mockResolvedValue({ ...mockReq, status: 'REJECTED' });

      await FinancialService.rejectWithdrawal(reqId, 'Invalid Key', adminId, 'Admin');

      // Verify Balance (Return to Wallet from Blocked)
      expect(prisma.supplier.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 's1' },
        data: { 
            blockedBalance: { decrement: amount },
            walletBalance: { increment: amount }
        }
      }));

      // Verify Log
      expect(logFinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'WITHDRAWAL_REJECTED',
        amount,
        details: expect.objectContaining({ reason: 'Invalid Key' })
      }));
    });
  });

  describe('processReleases', () => {
    it('should release pending items and log event', async () => {
        const supplierId = 's1';
        const now = new Date();
        
        const mockItems = [
            { id: 'l1', amount: 50, supplierId, status: 'PENDING', referenceId: 'ref1' },
            { id: 'l2', amount: 50, supplierId, status: 'PENDING', referenceId: 'ref2' }
        ];

        (prisma.financialLedger.findMany as jest.Mock).mockResolvedValue(mockItems);
        (prisma.financialLedger.update as jest.Mock).mockResolvedValue({});
        (prisma.financialLedger.create as jest.Mock).mockResolvedValue({});
        (prisma.supplier.update as jest.Mock).mockResolvedValue({});

        const result = await FinancialService.processReleases(supplierId);

        expect(result.releasedAmount).toBe(100);
        expect(result.count).toBe(2);

        // Verify Status Updates (2 items)
        expect(prisma.financialLedger.update).toHaveBeenCalledTimes(2);

        // Verify Balance Release Entries (2 items)
        expect(prisma.financialLedger.create).toHaveBeenCalledTimes(2);
        
        // Verify Supplier Balance Update
        expect(prisma.supplier.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: supplierId },
            data: {
                walletBalance: { increment: 100 },
                pendingBalance: { decrement: 100 }
            }
        }));

        // Verify Log
        expect(logFinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'BALANCE_RELEASED',
            amount: 100,
            details: { count: 2 }
        }));
    });
  });

  describe('processOrderRefund', () => {
    it('should refund order, update balances and log event', async () => {
      const orderId = 'order-refund';
      const supplierId = 'supplier-refund';
      
      const mockOrder = {
        id: orderId,
        orderNumber: '999',
        paymentStatus: 'PAID',
        status: 'PAID',
        supplierId,
        commissionValue: 10,
        netValue: 90
      };

      const mockCreditEntry = {
          id: 'ledger-1',
          status: 'PENDING',
          releaseDate: new Date()
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.financialLedger.findFirst as jest.Mock).mockResolvedValue(mockCreditEntry);
      (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });

      await FinancialService.processOrderRefund(orderId, 'Customer Request');

      // Verify Ledger Creations (Refund, Commission Refund)
      expect(prisma.financialLedger.create).toHaveBeenCalled();

      // Verify Log
      expect(logFinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'REFUND_PROCESSED',
        amount: 90,
        details: expect.objectContaining({ reason: 'Customer Request' })
      }));
    });
  });
});
