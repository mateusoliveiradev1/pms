import prisma from '../prisma';

export interface DailyFinancialSummary {
  date: Date;
  total_gmv: number;
  total_commission: number;
  total_net_revenue: number;
  total_pending_balance: number;
  total_available_balance: number;
}

export interface SupplierFinancialKPI {
  supplierId: string;
  supplierName: string;
  available_balance: number;
  pending_balance: number;
  gmv_total: number;
  commission_total: number;
  net_revenue: number;
  withdrawals_total: number;
  withdrawals_pending: number;
}

export interface FinancialAnomaly {
  type: string;
  referenceId: string;
  description: string;
  severity_value: number;
  detectedAt: Date;
}

export const BiFinancialService = {
  getGlobalKPIs: async (period: '7d' | '30d' | 'all' = '30d'): Promise<DailyFinancialSummary[]> => {
    let limitClause = '';
    if (period === '7d') limitClause = "WHERE date >= NOW() - INTERVAL '7 days'";
    if (period === '30d') limitClause = "WHERE date >= NOW() - INTERVAL '30 days'";

    // Use Prisma raw query to fetch from the view
    // Note: Prisma raw query returns fields as they are in DB (snake_case usually if unmapped, but View columns were quoted)
    // The view columns are: date, total_gmv, total_commission, total_net_revenue, total_pending_balance, total_available_balance
    const result = await prisma.$queryRawUnsafe<DailyFinancialSummary[]>(
      `SELECT * FROM daily_financial_summary ${limitClause} ORDER BY date DESC`
    );

    // Cast numbers from string (Postgres BigInt/Numeric often come as strings/objects) if necessary.
    // Usually Prisma handles Float well, but Numeric/Decimal might be Decimal.js.
    // Since view sums floats, it should be fine.
    return result;
  },

  getSupplierKPIs: async (supplierId?: string): Promise<SupplierFinancialKPI[]> => {
    let whereClause = '';
    if (supplierId) {
      whereClause = `WHERE "supplierId" = '${supplierId}'`;
    }

    const result = await prisma.$queryRawUnsafe<SupplierFinancialKPI[]>(
      `SELECT * FROM supplier_financial_kpis ${whereClause} ORDER BY "gmv_total" DESC LIMIT 100`
    );
    return result;
  },

  getDailyRevenue: async (period: '7d' | '30d' | '90d' = '30d'): Promise<any[]> => {
    // Reusing the summary view but focusing on revenue
    let limitClause = '';
    if (period === '7d') limitClause = "WHERE date >= NOW() - INTERVAL '7 days'";
    if (period === '30d') limitClause = "WHERE date >= NOW() - INTERVAL '30 days'";
    if (period === '90d') limitClause = "WHERE date >= NOW() - INTERVAL '90 days'";

    return await prisma.$queryRawUnsafe(
      `SELECT date, total_net_revenue, total_commission FROM daily_financial_summary ${limitClause} ORDER BY date ASC`
    );
  },

  getFinancialAnomalies: async (): Promise<FinancialAnomaly[]> => {
    return await prisma.$queryRaw<FinancialAnomaly[]>`SELECT * FROM financial_anomalies_view ORDER BY "severity_value" DESC`;
  }
};
