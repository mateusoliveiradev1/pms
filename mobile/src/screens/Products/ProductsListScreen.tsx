import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Header from '../../ui/components/Header';
import { colors, shadow, radius, spacing } from '../../ui/theme';

type Product = {
  id: string;
  name: string;
  sku: string;
  stockAvailable: number;
  finalPrice: number;
};

const ProductsListScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LOW_STOCK'>('ALL');
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    // @ts-ignore
    if (route.params?.filter) {
        // @ts-ignore
        setFilter(route.params.filter);
        // Clear params to avoid stuck state if we want to reset? 
        // Actually, for now it's fine.
    }
  }, [route.params]);

  const loadProducts = async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await api.get('/products', { params: query ? { query } : undefined });
      setProducts(response.data);
    } catch (error) {
      console.log('Error loading products', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
        loadProducts();
    }, [query])
  );

  const getFilteredProducts = () => {
      if (filter === 'LOW_STOCK') {
          return products.filter(p => p.stockAvailable < 5);
      }
      return products;
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.card}
      // @ts-ignore
      onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
    >
      <View style={styles.cardIconContainer}>
         <Ionicons name="cube-outline" size={24} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            {item.stockAvailable < 5 && (
                <View style={styles.lowStockBadge}>
                    <Text style={styles.lowStockText}>Baixo</Text>
                </View>
            )}
        </View>
        <Text style={styles.cardSubtitle}>SKU: {item.sku}</Text>
        <View style={styles.row}>
            <Text style={styles.price}>R$ {item.finalPrice?.toFixed(2) || '0.00'}</Text>
            <Text style={[styles.stock, item.stockAvailable < 5 ? styles.stockLow : null]}>
            Estoque: {item.stockAvailable}
            </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        onBack={() => navigation.goBack()} 
        title="Produtos"
        rightIcon="add" 
        // @ts-ignore
        onRightPress={() => navigation.navigate('ProductForm')} 
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar produto..."
            style={styles.searchInput}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => loadProducts()}
            />
            {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
            )}
        </View>
      </View>

      <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
            onPress={() => setFilter('ALL')}
          >
              <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'LOW_STOCK' && styles.filterChipActive]}
            onPress={() => setFilter('LOW_STOCK')}
          >
              <Text style={[styles.filterText, filter === 'LOW_STOCK' && styles.filterTextActive]}>Estoque Baixo</Text>
          </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={getFilteredProducts()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} />}
          ListEmptyComponent={
              <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
              </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
  },
  filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#fff',
      marginRight: 8,
      borderWidth: 1,
      borderColor: '#e0e0e0',
  },
  filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
  },
  filterText: {
      fontSize: 14,
      color: '#666',
      fontWeight: '500',
  },
  filterTextActive: {
      color: '#fff',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    ...shadow.card,
  },
  cardIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#e3f2fd',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  cardContent: {
      flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  lowStockBadge: {
      backgroundColor: '#ffebee',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
  },
  lowStockText: {
      color: colors.danger,
      fontSize: 10,
      fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  stock: {
    fontSize: 13,
    color: '#666',
  },
  stockLow: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  emptyContainer: {
      alignItems: 'center',
      marginTop: 60,
  },
  emptyText: {
      marginTop: 12,
      color: '#999',
      fontSize: 16,
  }
});

export default ProductsListScreen;
