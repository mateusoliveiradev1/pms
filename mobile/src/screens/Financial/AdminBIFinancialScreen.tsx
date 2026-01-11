import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../../ui/theme';
import Header from '../../ui/components/Header';
import { useBIFinancial } from './hooks/useBIFinancial';
import { LineChart } from 'react-native-chart-kit';
import Badge from '../../ui/components/Badge';

const { width } = Dimensions.get('window');

const AdminBIFinancialScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { 
        loading, 
        overview, 
        dailyRevenue, 
        anomalies, 
        suppliersKPIs, 
        refreshAll 
    } = useBIFinancial();

    const [period, setPeriod] = useState<'7d' | '30d'>('30d');

    useEffect(() => {
        refreshAll();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(val || 0);
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header title="BI Financeiro" showBack onBack={() => navigation.goBack()} />
            
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshAll} />}
            >
                {/* Period Selector */}
                <View style={styles.filterContainer}>
                    <TouchableOpacity onPress={() => setPeriod('7d')} style={[styles.filterBtn, period === '7d' && styles.filterBtnActive]}>
                        <Text style={[styles.filterText, period === '7d' && styles.filterTextActive]}>7 Dias</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPeriod('30d')} style={[styles.filterBtn, period === '30d' && styles.filterBtnActive]}>
                        <Text style={[styles.filterText, period === '30d' && styles.filterTextActive]}>30 Dias</Text>
                    </TouchableOpacity>
                </View>

                {/* KPI Cards */}
                {overview && (
                    <View style={styles.cardsContainer}>
                        <View style={styles.cardRow}>
                            <View style={[styles.card, { backgroundColor: colors.primary }]}>
                                <Text style={styles.cardLabelLight}>GMV Total</Text>
                                <Text style={styles.cardValueLight}>{formatCurrency(overview.totals.gmv)}</Text>
                            </View>
                            <View style={[styles.card, { backgroundColor: '#fff' }]}>
                                <Text style={styles.cardLabel}>Receita Líquida</Text>
                                <Text style={[styles.cardValue, { color: colors.success }]}>{formatCurrency(overview.totals.netRevenue)}</Text>
                            </View>
                        </View>
                        <View style={styles.cardRow}>
                            <View style={[styles.card, { backgroundColor: '#fff' }]}>
                                <Text style={styles.cardLabel}>Comissões</Text>
                                <Text style={[styles.cardValue, { color: colors.secondary }]}>{formatCurrency(overview.totals.commission)}</Text>
                            </View>
                            <View style={[styles.card, { backgroundColor: '#fff' }]}>
                                <Text style={styles.cardLabel}>Saldo Pendente</Text>
                                <Text style={[styles.cardValue, { color: colors.warning }]}>{formatCurrency(overview.totals.pendingBalance)}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Anomalies Section */}
                {anomalies.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>⚠️ Anomalias Financeiras</Text>
                        {anomalies.map((anomaly, index) => (
                            <View key={index} style={styles.anomalyCard}>
                                <View style={styles.anomalyHeader}>
                                    <Badge label={anomaly.type} color="error" />
                                    <Text style={styles.anomalyDate}>{new Date(anomaly.detectedAt).toLocaleDateString()}</Text>
                                </View>
                                <Text style={styles.anomalyDesc}>{anomaly.description}</Text>
                                <Text style={styles.anomalyValue}>Impacto: {formatCurrency(anomaly.severity_value)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Daily Revenue Chart */}
                {dailyRevenue.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Receita Diária</Text>
                        <LineChart
                            data={{
                                labels: dailyRevenue.slice(-7).map(d => formatDate(d.date)), // Show last 7 labels
                                datasets: [{
                                    data: dailyRevenue.slice(-7).map(d => d.total_net_revenue || 0)
                                }]
                            }}
                            width={width - 40}
                            height={220}
                            yAxisLabel="R$ "
                            chartConfig={{
                                backgroundColor: '#fff',
                                backgroundGradientFrom: '#fff',
                                backgroundGradientTo: '#fff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(10, 37, 64, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                style: { borderRadius: 16 },
                                propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary }
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 16 }}
                        />
                    </View>
                )}

                {/* Top Suppliers Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top Fornecedores (GMV)</Text>
                    {suppliersKPIs.slice(0, 5).map((supplier, index) => (
                        <View key={index} style={styles.supplierRow}>
                            <View>
                                <Text style={styles.supplierName}>{supplier.supplierName}</Text>
                                <Text style={styles.supplierSub}>ID: {supplier.supplierId.slice(0, 8)}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.supplierValue}>{formatCurrency(supplier.gmv_total)}</Text>
                                <Text style={styles.supplierSub}>Com: {formatCurrency(supplier.commission_total)}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: spacing.md,
    },
    filterContainer: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    filterBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
        marginRight: 8,
    },
    filterBtnActive: {
        backgroundColor: colors.primary,
    },
    filterText: {
        fontSize: 12,
        color: '#666',
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cardsContainer: {
        marginBottom: spacing.lg,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    card: {
        width: '48%',
        padding: spacing.md,
        borderRadius: radius.md,
        ...shadow.small,
        minHeight: 100,
        justifyContent: 'center',
    },
    cardLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    cardLabelLight: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    cardValueLight: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    section: {
        marginBottom: spacing.xl,
        backgroundColor: '#fff',
        padding: spacing.md,
        borderRadius: radius.md,
        ...shadow.small,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    anomalyCard: {
        backgroundColor: '#fff0f0',
        padding: spacing.sm,
        borderRadius: radius.sm,
        marginBottom: spacing.sm,
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    anomalyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    anomalyDate: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    anomalyDesc: {
        fontSize: 14,
        color: colors.text,
        marginBottom: 4,
    },
    anomalyValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.error,
    },
    supplierRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    supplierName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    supplierSub: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    supplierValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.success,
    },
});

export default AdminBIFinancialScreen;
