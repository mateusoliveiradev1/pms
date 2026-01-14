import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Header from '../../ui/components/Header';
import { useAuth } from '../../context/AuthContext';
import { colors, shadow, radius, spacing } from '../../ui/theme';

import { useAuthRole } from '../../hooks/useAuthRole';

type Product = {
  id: string;
  name: string;
  sku: string;
  stockAvailable: number;
  price: number;
};

type FilterType = 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK';

const ProductsListScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const navigation = useNavigation();
  const route = useRoute();
  
  // @ts-ignore
  const { initialSupplier } = (route.params as { initialSupplier?: any }) || {};

  const { activeAccountId, loading: authLoading } = useAuth();
  const { isSystemAdmin } = useAuthRole();

  useEffect(() => {
    // @ts-ignore
    if (route.params?.filter) {
        // @ts-ignore
        setFilter(route.params.filter);
    }
  }, [route.params]);

  const loadProducts = async (silent = false) => {
    if (!isSystemAdmin && !activeAccountId) {
        setLoading(false);
        return;
    }

    try {
      if (!refreshing && !silent) setLoading(true);
      
      const params: any = {};
      if (query) params.query = query;
      
      // Apply initial supplier filter if present (simple implementation for MVP)
      if (initialSupplier) {
          params.supplierId = initialSupplier.id;
      }
      
      const response = await api.get('/products', { params });
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
        const interval = setInterval(() => {
            loadProducts(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [query, activeAccountId, isSystemAdmin])
  );

  const getFilteredProducts = () => {
      let result = products;
      if (filter === 'LOW_STOCK') {
          result = result.filter(p => p.stockAvailable < 5 && p.stockAvailable > 0);
      } else if (filter === 'OUT_OF_STOCK') {
          result = result.filter(p => p.stockAvailable === 0);
      }
      return result;
  };

  const filteredProducts = getFilteredProducts();

  const renderFilterChip = (label: string, value: FilterType) => (
    <TouchableOpacity 
        style={[styles.filterChip, filter === value && styles.filterChipActive]}
        onPress={() => setFilter(value)}
    >
        <Text style={[styles.filterChipText, filter === value && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Product }) => {
      const isLowStock = item.stockAvailable < 5 && item.stockAvailable > 0;
      const isOutOfStock = item.stockAvailable === 0;

      return (
        <TouchableOpacity 
          style={styles.card}
          // @ts-ignore
          onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, isOutOfStock ? styles.iconContainerDisabled : null]}>
             <Ionicons 
                name="cube-outline" 
                size={28} 
                color={isOutOfStock ? colors.muted : colors.primary} 
             />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                {isLowStock && (
                    <View style={styles.badgeWarning}>
                        <Text style={styles.badgeTextWarning}>Baixo Estoque</Text>
                    </View>
                )}
                {isOutOfStock && (
                    <View style={styles.badgeDanger}>
                        <Text style={styles.badgeTextDanger}>Esgotado</Text>
                    </View>
                )}
            </View>
            
            <Text style={styles.cardSku}>SKU: {item.sku}</Text>
            
            <View style={styles.cardFooter}>
                <Text style={styles.price}>
                    R$ <Text style={styles.priceValue}>{(item.price || 0).toFixed(2)}</Text>
                </Text>
                <View style={styles.stockContainer}>
                    <Ionicons name="layers-outline" size={14} color={colors.muted} style={{marginRight: 4}} />
                    <Text style={[
                        styles.stockText, 
                        isLowStock && styles.textWarning,
                        isOutOfStock && styles.textDanger
                    ]}>
                        {item.stockAvailable} un
                    </Text>
                </View>
            </View>
          </View>

          <View style={styles.arrowContainer}>
             <Ionicons name="chevron-forward" size={20} color={colors.border} />
          </View>
        </TouchableOpacity>
      );
  };

  if (authLoading) {
      return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
              <ActivityIndicator size="large" color={colors.primary} />
          </View>
      );
  }

  if (!isSystemAdmin && !activeAccountId) {
      return (
          <SafeAreaView style={styles.container} edges={['top']}>
              <Header title="Produtos" onBack={() => navigation.goBack()} />
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                  <Ionicons name="cube-outline" size={64} color={colors.muted} />
                  <Text style={{ marginTop: 16, color: colors.muted, textAlign: 'center' }}>
                      Nenhuma conta ativa identificada.
                  </Text>
              </View>
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        onBack={() => navigation.goBack()} 
        title="Produtos"
        rightIcon="add-circle" 
        // @ts-ignore
        onRightPress={() => navigation.navigate('ProductForm')} 
      />
      
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.muted} style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Buscar produtos..."
                value={query}
                onChangeText={setQuery}
                placeholderTextColor={colors.muted}
            />
            {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                </TouchableOpacity>
            )}
        </View>
      </View>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {renderFilterChip('Todos', 'ALL')}
            {renderFilterChip('Baixo Estoque', 'LOW_STOCK')}
            {renderFilterChip('Esgotados', 'OUT_OF_STOCK')}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} />
        }
        ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyState}>
                    <Ionicons name="cube-outline" size={64} color={colors.border} />
                    <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
                </View>
            ) : null
        }
      />

      {loading && (
          <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
          </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
    elevation: 2, // Slightly less elevation for search bar
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterSection: {
    paddingBottom: spacing.sm,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow.card,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerDisabled: {
      backgroundColor: '#f0f0f0',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  cardSku: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 14,
    color: colors.text,
  },
  priceValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.primary,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  stockText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  textWarning: {
      color: colors.warning,
  },
  textDanger: {
      color: colors.danger,
  },
  badgeWarning: {
      backgroundColor: colors.warning + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
  },
  badgeTextWarning: {
      fontSize: 10,
      color: colors.warning,
      fontWeight: 'bold',
  },
  badgeDanger: {
      backgroundColor: colors.danger + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
  },
  badgeTextDanger: {
      fontSize: 10,
      color: colors.danger,
      fontWeight: 'bold',
  },
  arrowContainer: {
      marginLeft: spacing.sm,
  },
  loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255,255,255,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 60,
  },
  emptyText: {
      marginTop: spacing.md,
      fontSize: 16,
      color: colors.muted,
  }
});

export default ProductsListScreen;
