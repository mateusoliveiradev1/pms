import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, shadow, spacing } from '../../../ui/theme';
import { WithdrawalRequest } from '../types';

interface WithdrawalsListProps {
    withdrawals: WithdrawalRequest[];
    filter: string;
    setFilter: (val: string) => void;
    onApprove: (req: WithdrawalRequest) => void;
    onReject: (req: WithdrawalRequest) => void;
    formatCurrency: (val: number) => string;
}

const WithdrawalsList: React.FC<WithdrawalsListProps> = ({ 
    withdrawals, filter, setFilter, onApprove, onReject, formatCurrency 
}) => {
    return (
        <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Solicitações ({withdrawals.length})</Text>
            
            <View style={styles.filterRow}>
              {['PENDING', 'HISTORY'].map(f => (
                  <TouchableOpacity 
                      key={f} 
                      style={[styles.filterChip, filter === f && styles.activeFilterChip]}
                      onPress={() => setFilter(f)}
                  >
                      <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                          {f === 'PENDING' ? 'Pendentes' : 'Histórico'}
                      </Text>
                  </TouchableOpacity>
              ))}
            </View>
  
            {withdrawals.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma solicitação encontrada.</Text>
            ) : (
                withdrawals.map(req => (
                    <View key={req.id} style={styles.withdrawalCard}>
                        <View style={styles.withdrawalHeader}>
                            <Text style={styles.supplierName}>{req.supplier.name}</Text>
                            <Text style={[
                                styles.withdrawalAmount, 
                                req.status === 'REJECTED' ? { color: colors.error } : 
                                req.status === 'PAID' ? { color: colors.success } : {}
                            ]}>{formatCurrency(req.amount)}</Text>
                        </View>
                        <Text style={styles.withdrawalInfo}>Status: {req.status === 'PENDING' ? 'Pendente' : req.status === 'PAID' ? 'Pago' : 'Rejeitado'}</Text>
                        <Text style={styles.withdrawalInfo}>Chave PIX: {req.pixKey}</Text>
                        <Text style={styles.withdrawalDate}>Solicitado em: {new Date(req.requestedAt).toLocaleDateString()}</Text>
                        
                        {req.status === 'PENDING' && (
                            <View style={styles.withdrawalActions}>
                                <TouchableOpacity 
                                    style={[styles.actionButton, styles.rejectButton]}
                                    onPress={() => onReject(req)}
                                >
                                    <Text style={styles.actionButtonText}>Rejeitar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.actionButton, styles.approveButton]}
                                    onPress={() => onApprove(req)}
                                >
                                    <Text style={styles.actionButtonText}>Aprovar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    tabContent: {
        padding: spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    filterRow: {
        flexDirection: 'row',
        marginBottom: 15,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeFilterChip: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    activeFilterText: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginTop: 20,
    },
    withdrawalCard: {
        backgroundColor: '#fff',
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        ...shadow.small,
    },
    withdrawalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    supplierName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    withdrawalAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.warning,
    },
    withdrawalInfo: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    withdrawalDate: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    withdrawalActions: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 10,
    },
    actionButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    rejectButton: {
        backgroundColor: colors.error,
    },
    approveButton: {
        backgroundColor: colors.success,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default WithdrawalsList;
