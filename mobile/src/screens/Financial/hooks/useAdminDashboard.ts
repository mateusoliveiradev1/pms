import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import api from '../../../services/api';
import { AdminDashboardStats, SupplierFinancial, WithdrawalRequest, AdminLog, FinancialSettings } from '../types';

export const useAdminDashboard = () => {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [suppliers, setSuppliers] = useState<SupplierFinancial[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [auditLogs, setAuditLogs] = useState<AdminLog[]>([]);
    const [settings, setSettings] = useState<FinancialSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/financial/admin/dashboard');
            setStats(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchWithdrawals = async (status: string) => {
        try {
            const res = await api.get('/financial/admin/withdrawals', {
                params: { status }
            });
            setWithdrawals(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchSuppliers = async (search: string, status: string) => {
        try {
            const res = await api.get('/financial/admin/suppliers', {
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

    const fetchAudit = async () => {
        try {
            const res = await api.get('/financial/admin/audit');
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
        loading,
        refreshing,
        setRefreshing,
        setLoading,
        fetchDashboard,
        fetchWithdrawals,
        fetchSuppliers,
        fetchSettings,
        fetchAudit,
        approveWithdrawal,
        rejectWithdrawal,
        updateSettings
    };
};
