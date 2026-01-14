export interface LedgerEntry {
  id: string;
  type: 'SUBSCRIPTION_PAYMENT' | 'SALE_COMMISSION' | 'PAYOUT' | 'ADJUSTMENT' | 'SALE_REVENUE';
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  orderId?: string;
  releaseDate?: string;
}

export interface SupplierData {
  id: string;
  name: string;
  walletBalance: number;
  pendingBalance?: number;
  blockedBalance?: number;
  financialStatus: string;
  nextBillingDate: string | null;
  planId?: string;
  plan?: {
    id: string;
    name: string;
    monthlyPrice: number;
  };
  billingName?: string;
  billingDoc?: string;
  billingAddress?: string;
  billingEmail?: string;
}

export interface SupplierSubscriptionData {
  id: string;
  startDate: string;
  endDate: string;
  status: 'ATIVA' | 'PENDENTE' | 'VENCIDA' | 'SUSPENSA';
  plan: { id: string; name: string; cycleDays: number; limitOrders: number; commissionPercent: number };
}

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  cycleDays: number;
  commissionPercent: number;
  limitOrders: number;
  limitProducts: number;
  priorityLevel: number;
}

// Admin Types

export interface AdminDashboardStats {
  revenue: {
    commissions: number;
    subscriptions: number;
    total: number;
    gross?: number;
  };
  payouts: {
      totalPaid: number;
      pendingCount: number;
      pendingAmount: number;
  };
  balance: {
      totalHeld: number;
  };
  charts: {
      revenue: {
          labels: string[];
          datasets: { data: number[] }[];
      }
  }
}

export interface SupplierFinancial {
    id: string;
    name: string;
    financialStatus: string;
    walletBalance: number;
    pendingBalance: number;
    blockedBalance: number;
    totalCommission: number;
    totalWithdrawn?: number;
    plan: { name: string } | null;
    totalOrders: number;
    totalBalance: number;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  requestedAt: string;
  createdAt: string;
  processedAt?: string;
  pixKey: string;
  status: string;
  supplier: {
    name: string;
    billingDoc: string | null;
  };
}

export interface AdminLog {
    id: string;
    adminName: string;
    adminEmail?: string;
    action: string;
    details: string | null;
    createdAt: string;
    ipAddress?: string;
}

export interface FinancialSettings {
    defaultReleaseDays: number;
    defaultMinWithdrawal: number;
    defaultWithdrawalLimit: number;
}

export interface ReconciliationData {
    paidWithoutLedger: { id: string; orderNumber: string; totalAmount: number; supplierId: string }[];
    refundedWithoutLedger: { id: string; orderNumber: string; totalAmount: number; supplierId: string }[];
    orphanedLedgers: { id: string; amount: number; type: string; referenceId: string }[];
}

export interface OperationalAlerts {
    paidNoLedger: number;
    delayedWithdrawals: number;
    suspendedWithBalance: number;
    processedWebhooksToday: number;
}
