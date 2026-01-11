import { PaymentService } from './paymentService';
import prisma from '../prisma';
import { logFinancialEvent } from '../lib/logger';

// Mock logger
jest.mock('../lib/logger', () => ({
  logFinancialEvent: jest.fn(),
}));

// Mock prisma
jest.mock('../prisma', () => {
  return {
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    processedWebhookEvent: {
      create: jest.fn(),
    },
    financialLedger: {
      create: jest.fn(),
    },
    supplier: {
      update: jest.fn(),
    },
    adminLog: {
      create: jest.fn(),
    }
  },
};
});

describe('PaymentService', () => {
    beforeEach(() => {
    jest.clearAllMocks();
    // Mock transaction to execute callback immediately, passing the mocked prisma object as tx
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(prisma);
    });
  });

  describe('processSuccessfulOrderPayment', () => {
    it('should process payment, create ledger entries, and log event', async () => {
      const orderId = 'order-1';
      const externalId = 'ext-1';
      const amountPaid = 100.00;
      const gateway = 'MERCADO_PAGO';
      const eventId = 'evt-1';
      const supplierId = 'supplier-1';

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
          plan: { releaseDays: 14, commissionPercent: 10 }
        }
      };

      (prisma.order.findUnique as jest.Mock).mockImplementation((args) => {
        return Promise.resolve(mockOrder);
      });
      (prisma.processedWebhookEvent.create as jest.Mock).mockResolvedValue({});
      (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, paymentStatus: 'PAID' });
      (prisma.financialLedger.create as jest.Mock).mockResolvedValue({});
      (prisma.supplier.update as jest.Mock).mockResolvedValue({});
      (prisma.adminLog.create as jest.Mock).mockResolvedValue({});

      await PaymentService.processSuccessfulOrderPayment(orderId, externalId, amountPaid, gateway, eventId);

      // Verify Ledger Creation
      expect(prisma.financialLedger.create).toHaveBeenCalledTimes(3); // Payment, Commission, Credit Pending

      // Verify Audit Log
      expect(logFinancialEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'PAYMENT_CONFIRMED',
        amount: amountPaid,
        referenceId: orderId,
        supplierId: supplierId,
        details: expect.objectContaining({ gateway, externalId })
      }));
    });

    it('should be idempotent (skip if already paid)', async () => {
      const orderId = 'order-paid';
      const mockOrder = {
        id: orderId,
        paymentStatus: 'PAID',
        supplier: { id: 's1' }
      };

      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.processedWebhookEvent.create as jest.Mock).mockResolvedValue({});

      await PaymentService.processSuccessfulOrderPayment(orderId, 'ext', 100, 'MP', 'evt');

      expect(prisma.financialLedger.create).not.toHaveBeenCalled();
      expect(logFinancialEvent).not.toHaveBeenCalled();
    });
  });
});
