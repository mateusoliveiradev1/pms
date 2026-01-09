import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from '../../../ui/theme';
import { AdminDashboardStats } from '../types';

interface AdminStatsCardsProps {
    stats: AdminDashboardStats | null;
    formatCurrency: (val: number) => string;
}

const AdminStatsCards: React.FC<AdminStatsCardsProps> = ({ stats, formatCurrency }) => {
    if (!stats) return null;

    return (
        <View>
            <View style={styles.kpiContainer}>
                <View style={[styles.kpiCard, { backgroundColor: colors.primary }]}>
                    <Text style={styles.kpiLabelLight}>Receita Bruta</Text>
                    <Text style={styles.kpiValueLight}>{formatCurrency(stats.revenue.total)}</Text>
                    <Text style={styles.kpiSubLight}>Comissões: {formatCurrency(stats.revenue.commissions)}</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: '#fff' }]}>
                    <Text style={styles.kpiLabel}>MRR (Planos)</Text>
                    <Text style={styles.kpiValue}>{formatCurrency(stats.revenue.subscriptions)}</Text>
                </View>
            </View>

            <View style={styles.kpiContainer}>
                <View style={[styles.kpiCard, { backgroundColor: '#fff' }]}>
                    <Text style={styles.kpiLabel}>Total Pago</Text>
                    <Text style={[styles.kpiValue, { color: colors.success }]}>{formatCurrency(stats.payouts.totalPaid)}</Text>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: '#fff' }]}>
                    <Text style={styles.kpiLabel}>Saldo Retido</Text>
                    <Text style={[styles.kpiValue, { color: colors.warning }]}>{formatCurrency(stats.balance.totalHeld)}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    kpiContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    kpiCard: {
        width: '48%',
        padding: spacing.md,
        borderRadius: radius.md,
        ...shadow.small,
        minHeight: 100,
        justifyContent: 'center',
    },
    kpiLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    kpiValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    kpiLabelLight: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    kpiValueLight: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    kpiSubLight: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
});

export default AdminStatsCards;
