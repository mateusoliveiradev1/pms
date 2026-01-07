import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../ui/components/Header';
import { colors, shadow } from '../../ui/theme';

type Product = {
    id: string;
    name: string;
    finalPrice: number;
    sku: string;
    stockAvailable: number;
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
    } catch (error: any) {
      console.log(error);
      const msg = error.response?.data?.message || 'Falha ao criar pedido.';
      // Check for specific error message about stock
      if (msg.includes('Insufficient stock')) {
          Alert.alert('Estoque Insuficiente', 'Não há estoque suficiente para este produto.');
      } else {
          Alert.alert('Erro', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Novo Pedido Manual" onBack={() => navigation.goBack()} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dados do Cliente</Text>
                <Text style={styles.label}>Nome do Cliente *</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder="Ex: João da Silva"
                        placeholderTextColor="#999"
                    />
                </View>

                <Text style={styles.label}>Endereço de Entrega</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="location-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={customerAddress}
                        onChangeText={setCustomerAddress}
                        placeholder="Ex: Rua das Flores, 123"
                        placeholderTextColor="#999"
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Detalhes do Pedido</Text>
                <Text style={styles.label}>Produto *</Text>
                <TouchableOpacity 
                    style={styles.selector} 
                    onPress={() => setModalVisible(true)}
                >
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="cube-outline" size={20} color={selectedProduct ? colors.primary : '#999'} style={{marginRight: 8}} />
                        <Text style={{ color: selectedProduct ? '#333' : '#999', fontSize: 16 }}>
                            {selectedProduct ? selectedProduct.name : 'Selecione um produto'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                {selectedProduct && (
                    <View style={styles.productInfo}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>SKU:</Text>
                            <Text style={styles.infoValue}>{selectedProduct.sku}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Preço Unit.:</Text>
                            <Text style={styles.infoValue}>R$ {selectedProduct.finalPrice.toFixed(2)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Estoque:</Text>
                            <Text style={[styles.infoValue, { color: selectedProduct.stockAvailable > 0 ? colors.success : colors.error }]}>
                                {selectedProduct.stockAvailable} un
                            </Text>
                        </View>
                    </View>
                )}

                <Text style={styles.label}>Quantidade</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="calculator-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={quantity}
                        onChangeText={setQuantity}
                        placeholder="1"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                    />
                </View>

                {selectedProduct && (
                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>Total Estimado</Text>
                        <Text style={styles.totalValue}>
                            R$ {(selectedProduct.finalPrice * (parseInt(quantity) || 1)).toFixed(2)}
                        </Text>
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.saveButtonText}>Criar Pedido</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            <Header title="Selecionar Produto" onBack={() => setModalVisible(false)} rightIcon="close" onRightPress={() => setModalVisible(false)} />
            <FlatList
                data={products}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.modalItem}
                        onPress={() => {
                            setSelectedProduct(item);
                            setModalVisible(false);
                        }}
                    >
                        <View style={styles.modalIconContainer}>
                             <Ionicons name="cube" size={24} color={colors.primary} />
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.modalItemTitle}>{item.name}</Text>
                            <Text style={styles.modalItemSubtitle}>
                                SKU: {item.sku} | Estoque: {item.stockAvailable}
                            </Text>
                            <Text style={styles.modalItemPrice}>R$ {item.finalPrice.toFixed(2)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
  form: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...shadow.card,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
      marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  productInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0e3ff',
  },
  infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
  },
  infoLabel: {
      fontSize: 14,
      color: '#666',
  },
  infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  totalContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    ...shadow.card,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...shadow.card,
  },
  modalIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#e3f2fd',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalItemPrice: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
      marginTop: 2,
  },
});

export default OrderFormScreen;