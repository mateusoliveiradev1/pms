import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Dimensions, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, shadow } from '../ui/theme';

interface Product {
  id: string;
  name: string;
  sku: string;
  stockAvailable: number;
  finalPrice: number;
}

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  lowStockProducts: number;
  pendingOrders: number;
  totalSales: number;
}

interface SalesChartItem {
    date: string;
    fullDate: string;
    value: number;
}
  
interface SalesStatsResponse {
    totalSales: number;
    totalOrders: number;
    chartData: SalesChartItem[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress?: () => void;
}

const StatCard = ({ title, value, icon, color, onPress }: StatCardProps) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const DashboardScreen = () => {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    lowStockProducts: 0,
    pendingOrders: 0,
    totalSales: 0
  });
  const [weeklyChartData, setWeeklyChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [weeklyLabels, setWeeklyLabels] = useState<string[]>(['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Don't show full screen loader on refresh
      if (!refreshing) setLoading(true);
      
      const [productsRes, salesRes] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<SalesStatsResponse>('/reports/sales').catch(() => ({ data: null }))
      ]);

      const allProducts = productsRes.data;
      setProducts(allProducts.slice(0, 5));

      // Process Sales Data for Dashboard
      let realTotalSales = 0;
      let realTotalOrders = 0;
      let chartValues = [0, 0, 0, 0, 0, 0, 0];
      let chartLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; // Default

      if (salesRes.data) {
          realTotalSales = salesRes.data.totalSales;
          realTotalOrders = salesRes.data.totalOrders;

          // Get last 7 days data for the chart
          // The backend returns 30 days ordered by date
          const last7Days = salesRes.data.chartData.slice(-7);
          
          chartValues = last7Days.map(d => d.value);
          chartLabels = last7Days.map(d => d.date.split('/')[0]); // Just the day number
      }

      setWeeklyChartData(chartValues);
      setWeeklyLabels(chartLabels);

      setStats({
        totalProducts: allProducts.length,
        totalOrders: realTotalOrders, 
        lowStockProducts: allProducts.filter((p) => p.stockAvailable < 5).length,
        pendingOrders: 0, // Need a specific endpoint for this later
        totalSales: realTotalSales
      });

    } catch (error) {
      console.log('Error loading dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    // Trigger loadData via dependency change or direct call logic
    // loadData handles the refreshing state logic internally if needed
    // but here we just need to ensure it runs
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
          </View>
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard 
            title="Produtos" 
            value={stats.totalProducts} 
            icon="cube-outline" 
            color={colors.primary}
            onPress={() => navigation.navigate('ProductsList' as never)}
          />
          <StatCard 
            title="Pedidos" 
            value={stats.totalOrders} 
            icon="cart-outline" 
            color={colors.secondary} 
            onPress={() => navigation.navigate('Pedidos' as never)}
          />
          <StatCard 
            title="Baixo Estoque" 
            value={stats.lowStockProducts} 
            icon="alert-circle-outline" 
            color={colors.error} 
            onPress={() => navigation.navigate('ProductsList' as never, { filter: 'LOW_STOCK' } as never)}
          />
          <StatCard 
            title="Vendas (30d)" 
            value={`R$ ${stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon="cash-outline" 
            color={colors.success} 
            onPress={() => navigation.navigate('Relatórios' as never)}
          />
        </View>

        <TouchableOpacity style={styles.chartContainer} onPress={() => navigation.navigate('Relatórios' as never)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
             <View>
               <Text style={styles.sectionTitle}>Vendas da Semana</Text>
               <Text style={styles.weeklyTotal}>
                 R$ {weeklyChartData.reduce((a, b) => a + b, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
               </Text>
             </View>
             <View style={styles.seeMoreButton}>
                <Text style={styles.seeMoreText}>Detalhes</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
             </View>
          </View>
          
          {loading && !refreshing && weeklyChartData.every(v => v === 0) ? (
             <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
             </View>
          ) : (
            <LineChart
                data={{
                labels: weeklyLabels,
                datasets: [
                    {
                    data: weeklyChartData,
                    color: (opacity = 1) => colors.primary,
                    strokeWidth: 3
                    }
                ]
                }}
                width={Dimensions.get("window").width - 48} // Adjusted width for padding
                height={200}
                withDots={true}
                withInnerLines={false} // Cleaner look
                withOuterLines={false}
                withVerticalLines={false}
                withHorizontalLines={true}
                yAxisLabel="R$"
                yAxisSuffix=""
                yAxisInterval={1}
                chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, // Primary Blue
                labelColor: (opacity = 1) => `#999`,
                fillShadowGradientFrom: colors.primary,
                fillShadowGradientTo: "#fff",
                fillShadowGradientOpacity: 0.3,
                style: {
                    borderRadius: 16
                },
                propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#fff"
                },
                propsForBackgroundLines: {
                    strokeDasharray: "", // Solid lines
                    stroke: "#f5f5f5"
                }
                }}
                bezier
                style={{
                marginVertical: 8,
                borderRadius: 16,
                paddingRight: 20 // Fix label cut-off
                }}
            />
          )}
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Produtos Recentes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProductsList' as never)}>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {products.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.productIcon}>
              <Ionicons name="cube-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productSku}>{product.sku}</Text>
            </View>
            <View style={styles.productMeta}>
              <Text style={styles.productPrice}>R$ {product.finalPrice.toFixed(2)}</Text>
              <Text style={[
                styles.stockBadge, 
                { color: product.stockAvailable < 5 ? colors.error : colors.success }
              ]}>
                {product.stockAvailable} un
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  content: {
    padding: 16,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...shadow.small,
  },
  dateText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  weeklyTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  seeMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: '46%', // approximate for 2 columns with margin
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: '2%',
    ...shadow.small,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...shadow.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow.small,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  productMeta: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  stockBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DashboardScreen;
