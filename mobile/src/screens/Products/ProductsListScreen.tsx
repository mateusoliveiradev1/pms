import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Header from '../../ui/components/Header';

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
  const [animateTick, setAnimateTick] = useState(0);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.log('Error loading products', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadProducts();
    }
  }, [isFocused]);

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={[styles.badge, { color: item.stockAvailable < 5 ? '#c62828' : '#1976d2' }]}>
          {item.stockAvailable < 5 ? 'BAIXO' : 'OK'}
        </Text>
      </View>
      <Text style={styles.cardSubtitle}>SKU: {item.sku}</Text>
      <View style={styles.row}>
        <Text style={styles.price}>R$ {item.finalPrice?.toFixed(2) || '0.00'}</Text>
        <Text style={[styles.stock, item.stockAvailable < 5 ? styles.stockLow : null]}>
          Estoque: {item.stockAvailable}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => navigation.goBack()} showLogo logoSize={32} animateLogo={isFocused} animateKey={animateTick} logoDuration={700} rightIcon="refresh" onRightPress={() => loadProducts()} />

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setAnimateTick(t => t + 1); loadProducts(); }} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    color: '#666',
    marginTop: 4,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stock: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  stockLow: {
    color: '#c62828',
  },
  badge: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ProductsListScreen;
