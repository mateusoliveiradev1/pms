import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../ui/components/Header';
import Badge from '../../ui/components/Badge';
import { colors, spacing, shadow } from '../../ui/theme';

import { useAuth } from '../../context/AuthContext';
import { useAuthRole } from '../../hooks/useAuthRole';

interface Order {
  id: string;
  customerName: string;
  status: string;
  totalAmount: number;
  mercadoLivreId: string | null;
  createdAt: string;
}

interface Supplier {
    id: string;
    name: string;
    fantasyName?: string;
}

const STATUS_OPTIONS = [
    { label: 'Todos', value: null as string | null, icon: 'list' as const },
    { label: 'Novo', value: 'NEW' as const, icon: 'sparkles' as const },
    { label: 'Pendente', value: 'PENDING' as const, icon: 'time' as const },
    { label: 'Enviado', value: 'SENT_TO_SUPPLIER' as const, icon: 'paper-plane' as const },
    { label: 'Transporte', value: 'SHIPPING' as const, icon: 'bus' as const },
    { label: 'Entregue', value: 'DELIVERED' as const, icon: 'checkmark-circle' as const },
    { label: 'Cancelado', value: 'CANCELLED' as const, icon: 'close-circle' as const },
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'NEW': return colors.primary;
        case 'SENT_TO_SUPPLIER': return '#fd7e14';
        case 'SHIPPING': return '#17a2b8';
        case 'DELIVERED': return colors.success;
        case 'CANCELLED': return colors.error;
        default: return colors.muted;
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NEW': return 'Novo';
      case 'SENT_TO_SUPPLIER': return 'Enviado';
      case 'SHIPPING': return 'Transporte';
      case 'DELIVERED': return 'Entregue';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
};

