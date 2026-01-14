import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { colors, radius, shadow, spacing } from '../../../ui/theme';
import { SupplierFinancial } from '../types';

interface SuppliersTableProps {
    suppliers: SupplierFinancial[];
    search: string;
    setSearch: (val: string) => void;
    filter: string;
    setFilter: (val: string) => void;
    formatCurrency: (val: number) => string;
}

const SuppliersTable: React.FC<SuppliersTableProps> = ({ 
    suppliers, search, setSearch, filter, setFilter, formatCurrency 
}) => {
    return (
        <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Visão por Fornecedor</Text>
            
            <TextInput 
              style={styles.searchInput}
              placeholder="Buscar por nome..."
              value={search}
              onChangeText={setSearch}
            />
  
            <View style={styles.filterRow}>
              {['ALL', 'ACTIVE', 'OVERDUE', 'BLOCKED'].map(f => (
                  <TouchableOpacity 
                      key={f} 
                      style={[styles.filterChip, filter === f && styles.activeFilterChip]}
                      onPress={() => setFilter(f)}
                  >
                      <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                          {f === 'ALL' ? 'Todos' : f === 'ACTIVE' ? 'Ativos' : f === 'OVERDUE' ? 'Em Atraso' : 'Bloqueados'}
                      </Text>
                  </TouchableOpacity>
              ))}
            </View>
  
            {suppliers.length === 0 ? (
               <Text style={styles.emptyText}>Nenhum fornecedor encontrado.</Text>
            ) : (
               suppliers.map(sup => (
                <View key={sup.id} style={styles.supplierCard}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.supplierName}>{sup.name}</Text>
                        <View style={[styles.statusBadge, sup.financialStatus === 'OVERDUE' ? { backgroundColor: colors.error } : { backgroundColor: colors.success }]}>
                            <Text style={styles.statusText}>{sup.financialStatus}</Text>
                        </View>
                    </View>
                    <Text style={styles.supplierPlan}>Plano: {sup.plan?.name || 'Sem plano'}</Text>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.rowBetween}>
                        <View>
                            <Text style={styles.label}>Disponível</Text>
                            <Text style={[styles.value, { color: colors.success }]}>{formatCurrency(sup.walletBalance)}</Text>
                        </View>
                        <View>
                            <Text style={styles.label}>Pendente (D+N)</Text>
                            <Text style={[styles.value, { color: colors.warning }]}>{formatCurrency(sup.pendingBalance)}</Text>
                        </View>
                    </View>
                    
                    <View style={[styles.rowBetween, { marginTop: 8 }]}>
                        <View>
                            <Text style={styles.label}>Total Sacado</Text>
                            <Text style={styles.value}>{formatCurrency(sup.totalWithdrawn || 0)}</Text>
                        </View>
                        <View>
                            <Text style={styles.label}>Comissões</Text>
                            <Text style={styles.value}>{formatCurrency(sup.totalCommission)}</Text>
                        </View>
                    </View>
                    <View style={styles.rowBetween}>
                      <Text style={styles.label}>Pedidos: {sup.totalOrders || 0}</Text>
                    </View>
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
    searchInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
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
    supplierCard: {
        backgroundColor: '#fff',
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        ...shadow.small,
    },
    supplierName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    supplierPlan: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
});

export default SuppliersTable;
