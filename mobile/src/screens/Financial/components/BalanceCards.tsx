import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from '../../../ui/theme';
import { SupplierData } from '../types';

interface BalanceCardsProps {
    supplier: SupplierData | null;
    formatCurrency: (value: number) => string;
}

const BalanceCards: React.FC<BalanceCardsProps> = ({ supplier, formatCurrency }) => {
    if (!supplier) return null;

    return (
        <View style={styles.balanceContainer}>
            <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
                <Text style={styles.balanceLabelLight}>Saldo Disponível</Text>
                <Text style={styles.balanceValueLight}>{formatCurrency(supplier.walletBalance)}</Text>
            </View>
            <View style={[styles.balanceCard, { backgroundColor: '#fff' }]}>
                <Text style={styles.balanceLabelLight}>A Liberar</Text>
                <Text style={styles.balanceValueLight}>{formatCurrency(supplier.pendingBalance || 0)}</Text>
            </View>
            <View style={[styles.balanceCard, { backgroundColor: '#fff' }]}>
                <Text style={styles.balanceLabelLight}>Bloqueado</Text>
                <Text style={[styles.balanceValue, { color: colors.error }]}>{formatCurrency(supplier.blockedBalance || 0)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    balanceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    balanceCard: {
        width: '31%',
        padding: spacing.sm,
        borderRadius: radius.md,
        ...shadow.small,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
    },
    balanceLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        marginBottom: 4,
        textAlign: 'center',
    },
    balanceValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },
    balanceLabelLight: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
        textAlign: 'center',
    },
    balanceValueLight: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
});

export default BalanceCards;
