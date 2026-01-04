import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../ui/components/Header';
import Card from '../ui/components/Card';
import Badge from '../ui/components/Badge';
import { colors, spacing } from '../ui/theme';

interface Order {
  id: string;
  customerName: string;
  status: string;
  totalAmount: number;
  mercadoLivreId: string | null;
}

const OrdersScreen = () => {
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
    { label: 'Enviado ao fornecedor', value: 'SENT_TO_SUPPLIER' as const, icon: 'send' as const },
    { label: 'Em transporte', value: 'SHIPPING' as const, icon: 'cube' as const },
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
      case 'SENT_TO_SUPPLIER': return 'Enviado ao fornecedor';
      case 'SHIPPING': return 'Em transporte';
      case 'DELIVERED': return 'Entregue';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity onPress={() => (navigation as any).navigate('OrderDetails', { order: item })}>
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.customerName}>{item.customerName || 'Cliente Anônimo'}</Text>
          <Badge
            text={getStatusLabel(item.status)}
            color="#FFF"
            backgroundColor={getStatusColor(item.status)}
          />
        </View>
        <Text style={styles.orderId}>ID: {item.id.substring(0, 8)}...</Text>
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>R$ {item.totalAmount.toFixed(2)}</Text>
        </View>
        {item.mercadoLivreId && <Text style={styles.mlId}>ML ID: {item.mercadoLivreId}</Text>}
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header showLogo logoSize={32} animateLogo={isFocused} animateKey={animateTick} logoDuration={700} rightIcon="refresh" onRightPress={() => loadOrders()} />

      <View style={styles.filterBar}>
        {STATUS_OPTIONS.map(opt => {
          const active = (selectedStatus ?? null) === opt.value;
          const color = opt.value ? getStatusColor(String(opt.value)) : '#007bff';
          const key = opt.value ?? 'ALL';
          const count = counts[String(key)] ?? 0;
          return (
            <TouchableOpacity key={String(opt.value)} style={[styles.filterPill, active ? [styles.filterPillActive, { borderColor: color, backgroundColor: '#fff' }] : null]} onPress={() => { setSelectedStatus(opt.value); }}>
              <Ionicons name={opt.icon} size={14} color={active ? color : '#777'} />
              <Text style={[styles.filterText, active ? { color } : null]}>{opt.label}{typeof count === 'number' ? ` (${count})` : ''}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
                <Text style={styles.emptyText}>Novos pedidos do Mercado Livre aparecerão aqui.</Text>
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
    backgroundColor: '#F0F2F5',
  },
  list: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginTop: 8,
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  filterPillActive: {
    borderColor: '#007bff',
    backgroundColor: '#e6f0ff',
  },
  filterText: {
    fontSize: 12,
    color: '#555',
    fontWeight: 'bold',
  },
  filterTextActive: {
    color: '#007bff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  orderId: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginRight: 4,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  mlId: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007bff',
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
});

export default OrdersScreen;