const OrdersListScreen = () => {
  const { activeAccountId } = useAuth();
  const { isSystemAdmin } = useAuthRole();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animateTick, setAnimateTick] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  
  // Admin Filter States
  const [modalVisible, setModalVisible] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const navigation = useNavigation();
  // @ts-ignore
  const { initialSupplier } = (useRoute().params as { initialSupplier?: Supplier }) || {};

  useEffect(() => {
    if (initialSupplier) {
        setSelectedSupplier(initialSupplier);
    }
  }, [initialSupplier]);

  const loadSuppliers = useCallback(async () => {
      try {
          const response = await api.get('/suppliers');
          setSuppliers(response.data);
      } catch (error) {
          console.log('Error loading suppliers', error);
      }
  }, []);

  const loadOrders = useCallback(async (silent = false) => {
    // If NOT admin and NO account, block.
    if (!isSystemAdmin && !activeAccountId) {
        setLoading(false);
        return;
    }

    try {
      if (!silent) setLoading(true);
      
      const params: any = {};
      if (selectedStatus) params.status = selectedStatus;
      
      if (isSystemAdmin) {
          if (selectedSupplier) {
              params.supplierId = selectedSupplier.id;
          }
          // If no supplier selected, no params -> Global Fetch
      }

      const response = await api.get('/orders', { params });
      setOrders(response.data);
    } catch (error) {
      console.log('Error loading orders', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSystemAdmin, activeAccountId, selectedStatus, selectedSupplier]);

  const loadCounts = useCallback(async () => {
    if (!isSystemAdmin && !activeAccountId) return;

    try {
      const response = await api.get('/orders/stats');
      setCounts(response.data || {});
    } catch (err) {
      // Fallback: Calculate from current list if API fails
      try {
        const local: Record<string, number> = { ALL: ordersRef.current.length, NEW: 0, SENT_TO_SUPPLIER: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 };
        for (const o of ordersRef.current) {
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
  }, [isSystemAdmin, activeAccountId]);

  useFocusEffect(
    useCallback(() => {
        if (isSystemAdmin) {
            loadSuppliers();
        }
        loadOrders();
        loadCounts();

        const interval = setInterval(() => {
            loadOrders(true);
            loadCounts();
        }, 5000);

        return () => clearInterval(interval);
    }, [isSystemAdmin, loadSuppliers, loadOrders, loadCounts])
  );

  const visibleOrders = useMemo(() => {
    if (!selectedStatus) return orders;
    return orders.filter(o => o.status === selectedStatus);
  }, [orders, selectedStatus]);

  // Rendering Hierarchy
  if (!isSystemAdmin && !activeAccountId) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <Header 
            showLogo 
            logoSize={32} 
            // @ts-ignore
            animateLogo={true} 
            animateKey={animateTick} 
          />
          <View style={styles.center}>
             <Ionicons name="albums-outline" size={64} color={colors.border} />
             <Text style={styles.emptyTitle}>Nenhuma Conta Selecionada</Text>
             <Text style={styles.emptyText}>Selecione uma conta para visualizar os pedidos.</Text>
          </View>
        </SafeAreaView>
      );
  }

  const onRefresh = useCallback(() => {
      setRefreshing(true);
      setAnimateTick(t => t + 1);
      loadOrders();
      loadCounts();
  }, [loadOrders, loadCounts]);

  const renderItem = useCallback(({ item }: { item: Order }) => (
    <TouchableOpacity 
        style={styles.card} 
        onPress={() => (navigation as any).navigate('OrderDetails', { order: item })}
        activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.orderIdContainer}>
            <View style={[styles.iconBox, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                <Ionicons name="receipt-outline" size={20} color={getStatusColor(item.status)} />
            </View>
            <View>
                <Text style={styles.orderId}>#{item.id.substring(0, 8).toUpperCase()}</Text>
                <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
        </View>
        <Badge
          text={getStatusLabel(item.status)}
          color="#FFF"
          backgroundColor={getStatusColor(item.status)}
          style={{ borderRadius: 8, paddingHorizontal: 8 }}
        />
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.cardBody}>
         <View style={styles.customerInfo}>
             <Ionicons name="person-outline" size={14} color={colors.muted} style={{marginRight: 4}} />
             <Text style={styles.customerName} numberOfLines={1}>
                {item.customerName || 'Cliente não identificado'}
             </Text>
         </View>
         <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>R$ {item.totalAmount.toFixed(2)}</Text>
         </View>
      </View>
      
      {item.mercadoLivreId && (
        <View style={styles.mlTag}>
           <Ionicons name="pricetag" size={10} color="#333" />
           <Text style={styles.mlText}>ML</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        showLogo 
        logoSize={32} 
        animateLogo={true} 
        animateKey={animateTick} 
        logoDuration={700} 
        rightIcon={isSystemAdmin ? "filter" : "refresh"} 
        onRightPress={() => isSystemAdmin ? setModalVisible(true) : loadOrders()} 
      />

      {isSystemAdmin && (
          <View style={styles.adminFilterBar}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Ionicons name={selectedSupplier ? "business" : "globe-outline"} size={16} color={colors.primary} style={{marginRight: 8}} />
                 <Text style={styles.adminFilterText}>
                    {selectedSupplier ? `${selectedSupplier.name}` : 'Visão Global (Todos os Pedidos)'}
                 </Text>
              </View>
              {selectedSupplier && (
                  <TouchableOpacity onPress={() => setSelectedSupplier(null)}>
                      <Ionicons name="close-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
              )}
          </View>
      )}

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {STATUS_OPTIONS.map(opt => {
            const active = (selectedStatus ?? null) === opt.value;
            const color = opt.value ? getStatusColor(String(opt.value)) : colors.primary;
            const countKey = opt.value ?? 'ALL'; 
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
                    <Ionicons name={opt.icon} size={16} color={active ? '#FFF' : colors.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.filterText, active && { color: '#FFF' }]}>
                        {opt.label}
                    </Text>
                    {count !== undefined && (
                        <View style={[styles.counterBadge, active ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: '#f0f0f0' }]}>
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
                    <Ionicons name="cart-outline" size={64} color={colors.border} />
                </View>
                <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
                <Text style={styles.emptyText}>
            {selectedStatus ? 'Não há pedidos com este status.' : 'Quando um pedido for realizado, ele aparecerá aqui.'}
          </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => (navigation as any).navigate('OrderForm')}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

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
    backgroundColor: '#f8f9fa',
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
    ...shadow.sm,
    zIndex: 1,
  },
  filterScroll: {
      paddingHorizontal: 16,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  filterText: {
    fontSize: 14,
    color: colors.text,
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
      color: colors.text,
  },
  card: {
      marginBottom: 16,
      padding: 16,
      borderRadius: 16,
      backgroundColor: '#fff',
      ...shadow.card,
      borderWidth: 1,
      borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderIdContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  dateText: {
      fontSize: 12,
      color: colors.muted,
  },
  divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 12,
  },
  cardBody: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  customerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  customerName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  amountContainer: {
      alignItems: 'flex-end',
  },
  amountLabel: {
      fontSize: 10,
      color: colors.muted,
      textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  mlTag: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffe600',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
  },
  mlText: {
      fontSize: 10,
      fontWeight: 'bold',
      marginLeft: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
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
    ...shadow.lg,
    zIndex: 10,
  },
  adminFilterBar: {
      backgroundColor: '#E3F2FD',
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#BBDEFB',
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

export default OrdersListScreen;