import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Dimensions, 
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import { useAuthRole } from '../hooks/useAuthRole';
import { isPermissionError } from '../utils/authErrorUtils';
import api from '../services/api';
import { colors, shadow } from '../ui/theme';
import { Logger } from '../utils/logger';

interface Product {
  id: string;
  name: string;
  sku: string;
  stockAvailable: number;
  price: number;
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

interface Supplier {
    id: string;
    name: string;
    fantasyName?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress?: () => void;
}

const StatCard = React.memo(({ title, value, icon, color, onPress }: StatCardProps) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  </TouchableOpacity>
));

const DashboardScreen = () => {
  const { user, activeAccountId, loading: authLoading, signOut } = useAuth();
  const { isAccountAdmin, isSupplierAdmin, isSystemAdmin, role } = useAuthRole();
  const isSupplierUser = role === 'SUPPLIER_USER';
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  
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

  // Admin Filters
  const [modalVisible, setModalVisible] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSuppliers = async () => {
      try {
          const response = await api.get('/suppliers');
          setSuppliers(response.data);
      } catch (error) {
          Logger.error('Error loading suppliers', error);
      }
  };

  const loadData = useCallback(async () => {
    // 1. Context Guard
    if (!isSystemAdmin && !activeAccountId) {
        setLoading(false);
        return;
    }

    try {
      if (!refreshing) setLoading(true);
      
      let queryParams = '';
      if (isSystemAdmin && selectedSupplier) {
          queryParams = `?supplierId=${selectedSupplier.id}`;
      }

      // Independent fetches for resilience
      const fetchProducts = api.get<Product[]>(`/products${queryParams}`)
        .catch(err => {
          if (err.response?.status !== 403) {
            Logger.warn('Dashboard: Failed to fetch products', err.message);
          }
          return { data: [] as Product[] };
      });

      // Fetch Sales allowed for System Admin (Global or Supplier filtered) or Account Users
      const canFetchSales = isSystemAdmin || ((isAccountAdmin || isSupplierAdmin) && activeAccountId);
      
      const fetchSales = canFetchSales
        ? api.get<SalesStatsResponse>(`/reports/sales${queryParams}`)
            .catch(err => {
                if (err.response?.status !== 403) {
                   Logger.warn('Dashboard: Failed to fetch sales', err.message);
                }
                return { data: null };
          })
        : Promise.resolve({ data: null as any });

      const [productsRes, salesRes] = await Promise.all([fetchProducts, fetchSales]);

      const allProducts = productsRes.data || [];
      setProducts(allProducts.slice(0, 5));

      // Process Sales Data for Dashboard
      let realTotalSales = 0;
      let realTotalOrders = 0;
      let chartValues = [0, 0, 0, 0, 0, 0, 0];
      let chartLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; // Default

      if (salesRes.data) {
          realTotalSales = salesRes.data.totalSales || 0;
          realTotalOrders = salesRes.data.totalOrders || 0;

          // Get last 7 days data for the chart
          if (salesRes.data.chartData && Array.isArray(salesRes.data.chartData)) {
            const last7Days = salesRes.data.chartData.slice(-7);
            if (last7Days.length > 0) {
                chartValues = last7Days.map((d: SalesChartItem) => d.value);
                chartLabels = last7Days.map((d: SalesChartItem) => d.date.split('/')[0]);
            }
          }
      }

      setWeeklyChartData(chartValues);
      setWeeklyLabels(chartLabels);

      setStats({
        totalProducts: allProducts.length,
        totalOrders: realTotalOrders, 
        lowStockProducts: allProducts.filter((p) => p.stockAvailable < 5).length,
        pendingOrders: 0, 
        totalSales: realTotalSales
      });

    } catch (error: any) {
      if (isPermissionError(error)) {
        return;
      } else {
        Logger.error('Error loading dashboard data', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, isAccountAdmin, isSupplierAdmin, isSystemAdmin, activeAccountId, selectedSupplier]);

  useEffect(() => {
    if (isFocused) {
        if (isSystemAdmin) loadSuppliers();
        loadData();
    }
  }, [isFocused, loadData, isSystemAdmin]);

  // Force reload when filter changes
  useEffect(() => {
      if (isSystemAdmin && isFocused) {
          loadData();
      }
  }, [selectedSupplier]);

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

  const chartData = React.useMemo(() => ({
    labels: weeklyLabels,
    datasets: [
        {
        data: weeklyChartData,
        color: (opacity = 1) => colors.primary,
        strokeWidth: 3
        }
    ]
  }), [weeklyLabels, weeklyChartData]);

  const chartConfig = React.useMemo(() => ({
    backgroundColor: "#fff",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
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
        strokeDasharray: "",
        stroke: "#f5f5f5"
    }
  }), []);

  // Rendering States Hierarchy
  if (authLoading) {
      return (
          <View style={[styles.container, styles.center]}>
              <ActivityIndicator size="large" color={colors.primary} />
          </View>
      );
  }

  if (loading && !refreshing && products.length === 0) {
      return (
          <View style={[styles.container, styles.center]}>
              <ActivityIndicator size="large" color={colors.primary} />
          </View>
      );
  }

  if (!isSystemAdmin && !activeAccountId) {
      return (
          <SafeAreaView style={styles.container} edges={['top']}>
             <View style={[styles.content, styles.center]}>
                 <Ionicons name="business-outline" size={64} color={colors.textSecondary} />
                 <Text style={[styles.subtitle, { marginTop: 16, textAlign: 'center' }]}>
                     Nenhuma conta ativa identificada.
                 </Text>
                 <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                     Entre em contato com o suporte ou aguarde a ativação.
                 </Text>
                 <TouchableOpacity onPress={loadData} style={{ marginTop: 20 }}>
                    <Ionicons name="reload-circle" size={48} color={colors.primary} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={signOut} style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="log-out-outline" size={24} color={colors.error} />
                    <Text style={{ color: colors.error, marginLeft: 8, fontWeight: 'bold' }}>Sair</Text>
                 </TouchableOpacity>
             </View>
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.name || 'Usuário'}</Text>
            <Text style={styles.subtitle}>Visão geral do seu negócio</Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {isSystemAdmin && (
                <TouchableOpacity onPress={() => setModalVisible(true)} style={{marginRight: 12}}>
                    <View style={{ backgroundColor: colors.secondary, borderRadius: 20, padding: 4, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="filter" size={20} color="#FFF" />
                    </View>
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={loadData} style={{marginRight: 12}}>
                <View style={{ backgroundColor: colors.primary, borderRadius: 20, padding: 4, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="reload" size={20} color="#FFF" />
                </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut}>
                <Ionicons name="log-out-outline" size={28} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {isSystemAdmin && (
            <View style={styles.adminFilterBar}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name={selectedSupplier ? "business" : "globe-outline"} size={16} color={colors.primary} style={{marginRight: 8}} />
                    <Text style={styles.adminFilterText}>
                        {selectedSupplier ? `${selectedSupplier.name}` : 'Visão Global'}
                    </Text>
                </View>
                {selectedSupplier && (
                    <TouchableOpacity onPress={() => setSelectedSupplier(null)}>
                        <Ionicons name="close-circle" size={20} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>
        )}

        <View style={styles.statsGrid}>
          <StatCard 
            title="Produtos" 
            value={stats.totalProducts} 
            icon="cube-outline" 
            color={colors.primary}
            onPress={() => navigation.navigate('ProductsList' as never, { initialSupplier: selectedSupplier } as never)}
          />
          <StatCard 
            title="Pedidos" 
            value={stats.totalOrders} 
            icon="cart-outline" 
            color={colors.secondary} 
            onPress={() => navigation.navigate('Pedidos' as never, { initialSupplier: selectedSupplier } as never)}
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
          {!isSupplierUser && (
            <StatCard 
              title="Financeiro" 
              value={role === 'SYSTEM_ADMIN' ? 'Plataforma' : 'Carteira'}
              icon="wallet-outline" 
              color={colors.info} 
              onPress={() => {
                if (role === 'SYSTEM_ADMIN') {
                  navigation.navigate('AdminFinancial' as never);
                } else {
                  navigation.navigate('Financial' as never);
                }
              }}
            />
          )}
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
                data={chartData}
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
                chartConfig={chartConfig}
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
              <Text style={styles.productPrice}>R$ {(product.price || 0).toFixed(2)}</Text>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Filtrar por Fornecedor</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={{marginRight: 8}} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Buscar fornecedor..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                
                <FlatList
                    data={suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                    keyExtractor={item => item.id}
                    style={{maxHeight: 400}}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.supplierItem}
                            onPress={() => {
                                setSelectedSupplier(item);
                                setModalVisible(false);
                            }}
                        >
                            <View>
                                <Text style={styles.supplierName}>{item.name}</Text>
                                {item.fantasyName && <Text style={styles.supplierSub}>{item.fantasyName}</Text>}
                            </View>
                            {selectedSupplier?.id === item.id && (
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    )}
                    ListHeaderComponent={
                        <TouchableOpacity 
                            style={styles.supplierItem} 
                            onPress={() => {
                                setSelectedSupplier(null);
                                setModalVisible(false);
                            }}
                        >
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Ionicons name="globe-outline" size={20} color={colors.primary} style={{marginRight: 12}} />
                                <Text style={[styles.supplierName, { color: colors.primary, fontWeight: 'bold' }]}>
                                    Ver Todos (Global)
                                </Text>
                            </View>
                        </TouchableOpacity>
                    }
                />
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
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
  adminFilterBar: {
      backgroundColor: '#E3F2FD',
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#BBDEFB',
      marginBottom: 16,
      borderRadius: 8,
  },
  adminFilterText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 14,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
  },
  modalContent: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '80%',
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  },
  modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
  },
  searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 16,
  },
  searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
  },
  supplierItem: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  supplierName: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 4,
  },
  supplierSub: {
      fontSize: 12,
      color: colors.textSecondary,
  },
});

export default DashboardScreen;