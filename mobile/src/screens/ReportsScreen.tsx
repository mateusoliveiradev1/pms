import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import Header from '../ui/components/Header';
import { colors, shadow } from '../ui/theme';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get("window").width;

interface SalesData {
  date: string;
  total: number;
}

const ReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/reports/sales');
      setData(response.data);
    } catch (error) {
      console.log('Error fetching reports', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalSales = data.reduce((acc, curr) => acc + curr.total, 0);
  const averageSales = data.length > 0 ? totalSales / data.length : 0;
  const maxSales = data.length > 0 ? Math.max(...data.map(d => d.total)) : 0;

  // Prepare data for Line chart
  const labels = data.map((d, index) => {
      // Show label for every 5th day or first/last
      if (index % 5 === 0 || index === data.length - 1) {
          const parts = d.date.split('-');
          return `${parts[2]}/${parts[1]}`;
      }
      return '';
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: data.length > 0 ? data.map(d => d.total) : [0],
        color: (opacity: number = 1) => colors.primary, 
        strokeWidth: 2
      }
    ],
    legend: ["Vendas (Últimos 30 dias)"]
  };

  // Prepare data for Weekday Bar Chart
  const getWeekdayData = () => {
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const counts = [0, 0, 0, 0, 0, 0, 0];
      
      data.forEach(d => {
          const dayIndex = new Date(d.date).getDay(); // 0-6 (Sun-Sat) - Note: depends on timezone, but good enough for demo
          // Adjust for timezone issue if date string is YYYY-MM-DD (treated as UTC) vs local
          // Simple hack: append T12:00:00 to ensure it falls in the day
          const dateObj = new Date(d.date + 'T12:00:00'); 
          counts[dateObj.getDay()] += d.total;
      });

      return {
          labels: weekdays,
          datasets: [{ data: counts }]
      };
  };

  const weekdayChartData = getWeekdayData();

  if (loading) {
      return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Relatórios e Gráficos" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.content}>
        
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

        {data.length > 0 ? (
          <>
            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Evolução de Vendas</Text>
                <LineChart
                    data={chartData}
                    width={screenWidth - 48}
                    height={220}
                    yAxisLabel="R$ "
                    chartConfig={{
                        backgroundColor: "#ffffff",
                        backgroundGradientFrom: "#ffffff",
                        backgroundGradientTo: "#ffffff",
                        decimalPlaces: 0, 
                        color: (opacity: number = 1) => colors.primary,
                        labelColor: (opacity: number = 1) => `rgba(0, 0, 0, ${opacity})`,
                        style: { borderRadius: 16 },
                        propsForDots: { r: "4", strokeWidth: "2", stroke: colors.secondary }
                    }}
                    bezier
                    style={styles.chart}
                />
            </View>

            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Vendas por Dia da Semana</Text>
                <BarChart
                    data={weekdayChartData}
                    width={screenWidth - 48}
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
                    }}
                    style={styles.chart}
                    showValuesOnTopOfBars={false} // clean look
                />
            </View>
          </>
        ) : (
            <View style={styles.noDataContainer}>
                <Ionicons name="stats-chart-outline" size={64} color="#ddd" />
                <Text style={styles.noData}>Nenhum dado encontrado para o período.</Text>
            </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
      padding: 16,
      paddingBottom: 40,
  },
  center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
  },
  summaryContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
  },
  summaryCard: {
      flex: 0.48,
      backgroundColor: '#fff',
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      ...shadow.card,
  },
  iconContainer: {
      padding: 10,
      borderRadius: 12,
      marginBottom: 8,
  },
  summaryLabel: {
      fontSize: 12,
      color: '#666',
      marginBottom: 4,
  },
  summaryValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
  },
  chartCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      alignItems: 'center',
      ...shadow.card,
  },
  chartTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 16,
      alignSelf: 'flex-start',
  },
  chart: {
      borderRadius: 16,
      marginVertical: 8,
  },
  noDataContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
  },
  noData: {
      textAlign: 'center',
      marginTop: 20,
      color: '#666'
  }
});

export default ReportsScreen;
