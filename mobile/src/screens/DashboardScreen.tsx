import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import Badge from '../ui/components/Badge';
import { colors, spacing } from '../ui/theme';

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

const DashboardScreen = () => {
  const { signOut, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animateTick, setAnimateTick] = useState(0);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
        loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, statsRes] = await Promise.all([
          api.get('/products'),
          api.get('/dashboard/stats')
      ]);
      setProducts(productsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.log('Error loading dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const navigateToReports = () => {
      // @ts-ignore
      navigation.navigate('Reports');
  };

  const onRefresh = () => {
      setRefreshing(true);
      setAnimateTick(t => t + 1);
      loadData();
  };

  const renderProductsList = () => {
    if (loading && !refreshing) {
      return <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />;
    }
    if (products.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>Nenhum produto cadastrado.</Text>
        </View>
      );
    }
    return (
      <>
        {products.map(product => (
          <Card key={product.id}>
            <View style={styles.cardHeader}>
              <Text style={styles.productName}>{product.name}</Text>
              {product.stockAvailable < 5 ? (
                <Badge text="BAIXO" color="#c62828" backgroundColor="#ffebee" />
              ) : (
                <Badge text="OK" color="#1976d2" backgroundColor="#e3f2fd" />
              )}
            </View>
            <Text style={styles.productDetails}>SKU: {product.sku}</Text>
            <View style={styles.row}>
              <Text style={styles.price}>
                R$ {product.finalPrice ? product.finalPrice.toFixed(2) : '0.00'}
              </Text>
              <Text style={[styles.stock, product.stockAvailable < 5 ? styles.stockLow : null]}>
                Estoque: {product.stockAvailable}
              </Text>
            </View>
          </Card>
        ))}
      </>
    );
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productDetails}>SKU: {item.sku}</Text>
      <View style={styles.row}>
        <Text style={styles.price}>R$ {item.finalPrice ? item.finalPrice.toFixed(2) : '0.00'}</Text>
        <Text style={[
            styles.stock,
            item.stockAvailable < 5 ? styles.stockLow : null
        ]}>Estoque: {item.stockAvailable}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header showLogo logoSize={34} animateLogo={isFocused} animateKey={animateTick} logoDuration={700} rightIcon="log-out-outline" onRightPress={signOut} />

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
          {/* Cards de Métricas */}
          <View style={styles.statsContainer}>
              <Card style={{ alignItems: 'center' }}>
                  <Text style={styles.statValue}>{stats?.totalSales ? `R$ ${stats.totalSales.toFixed(2)}` : 'R$ 0.00'}</Text>
                  <Text style={styles.statLabel}>Vendas Totais</Text>
              </Card>
              <View style={styles.row}>
                <Card style={{ flex: 1, backgroundColor: '#e3f2fd' }}>
                    <Text style={[styles.statValueSmall, { color: '#1976d2' }]}>{stats?.pendingOrders || 0}</Text>
                    <Text style={styles.statLabelSmall}>Pedidos Pendentes</Text>
                </Card>
                <Card style={{ flex: 1, backgroundColor: '#ffebee' }}>
                    <Text style={[styles.statValueSmall, { color: '#c62828' }]}>{stats?.lowStockProducts || 0}</Text>
                    <Text style={styles.statLabelSmall}>Estoque Baixo</Text>
                </Card>
              </View>

              <TouchableOpacity style={styles.reportsButton} onPress={navigateToReports}>
                <Ionicons name="bar-chart" size={20} color="#fff" />
                <Text style={styles.reportsButtonText}>Ver Relatórios Detalhados</Text>
              </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produtos Recentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProductsList' as never)}>
                <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {renderProductsList()}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('ProductForm' as never)}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingBottom: 0,
  },
  statsContainer: {
      marginBottom: spacing.lg,
  },
  statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.success,
  },
  statLabel: {
      color: colors.muted,
      fontSize: 14,
  },
  statValueSmall: {
      fontSize: 20,
      fontWeight: 'bold',
  },
  statLabelSmall: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
  },
  sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAll: {
      color: colors.primary,
  },
  list: {
    paddingBottom: 80,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productDetails: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  price: {
    color: colors.success,
    fontWeight: 'bold',
    fontSize: 16,
  },
  stock: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  stockLow: {
      color: colors.danger,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  empty: {
    color: '#999',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  reportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  reportsButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default DashboardScreen;
