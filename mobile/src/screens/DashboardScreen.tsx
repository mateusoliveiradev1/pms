import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Dimensions, 
  TouchableOpacity 
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // In a real app, you might have a dedicated dashboard endpoint
      // For now, we'll fetch products and mock some stats if the stats endpoint doesn't exist
      
      const [productsRes, statsRes] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<DashboardStats>('/dashboard/stats').catch(() => ({ data: null })) // Fallback if stats endpoint fails
      ]);

      setProducts(productsRes.data.slice(0, 5)); // Show only 5 recent products

      if (statsRes.data) {
        setStats(statsRes.data);
      } else {
        // Calculate stats locally if endpoint missing
        const allProducts = productsRes.data;
        setStats({
          totalProducts: allProducts.length,
          totalOrders: 12, // Mock
          lowStockProducts: allProducts.filter((p) => p.stockAvailable < 5).length,
          pendingOrders: 3, // Mock
          totalSales: 1540.50 // Mock
        });
      }
    } catch (error) {
      console.log('Error loading dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
            title="Vendas (Mês)" 
            value={`R$ ${stats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon="cash-outline" 
            color={colors.success} 
          />
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Vendas da Semana</Text>
          <LineChart
            data={{
              labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
              datasets: [
                {
                  data: [
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100
                  ]
                }
              ]
            }}
            width={Dimensions.get("window").width - 32}
            height={220}
            yAxisLabel="R$ "
            yAxisSuffix=""
            yAxisInterval={1}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity: number = 1) => `rgba(0, 123, 255, ${opacity})`,
              labelColor: (opacity: number = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: "#007bff"
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produtos Recentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductsList' as never)}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          
          {products.map(product => (
            <TouchableOpacity 
              key={product.id} 
              style={styles.productRow}
              onPress={() => navigation.navigate('ProductDetails' as never, { productId: product.id } as never)}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSku}>{product.sku}</Text>
              </View>
              <View style={styles.productMeta}>
                <Text style={[
                  styles.stockBadge, 
                  { color: product.stockAvailable < 5 ? colors.error : colors.success }
                ]}>
                  {product.stockAvailable} un
                </Text>
                <Text style={styles.productPrice}>
                  R$ {product.finalPrice.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  dateText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 16,
    borderRadius: 16,
    ...shadow.card,
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
    color: '#333',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...shadow.card,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productSku: {
    fontSize: 12,
    color: '#999',
  },
  productMeta: {
    alignItems: 'flex-end',
  },
  stockBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
});

export default DashboardScreen;
