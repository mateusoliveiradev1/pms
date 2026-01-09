import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { colors, radius, spacing } from '../../../ui/theme';
import { AdminDashboardStats } from '../types';

interface RevenueChartsProps {
    stats: AdminDashboardStats | null;
}

const { width } = Dimensions.get('window');

const RevenueCharts: React.FC<RevenueChartsProps> = ({ stats }) => {
    if (!stats) return null;

    const pieData = [
        {
            name: 'Comissões',
            population: stats.revenue.commissions,
            color: colors.primary,
            legendFontColor: '#7F7F7F',
            legendFontSize: 12
        },
        {
            name: 'Mensalidades',
            population: stats.revenue.subscriptions,
            color: colors.success,
            legendFontColor: '#7F7F7F',
            legendFontSize: 12
        }
    ];

    return (
        <View>
            <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Fonte de Receita</Text>
                {(stats.revenue.commissions > 0 || stats.revenue.subscriptions > 0) ? (
                    <PieChart
                        data={pieData}
                        width={width - 40}
                        height={200}
                        chartConfig={{
                            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                    />
                ) : <Text style={styles.emptyText}>Sem dados de receita.</Text>}
            </View>

            <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Evolução da Receita (6 Meses)</Text>
                {stats.charts?.revenue && stats.charts.revenue.labels.length > 0 ? (
                    <LineChart
                        data={stats.charts.revenue}
                        width={width - 40}
                        height={220}
                        chartConfig={{
                            backgroundColor: "#ffffff",
                            backgroundGradientFrom: "#ffffff",
                            backgroundGradientTo: "#ffffff",
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            style: { borderRadius: 16 },
                            propsForDots: { r: "6", strokeWidth: "2", stroke: colors.primary }
                        }}
                        bezier
                        style={{ marginVertical: 8, borderRadius: 16 }}
                    />
                ) : (
                    <Text style={styles.emptyText}>Sem dados suficientes para o gráfico.</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    chartContainer: {
        marginBottom: spacing.lg,
        backgroundColor: '#fff',
        padding: spacing.md,
        borderRadius: radius.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginVertical: 20,
    },
});

export default RevenueCharts;
