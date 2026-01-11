import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

export interface DailyFinancialSummary {
  date: string;
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
  detectedAt: string;
}

export interface BIOverviewResponse {
  stats: DailyFinancialSummary[];
  totals: {
    gmv: number;
    commission: number;
    netRevenue: number;
    pendingBalance: number;
    availableBalance: number;
  };
}

export const useBIFinancial = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [overview, setOverview] = useState<BIOverviewResponse | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [suppliersKPIs, setSuppliersKPIs] = useState<SupplierFinancialKPI[]>([]);
  const [anomalies, setAnomalies] = useState<FinancialAnomaly[]>([]);

  const fetchOverview = useCallback(async (period: '7d' | '30d' | 'all' = '30d') => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/bi/overview', { params: { period } });
      setOverview(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch overview');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDailyRevenue = useCallback(async (period: '7d' | '30d' | '90d' = '30d') => {
    try {
      const response = await api.get('/admin/bi/daily-revenue', { params: { period } });
      setDailyRevenue(response.data);
    } catch (err: any) {
      console.error('Fetch daily revenue error', err);
    }
  }, []);

  const fetchSuppliersKPIs = useCallback(async () => {
    try {
      const response = await api.get('/admin/bi/suppliers');
      setSuppliersKPIs(response.data);
    } catch (err: any) {
      console.error('Fetch suppliers KPIs error', err);
    }
  }, []);

  const fetchAnomalies = useCallback(async () => {
    try {
      const response = await api.get('/admin/bi/anomalies');
      setAnomalies(response.data);
    } catch (err: any) {
      console.error('Fetch anomalies error', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchOverview(),
      fetchDailyRevenue(),
      fetchSuppliersKPIs(),
      fetchAnomalies()
    ]);
    setLoading(false);
  }, [fetchOverview, fetchDailyRevenue, fetchSuppliersKPIs, fetchAnomalies]);

  return {
    loading,
    error,
    overview,
    dailyRevenue,
    suppliersKPIs,
    anomalies,
    fetchOverview,
    fetchDailyRevenue,
    fetchSuppliersKPIs,
    fetchAnomalies,
    refreshAll
  };
};
