import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Routes';
import { colors, spacing } from '../../ui/theme';

import { useWallet } from './hooks/useWallet';
import { useWithdraw } from './hooks/useWithdraw';
import BalanceCards from './components/BalanceCards';
import TransactionsList from './components/TransactionsList';
import WithdrawModal from './components/WithdrawModal';
import { LedgerEntry } from './types';

type FinancialScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Financial'>;

const FinancialScreen: React.FC = () => {
    const navigation = useNavigation<FinancialScreenNavigationProp>();
    const { supplier, ledger, limits, loading, refreshing, loadData } = useWallet();
    const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
    const [amount, setAmount] = useState('');
    const [pixKey, setPixKey] = useState('');

    const { requestWithdraw, loading: withdrawLoading } = useWithdraw(() => {
        setWithdrawModalVisible(false);
        setAmount('');
        loadData();
    });

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleWithdraw = () => {
        if (supplier) requestWithdraw(supplier.id, parseFloat(amount), pixKey);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const handleViewReceipt = (entry: LedgerEntry) => {
        navigation.navigate('Receipt', { entry });
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView 
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
            >
                <Text style={styles.headerTitle}>Minha Carteira</Text>
                
                <BalanceCards supplier={supplier} formatCurrency={formatCurrency} />

                <View style={styles.actionsContainer}>
                    <TouchableOpacity onPress={() => setWithdrawModalVisible(true)}>
                        <Text style={styles.withdrawLink}>Solicitar Saque</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Histórico de Movimentações</Text>
                <TransactionsList ledger={ledger} onViewReceipt={handleViewReceipt} />
            </ScrollView>

            <WithdrawModal 
                visible={withdrawModalVisible}
                onClose={() => setWithdrawModalVisible(false)}
                onConfirm={handleWithdraw}
                amount={amount}
                setAmount={setAmount}
                pixKey={pixKey}
                setPixKey={setPixKey}
                loading={withdrawLoading}
                limits={limits}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: spacing.md,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
        marginTop: spacing.md,
    },
    actionsContainer: {
        alignItems: 'flex-end',
        marginBottom: spacing.md,
    },
    withdrawLink: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default FinancialScreen;
