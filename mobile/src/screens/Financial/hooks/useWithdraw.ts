import { useState } from 'react';
import { Alert } from 'react-native';
import api from '../../../services/api';

export const useWithdraw = (onSuccess: () => void) => {
    const [loading, setLoading] = useState(false);

    const requestWithdraw = async (supplierId: string, amount: number, pixKey: string) => {
        if (!amount || isNaN(amount) || amount <= 0) {
            Alert.alert('Erro', 'Valor inválido.');
            return;
        }
        if (!pixKey) {
            Alert.alert('Erro', 'Informe a chave PIX.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/financial/withdraw', {
                supplierId,
                amount,
                pixKey
            });
            Alert.alert('Sucesso', 'Solicitação de saque enviada.');
            onSuccess();
            return true;
        } catch (error: any) {
            Alert.alert('Erro', error.response?.data?.message || 'Falha ao solicitar saque.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        requestWithdraw,
        loading
    };
};
