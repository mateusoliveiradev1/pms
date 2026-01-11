import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadow } from '../../../ui/theme';
import { OperationalAlerts as AlertsType } from '../types';

interface Props {
    alerts: AlertsType | null;
}

const OperationalAlerts = ({ alerts }: Props) => {
    if (!alerts) return null;

    const items = [
        { label: 'Sem Ledger', value: alerts.paidNoLedger, color: colors.error, icon: '⚠️' },
        { label: 'Saques Atrasados', value: alerts.delayedWithdrawals, color: colors.warning, icon: '⏳' },
        { label: 'Suspensos c/ Saldo', value: alerts.suspendedWithBalance, color: colors.secondary, icon: '🚫' },
        { label: 'Webhooks Hoje', value: alerts.processedWebhooksToday, color: colors.primary, icon: '🔄' },
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Alertas Operacionais</Text>
            <View style={styles.grid}>
                {items.map((item, index) => (
                    <View key={index} style={[styles.card, { borderLeftColor: item.color }]}>
                        <Text style={styles.icon}>{item.icon}</Text>
                        <View>
                            <Text style={styles.value}>{item.value}</Text>
                            <Text style={styles.label}>{item.label}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.sm,
        marginLeft: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    card: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#fff',
        padding: spacing.sm,
        borderRadius: radius.md,
        ...shadow.small,
        borderLeftWidth: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        fontSize: 20,
        marginRight: 10,
    },
    value: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    label: {
        fontSize: 12,
        color: colors.textSecondary,
    }
});

export default OperationalAlerts;
