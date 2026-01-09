import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../../../ui/theme';
import { LedgerEntry } from '../types';

interface TransactionsListProps {
    ledger: LedgerEntry[];
    onViewReceipt: (entry: LedgerEntry) => void;
}

const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SALE_REVENUE': return 'Venda Aprovada';
      case 'PAYOUT': return 'Saque Realizado';
      case 'SUBSCRIPTION_PAYMENT': return 'Pagamento Mensalidade';
      case 'SALE_COMMISSION': return 'Comissão da Plataforma';
      case 'ADJUSTMENT': return 'Ajuste Manual';
      default: return type;
    }
};
  
const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYOUT': return 'arrow-up-circle-outline';
      case 'SALE_REVENUE': return 'cash-outline';
      case 'SUBSCRIPTION_PAYMENT': return 'card-outline';
      case 'SALE_COMMISSION': return 'pricetag-outline';
      default: return 'swap-horizontal-outline';
    }
};

const isCredit = (type: string) => {
    return type === 'SALE_REVENUE';
};

const TransactionsList: React.FC<TransactionsListProps> = ({ ledger, onViewReceipt }) => {
    if (ledger.length === 0) {
        return <Text style={styles.emptyText}>Nenhuma movimentação recente.</Text>;
    }

    return (
        <View>
            {ledger.map((entry) => (
                <TouchableOpacity key={entry.id} style={styles.transactionItem} onPress={() => onViewReceipt(entry)}>
                    <View style={styles.transactionIcon}>
                        <Ionicons name={getTypeIcon(entry.type) as any} size={24} color={colors.primary} />
                    </View>
                    <View style={styles.transactionContent}>
                        <Text style={styles.transactionTitle}>{getTypeLabel(entry.type)}</Text>
                        <Text style={styles.transactionDate}>{new Date(entry.createdAt).toLocaleDateString()}</Text>
                        <Text style={styles.transactionDesc} numberOfLines={1}>{entry.description}</Text>
                    </View>
                    <View style={styles.transactionValues}>
                        <Text style={[
                            styles.transactionAmount,
                            isCredit(entry.type) ? { color: colors.success } : { color: colors.text }
                        ]}>
                            {isCredit(entry.type) ? '+' : '-'} R$ {Math.abs(entry.amount).toFixed(2)}
                        </Text>
                        <Text style={[
                            styles.transactionStatus,
                            entry.status === 'PENDING' ? { color: colors.warning } : { color: colors.success }
                        ]}>
                            {entry.status === 'COMPLETED' ? 'Concluído' : entry.status === 'PENDING' ? 'Pendente' : entry.status}
                        </Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginTop: 20,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: radius.md,
        ...shadow.small,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f9ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    transactionContent: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    transactionDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    transactionDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    transactionValues: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    transactionStatus: {
        fontSize: 10,
        marginTop: 2,
    },
});

export default TransactionsList;
