import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import api from '../../../services/api';
import { SupplierData, LedgerEntry, SupplierSubscriptionData } from '../types';

export const useWallet = () => {
    const [supplier, setSupplier] = useState<SupplierData | null>(null);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [subscription, setSubscription] = useState<SupplierSubscriptionData | null>(null);
    const [limits, setLimits] = useState<{ min: number; limitCount: number; usedCount: number; remaining: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);

            const suppliersRes = await api.get('/suppliers');
            const firstSupplier = suppliersRes.data[0];

            if (firstSupplier) {
                const financialRes = await api.get(`/financial/supplier/${firstSupplier.id}`);
                setSupplier(financialRes.data.supplier);
                setLedger(financialRes.data.ledger);
                setSubscription(financialRes.data.subscription || null);
                setLimits(financialRes.data.withdrawalLimits || null);
            } else {
                Alert.alert('Aviso', 'Nenhum fornecedor vinculado a este usuário.');
            }
        } catch (error) {
            console.log('Error loading financial data', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados financeiros.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    return {
        supplier,
        ledger,
        subscription,
        limits,
        loading,
        refreshing,
        loadData
    };
};
