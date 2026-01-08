import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import Header from '../ui/components/Header';
import { colors, shadow } from '../ui/theme';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get("window").width;

interface SalesChartItem {
  date: string;     // Formatted DD/MM
  fullDate: string; // YYYY-MM-DD
  value: number;
}

interface SalesStatsResponse {
  totalSales: number;
  totalOrders: number;
  chartData: SalesChartItem[];
}

interface TopProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
}

interface StatusData {
  status: string;
  count: number;
}

const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  
  const [salesStats, setSalesStats] = useState<SalesStatsResponse | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      
      const [salesRes, topRes, statusRes] = await Promise.all([
        api.get<SalesStatsResponse>('/reports/sales'),
        api.get<TopProduct[]>('/reports/top-products'),
        api.get<StatusData[]>('/reports/status')
      ]);

      setSalesStats(salesRes.data);
      setTopProducts(topRes.data);
      setStatusData(statusRes.data);
    } catch (error) {
      console.log('Error fetching reports', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Prepare data for Line chart
  const getLineChartData = () => {
    if (!salesStats || salesStats.chartData.length === 0) return null;

    const data = salesStats.chartData;
    // Show label every 5 days to avoid clutter
    const labels = data.map((d, index) => {
        if (index % 5 === 0 || index === data.length - 1) {
            return d.date;
        }
        return '';
    });

    return {
      labels: labels,
      datasets: [
        {
          data: data.map(d => d.value),
          color: (opacity: number = 1) => colors.primary, 
          strokeWidth: 2
        }
      ],
      legend: ["Vendas (Últimos 30 dias)"]
    };
  };

  // Prepare data for Weekday Bar Chart
  const getWeekdayData = () => {
      if (!salesStats) return { labels: [], datasets: [] };

      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const counts = [0, 0, 0, 0, 0, 0, 0];
      
      salesStats.chartData.forEach(d => {
          // Create date object from YYYY-MM-DD
          // Append T12:00:00 to avoid timezone issues shifting the day
          const dateObj = new Date(d.fullDate + 'T12:00:00'); 
          counts[dateObj.getDay()] += d.value;
      });

      return {
          labels: weekdays,
          datasets: [{ data: counts }]
      };
  };

  const lineChartData = getLineChartData();
  const weekdayChartData = getWeekdayData();

  // Prepare Pie Chart Data
  const getStatusColor = (status: string) => {
      switch (status) {
          case 'NEW': return '#007AFF';
          case 'SENT_TO_SUPPLIER': return '#FF9500';
          case 'SHIPPING': return '#AF52DE';
          case 'DELIVERED': return '#34C759';
          case 'CANCELLED': return '#FF3B30';
          default: return '#8E8E93';
      }
  };

  const getStatusLabel = (status: string) => {
      const map: Record<string, string> = {
          'NEW': 'Novo',
          'SENT_TO_SUPPLIER': 'No Fornecedor',
          'SHIPPING': 'Em Trânsito',
          'DELIVERED': 'Entregue',
          'CANCELLED': 'Cancelado'
      };
      return map[status] || status;
  };

  const pieChartData = statusData.map(item => ({
      name: getStatusLabel(item.status),
      population: item.count,
      color: getStatusColor(item.status),
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
  }));

  const totalSales = salesStats?.totalSales || 0;
  const averageSales = salesStats?.chartData?.length ? totalSales / salesStats.chartData.length : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Relatórios e Gráficos" onBack={() => navigation.goBack()} />
      
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
        
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#e3f2fd' }]}>
                    <Ionicons name="cash-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.summaryLabel}>Total Vendas</Text>
                <Text style={styles.summaryValue}>R$ {totalSales.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#e8f5e9' }]}>
                    <Ionicons name="trending-up-outline" size={24} color={colors.success} />
                </View>
                <Text style={styles.summaryLabel}>Média Diária</Text>
                <Text style={styles.summaryValue}>R$ {averageSales.toFixed(2)}</Text>
            </View>
        </View>

        {lineChartData && (
          <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Evolução de Vendas</Text>
              <LineChart
                  data={lineChartData}
                  width={screenWidth - 64} // Reduced width to prevent overflow
                  height={220}
                  yAxisLabel="R$ "
                  yAxisInterval={1}
                  chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0, 
                      color: (opacity: number = 1) => colors.primary,
                      labelColor: (opacity: number = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: { borderRadius: 16 },
                      propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary },
                      propsForBackgroundLines: { strokeDasharray: "" } // Solid lines
                  }}
                  bezier
                  style={{ marginVertical: 8, borderRadius: 16 }} // Removed extra paddingRight that might push it out
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLines={false}
              />
          </View>
        )}

        {weekdayChartData.datasets.length > 0 && weekdayChartData.datasets[0].data.some(v => v > 0) && (
          <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Vendas por Dia da Semana</Text>
              <BarChart
                  data={weekdayChartData}
                  width={screenWidth - 64} // Reduced width
                  height={220}
                  yAxisLabel="R$ "
                  yAxisSuffix=""
                  chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0,
                      color: (opacity: number = 1) => colors.secondary,
                      labelColor: (opacity: number = 1) => `rgba(0, 0, 0, ${opacity})`,
                      barPercentage: 0.7,
                      propsForBackgroundLines: { strokeDasharray: "" }
                  }}
                  style={{ marginVertical: 8, borderRadius: 16 }}
                  showValuesOnTopOfBars
                  fromZero
                  withInnerLines={true}
              />
          </View>
        )}

        {pieChartData.length > 0 && (
            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Status dos Pedidos</Text>
                <PieChart
                    data={pieChartData}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={{
                        color: (opacity: number = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[0, 0]}
                    absolute
                />
            </View>
        )}

        {topProducts.length > 0 && (
            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Produtos Mais Vendidos</Text>
                {topProducts.map((product, index) => (
                    <View key={product.id} style={styles.topProductRow}>
                        <View style={styles.rankBadge}>
                            <Text style={styles.rankText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.productName}>{product.name}</Text>
                            <Text style={styles.productSku}>{product.sku}</Text>
                        </View>
                        <Text style={styles.productQty}>{product.quantity} un</Text>
                    </View>
                ))}
            </View>
        )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  summaryContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
  },
  summaryCard: {
      flex: 1,
      backgroundColor: '#fff',
      padding: 16,
      borderRadius: 16,
      marginHorizontal: 6,
      ...shadow.small,
      alignItems: 'center',
  },
  iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
  },
  summaryLabel: {
      fontSize: 12,
      color: '#666',
      marginBottom: 4,
  },
  summaryValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
  },
  chartCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      ...shadow.medium,
  },
  chartTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#333',
  },
  topProductRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
  },
  rankText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
  },
  productName: {
      fontSize: 16,
      color: '#333',
      fontWeight: '500',
  },
  productSku: {
      fontSize: 12,
      color: '#999',
  },
  productQty: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.secondary,
  }
});

export default ReportsScreen;
