import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../ui/components/Header';
import Card from '../../ui/components/Card';
import Badge from '../../ui/components/Badge';
import { colors, spacing, shadow } from '../../ui/theme';

interface Order {
  id: string;
  customerName: string;
  status: string;
  totalAmount: number;
  mercadoLivreId: string | null;
}

const OrdersListScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animateTick, setAnimateTick] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const STATUS_OPTIONS = [
    { label: 'Todos', value: null as string | null, icon: 'list' as const },
    { label: 'Novo', value: 'NEW' as const, icon: 'document-text' as const },
    { label: 'Enviado', value: 'SENT_TO_SUPPLIER' as const, icon: 'send' as const },
    { label: 'Transporte', value: 'SHIPPING' as const, icon: 'bus' as const },
    { label: 'Entregue', value: 'DELIVERED' as const, icon: 'checkmark-circle' as const },
    { label: 'Cancelado', value: 'CANCELLED' as const, icon: 'close-circle' as const },
  ];

  useEffect(() => {
    if (isFocused) {
        loadOrders();
        loadCounts();
    }
  }, [isFocused]);

  useEffect(() => {
    loadOrders();
  }, [selectedStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders', { params: selectedStatus ? { status: selectedStatus } : undefined });
      setOrders(response.data);
    } catch (error) {
      console.log('Error loading orders', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCounts = async () => {
    try {
      const response = await api.get('/orders/stats');
      setCounts(response.data || {});
    } catch (err) {
      // Fallback local count if endpoint fails
      try {
        const response = await api.get('/orders');
        const list: Order[] = response.data || [];
        const local: Record<string, number> = { ALL: list.length, NEW: 0, SENT_TO_SUPPLIER: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 };
        for (const o of list) {
          const key = o.status;
          if (local[key] !== undefined) {
            local[key] += 1;
          }
        }
        setCounts(local);
      } catch {
        setCounts({});
      }
    }
  };

  const visibleOrders = useMemo(() => {
    // If API filtering is not enough or we want local filtering for speed
    if (!selectedStatus) return orders;
    return orders.filter(o => o.status === selectedStatus);
  }, [orders, selectedStatus]);

  const onRefresh = () => {
      setRefreshing(true);
      setAnimateTick(t => t + 1);
      loadOrders();
      loadCounts();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'NEW': return '#007bff';
        case 'SENT_TO_SUPPLIER': return '#fd7e14';
        case 'SHIPPING': return '#17a2b8';
        case 'DELIVERED': return '#28a745';
        case 'CANCELLED': return '#dc3545';
        default: return '#6c757d';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NEW': return 'Novo';
      case 'SENT_TO_SUPPLIER': return 'Enviado ao Fornecedor';
      case 'SHIPPING': return 'Em Transporte';
      case 'DELIVERED': return 'Entregue';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity onPress={() => (navigation as any).navigate('OrderDetails', { order: item })}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
              <Ionicons name="cart-outline" size={24} color={colors.primary} />
          </View>
          <View style={{flex: 1}}>
             <Text style={styles.customerName}>{item.customerName || 'Cliente Anônimo'}</Text>
             <Text style={styles.orderId}>#{item.id.substring(0, 8)}</Text>
          </View>
          <Badge
            text={getStatusLabel(item.status)}
            color="#FFF"
            backgroundColor={getStatusColor(item.status)}
            style={{ borderRadius: 8 }}
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total do Pedido</Text>
          <Text style={styles.totalValue}>R$ {item.totalAmount.toFixed(2)}</Text>
        </View>
        {item.mercadoLivreId && (
            <View style={styles.mlTag}>
                <Ionicons name="logo-yen" size={12} color="#FFF" style={{marginRight: 4}} /> 
                <Text style={styles.mlId}>Mercado Livre</Text>
            </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        showLogo 
        logoSize={32} 
        animateLogo={isFocused} 
        animateKey={animateTick} 
        logoDuration={700} 
        rightIcon="refresh" 
        onRightPress={() => loadOrders()} 
      />

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {STATUS_OPTIONS.map(opt => {
            const active = (selectedStatus ?? null) === opt.value;
            const color = opt.value ? getStatusColor(String(opt.value)) : colors.primary;
            // Count logic is a bit tricky if keys don't match exactly, assuming simple mapping
            const countKey = opt.value ?? 'ALL'; 
            // We might need to map 'SENT_TO_SUPPLIER' to count key if different, but let's assume it matches
            const count = counts[String(countKey)];

            return (
                <TouchableOpacity 
                    key={String(opt.value)} 
                    style={[
                        styles.filterPill, 
                        active && { backgroundColor: color, borderColor: color }
                    ]} 
                    onPress={() => setSelectedStatus(opt.value)}
                >
                    <Ionicons name={opt.icon} size={16} color={active ? '#FFF' : '#666'} style={{ marginRight: 6 }} />
                    <Text style={[styles.filterText, active && { color: '#FFF' }]}>
                        {opt.label}
                    </Text>
                    {count !== undefined && (
                        <View style={[styles.counterBadge, active ? { backgroundColor: 'rgba(255,255,255,0.3)' } : { backgroundColor: '#eee' }]}>
                            <Text style={[styles.counterText, active && { color: '#FFF' }]}>{count}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            );
            })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="cart-outline" size={64} color="#ccc" />
                </View>
                <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
                <Text style={styles.emptyText}>
                    {selectedStatus ? 'Não há pedidos com este status.' : 'Seus pedidos aparecerão aqui.'}
                </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('OrderForm' as never)}
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
  },
  center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  filtersContainer: {
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterScroll: {
      paddingHorizontal: 16,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  counterBadge: {
      marginLeft: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
  },
  counterText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#666',
  },
  card: {
      marginBottom: 12,
      padding: 16,
      borderRadius: 16,
      ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#f0f7ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderId: {
    fontSize: 12,
    color: '#999',
  },
  divider: {
      height: 1,
      backgroundColor: '#f0f0f0',
      marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  mlTag: {
      position: 'absolute',
      top: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffe600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
  },
  mlId: {
    fontSize: 10,
    color: '#333',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.card,
    elevation: 6,
  },
});

export default OrdersListScreen;