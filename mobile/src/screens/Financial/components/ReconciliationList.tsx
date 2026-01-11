import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, radius, spacing, shadow } from '../../../ui/theme';
import { ReconciliationData } from '../types';

interface Props {
    data: ReconciliationData | null;
}

const ReconciliationList = ({ data }: Props) => {
    if (!data) return <Text style={styles.loadingText}>Carregando reconciliação...</Text>;

    const allIssues = [
        ...data.paidWithoutLedger.map(i => ({ ...i, type: 'PAID_NO_LEDGER', title: 'Pago s/ Ledger' })),
        ...data.refundedWithoutLedger.map(i => ({ ...i, type: 'REFUNDED_NO_LEDGER', title: 'Reembolso s/ Ledger' })),
        ...data.orphanedLedgers.map(i => ({ ...i, type: 'LEDGER_NO_ORDER', title: 'Ledger Órfão' }))
    ];

    if (allIssues.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>✅ Nenhuma divergência encontrada.</Text>
                <Text style={styles.subText}>Todos os pedidos e lançamentos estão sincronizados.</Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, styles.errorBorder]}>
            <View style={styles.header}>
                <Text style={styles.issueTitle}>{item.title}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>⚠️ Crítico</Text>
                </View>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Ref ID:</Text>
                <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">{item.id}</Text>
            </View>
            {item.orderNumber && (
                <View style={styles.row}>
                    <Text style={styles.label}>Pedido:</Text>
                    <Text style={styles.value}>{item.orderNumber}</Text>
                </View>
            )}
            <View style={styles.row}>
                <Text style={styles.label}>Valor Envolvido:</Text>
                <Text style={styles.value}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalAmount || item.amount || 0)}
                </Text>
            </View>
            {item.supplierId && (
                <View style={styles.row}>
                     <Text style={styles.label}>Fornecedor ID:</Text>
                     <Text style={styles.value} numberOfLines={1}>{item.supplierId}</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Divergências Financeiras ({allIssues.length})</Text>
            <FlatList
                data={allIssues}
                renderItem={renderItem}
                keyExtractor={(item) => item.id + item.type}
                scrollEnabled={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 20,
        color: colors.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#fff',
        borderRadius: radius.md,
        margin: spacing.md,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.success,
        marginBottom: 8,
    },
    subText: {
        color: colors.textSecondary,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    card: {
        backgroundColor: '#fff',
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.md,
        ...shadow.small,
        borderLeftWidth: 4,
    },
    errorBorder: {
        borderLeftColor: colors.error,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    issueTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.error,
    },
    badge: {
        backgroundColor: '#FFE5E5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: colors.error,
        fontSize: 12,
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    label: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
        maxWidth: '60%',
    }
});

export default ReconciliationList;
