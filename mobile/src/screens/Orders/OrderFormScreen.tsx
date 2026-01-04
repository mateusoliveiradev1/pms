import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Product = {
    id: string;
    name: string;
    finalPrice: number;
    sku: string;
};

const OrderFormScreen = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  const navigation = useNavigation();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
        const response = await api.get('/products');
        setProducts(response.data);
    } catch (error) {
        console.log('Error fetching products', error);
    }
  };

  const handleSave = async () => {
    if (!customerName || !selectedProduct) {
      Alert.alert('Erro', 'Preencha o nome do cliente e selecione um produto.');
      return;
    }

    setLoading(true);
    try {
      const qty = parseInt(quantity, 10) || 1;
      const totalAmount = selectedProduct.finalPrice * qty;

      await api.post('/orders', {
        customerName,
        customerAddress,
        totalAmount,
        mercadoLivreId: null, // Pedido Manual
        items: [
            {
                productId: selectedProduct.id,
                quantity: qty,
                price: selectedProduct.finalPrice
            }
        ]
      });
      Alert.alert('Sucesso', 'Pedido criado com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao criar pedido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Pedido Manual</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Nome do Cliente *</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Ex: João da Silva"
        />

        <Text style={styles.label}>Endereço de Entrega</Text>
        <TextInput
          style={styles.input}
          value={customerAddress}
          onChangeText={setCustomerAddress}
          placeholder="Ex: Rua das Flores, 123"
        />

        <Text style={styles.label}>Produto *</Text>
        <TouchableOpacity 
            style={styles.selector} 
            onPress={() => setModalVisible(true)}
        >
            <Text style={{ color: selectedProduct ? '#000' : '#999' }}>
                {selectedProduct ? selectedProduct.name : 'Selecione um produto'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>

        {selectedProduct && (
            <View style={styles.productInfo}>
                <Text style={styles.infoText}>SKU: {selectedProduct.sku}</Text>
                <Text style={styles.infoText}>Preço Unit.: R$ {selectedProduct.finalPrice.toFixed(2)}</Text>
            </View>
        )}

        <Text style={styles.label}>Quantidade</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="1"
          keyboardType="numeric"
        />

        {selectedProduct && (
            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Estimado:</Text>
                <Text style={styles.totalValue}>
                    R$ {(selectedProduct.finalPrice * (parseInt(quantity) || 1)).toFixed(2)}
                </Text>
            </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
            {loading ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={styles.saveButtonText}>Criar Pedido</Text>
            )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Selecionar Produto</Text>
            </View>
            <FlatList
                data={products}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.modalItem}
                        onPress={() => {
                            setSelectedProduct(item);
                            setModalVisible(false);
                        }}
                    >
                        <Text style={styles.modalItemTitle}>{item.name}</Text>
                        <Text style={styles.modalItemSubtitle}>{item.sku} - R$ {item.finalPrice.toFixed(2)}</Text>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  selector: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
      backgroundColor: '#e9ecef',
      padding: 10,
      borderRadius: 8,
      marginBottom: 20,
  },
  infoText: {
      color: '#495057',
      marginBottom: 4,
  },
  totalContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 30,
      padding: 15,
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#28a745',
  },
  totalLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
  },
  totalValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#28a745',
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalItemSubtitle: {
      fontSize: 14,
      color: '#666',
  },
});

export default OrderFormScreen;
