import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import api from '../../../services/api';
import { 
    AdminDashboardStats, 
    SupplierFinancial, 
    WithdrawalRequest, 
    AdminLog, 
    FinancialSettings,
    ReconciliationData,
    OperationalAlerts
} from '../types';

export const useAdminDashboard = () => {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [suppliers, setSuppliers] = useState<SupplierFinancial[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [auditLogs, setAuditLogs] = useState<AdminLog[]>([]);
    const [settings, setSettings] = useState<FinancialSettings | null>(null);
    
    const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
    const [alerts, setAlerts] = useState<OperationalAlerts | null>(null);

    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboard = async (startDate?: Date, endDate?: Date) => {
        try {
            const params: any = {};
            if (startDate) params.startDate = startDate.toISOString();
            if (endDate) params.endDate = endDate.toISOString();

            // Using NEW endpoint for overview with date filters
            const res = await api.get('/financial-admin/overview', { params });
            setStats(res.data);
            
            // Also fetch alerts
            fetchAlerts();
        } catch (e) { console.error(e); }
    };

    const fetchAlerts = async () => {
        try {
            const res = await api.get('/financial-admin/alerts');
            setAlerts(res.data);
        } catch (e) { console.error('Error fetching alerts:', e); }
    };

    const fetchReconciliation = async (filters?: { startDate?: Date, endDate?: Date, supplierId?: string }) => {
        try {
            const params: any = {};
            if (filters?.startDate) params.startDate = filters.startDate.toISOString();
            if (filters?.endDate) params.endDate = filters.endDate.toISOString();
            if (filters?.supplierId) params.supplierId = filters.supplierId;

            const res = await api.get('/financial-admin/reconciliation', { params });
            setReconciliation(res.data);
        } catch (e) { console.error('Error fetching reconciliation:', e); }
    };

    const fetchWithdrawals = async (status: string, filters?: { startDate?: Date, endDate?: Date, supplierId?: string }) => {
        try {
            const params: any = { status };
            if (filters?.startDate) params.startDate = filters.startDate.toISOString();
            if (filters?.endDate) params.endDate = filters.endDate.toISOString();
            if (filters?.supplierId) params.supplierId = filters.supplierId;

            const res = await api.get('/financial/admin/withdrawals', { params });
            setWithdrawals(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchSuppliers = async (search: string, status: string) => {
        try {
            // Using NEW endpoint for consolidated view
            const res = await api.get('/financial-admin/suppliers', {
                params: { search, status }
            });
            setSuppliers(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/financial/admin/settings');
            const data = res.data || {
                defaultReleaseDays: 14,
                defaultMinWithdrawal: 50,
                defaultWithdrawalLimit: 4
            };
            setSettings(data);
        } catch (e) { console.error(e); }
    };

    const fetchAudit = async (filters?: { action?: string, startDate?: Date, endDate?: Date }) => {
        try {
            const params: any = {};
            if (filters?.action && filters.action !== 'ALL') params.action = filters.action;
            if (filters?.startDate) params.startDate = filters.startDate.toISOString();
            if (filters?.endDate) params.endDate = filters.endDate.toISOString();

            const res = await api.get('/financial/admin/audit', { params });
            setAuditLogs(res.data);
        } catch (e) { console.error(e); }
    };

    const approveWithdrawal = async (requestId: string) => {
        try {
            await api.post(`/financial/admin/withdrawals/${requestId}/approve`);
            Alert.alert('Sucesso', 'Saque aprovado e processado.');
            return true;
        } catch (error) {
            Alert.alert('Erro', 'Falha ao aprovar saque.');
            return false;
        }
    };

    const rejectWithdrawal = async (requestId: string, reason: string) => {
        try {
            await api.post(`/financial/admin/withdrawals/${requestId}/reject`, { reason });
            Alert.alert('Sucesso', 'Saque rejeitado.');
            return true;
        } catch (error) {
            Alert.alert('Erro', 'Falha ao rejeitar saque.');
            return false;
        }
    };

    const updateSettings = async (newSettings: FinancialSettings) => {
        try {
            await api.put('/financial/admin/settings', newSettings);
            Alert.alert('Sucesso', 'Configurações atualizadas.');
            setSettings(newSettings);
            return true;
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar configurações.');
            return false;
        }
    };

    return {
        stats,
        suppliers,
        withdrawals,
        auditLogs,
        settings,
        reconciliation,
        alerts,
        loading,
        refreshing,
        setRefreshing,
        setLoading,
        fetchDashboard,
        fetchWithdrawals,
        fetchSuppliers,
        fetchSettings,
        fetchAudit,
        fetchReconciliation,
        fetchAlerts,
        approveWithdrawal,
        rejectWithdrawal,
        updateSettings
    };
};
