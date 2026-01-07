import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../ui/components/Header';
import { useIsFocused } from '@react-navigation/native';
import { colors, radius, shadow } from '../../ui/theme';

type Supplier = {
    id: string;
    name: string;
    integrationType?: string;
    status?: string;
};

const ProductFormScreen = () => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [supplierPrice, setSupplierPrice] = useState('');
  const [stockAvailable, setStockAvailable] = useState('');
  const [safetyStock, setSafetyStock] = useState('0');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [marginValue, setMarginValue] = useState('');
  const isFocused = useIsFocused();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState('');
  
  const navigation = useNavigation();
  const route = useRoute();
  // @ts-ignore
  const { productId } = route.params || {};

  useEffect(() => {
    fetchSuppliers();
    if (productId) {
        loadProductData();
    }
  }, [productId]);

  const loadProductData = async () => {
    try {
        setLoading(true);
        const response = await api.get(`/products/${productId}`);
        const p = response.data;
        setName(p.name);
        setSku(p.sku);
        setDescription(p.description || '');
        setMarginValue(String(p.marginValue || '0'));
        
        // Handle Supplier Info (taking first one for MVP)
        if (p.suppliers && p.suppliers.length > 0) {
            const rel = p.suppliers[0];
            setSupplierPrice(String(rel.supplierPrice));
            setStockAvailable(String(rel.virtualStock));
            setSafetyStock(String(rel.safetyStock));
            if (rel.supplier) {
                setSelectedSupplier(rel.supplier);
            }
        }
    } catch (error) {
        console.log('Error loading product for edit', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do produto.');
        navigation.goBack();
    } finally {
        setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
        const response = await api.get('/suppliers');
        setSuppliers(response.data);
    } catch (error) {
        console.log('Error fetching suppliers', error);
    }
  };

  const handleSave = async () => {
    if (!name || !sku || !supplierPrice || !selectedSupplier) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios (Nome, SKU, Preço, Fornecedor).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        sku,
        description,
        supplierPrice: parseFloat(supplierPrice),
        virtualStock: parseInt(stockAvailable || '0', 10), // We use this input as virtual stock
        safetyStock: parseInt(safetyStock || '0', 10),
        supplierId: selectedSupplier.id,
        marginType: 'FIXED', 
        marginValue: parseFloat(marginValue || '0'),
      };

      if (productId) {
          await api.put(`/products/${productId}`, payload);
          Alert.alert('Sucesso', 'Produto atualizado com sucesso!');
      } else {
          await api.post('/products', {
              ...payload,
              stockAvailable: parseInt(stockAvailable || '0', 10), // Initial stock logic for create
          });
          Alert.alert('Sucesso', 'Produto cadastrado com sucesso!');
      }
      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label: string, value: string, setValue: (t: string) => void, placeholder: string, options?: any) => (
      <View style={styles.inputContainer}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
              style={[styles.input, options?.multiline && styles.textArea]}
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor="#999"
              {...options}
          />
      </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={productId ? "Editar Produto" : "Novo Produto"} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
                {renderInput("Nome do Produto *", name, setName, "Ex: Fone Bluetooth")}
                {renderInput("SKU *", sku, setSku, "Ex: FONE-001", { autoCapitalize: "characters" })}
                {renderInput("Descrição", description, setDescription, "Detalhes do produto", { multiline: true, numberOfLines: 3 })}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preço e Estoque</Text>
                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 8}}>
                        {renderInput("Custo (R$) *", supplierPrice, setSupplierPrice, "0.00", { keyboardType: "numeric" })}
                    </View>
                    <View style={{flex: 1, marginLeft: 8}}>
                         {renderInput("Margem (R$)", marginValue, setMarginValue, "0.00", { keyboardType: "numeric" })}
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 8}}>
                        {renderInput("Estoque Atual", stockAvailable, setStockAvailable, "0", { keyboardType: "numeric" })}
                    </View>
                    <View style={{flex: 1, marginLeft: 8}}>
                        {renderInput("Estoque Mín.", safetyStock, setSafetyStock, "0", { keyboardType: "numeric" })}
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Fornecedor *</Text>
                <TouchableOpacity 
                    style={styles.selector}
                    onPress={() => setModalVisible(true)}
                >
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="business-outline" size={20} color={colors.primary} style={{marginRight: 8}} />
                        <Text style={selectedSupplier ? styles.selectorText : styles.placeholderText}>
                            {selectedSupplier ? selectedSupplier.name : 'Selecione um fornecedor'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar Produto</Text>
              )}
            </TouchableOpacity>
            <View style={{height: 40}} />
          </ScrollView>
      </KeyboardAvoidingView>

      {/* Supplier Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Selecione o Fornecedor</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#999" style={{marginRight: 8}} />
                    <TextInput
                        style={styles.modalSearchInput}
                        placeholder="Buscar fornecedor..."
                        value={supplierQuery}
                        onChangeText={setSupplierQuery}
                    />
                </View>

                <FlatList
                    data={suppliers.filter(s => s.name.toLowerCase().includes(supplierQuery.toLowerCase()))}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{padding: 16}}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.modalItem}
                            onPress={() => {
                                setSelectedSupplier(item);
                                setModalVisible(false);
                            }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text style={styles.modalItemTitle}>{item.name}</Text>
                                    <Text style={styles.modalItemSubtitle}>{item.integrationType || 'MANUAL'}</Text>
                                </View>
                                {item.status && (
                                    <View style={[
                                        styles.statusBadge, 
                                        { backgroundColor: item.status === 'ACTIVE' ? '#e6f4ea' : '#fdecea' }
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            { color: item.status === 'ACTIVE' ? '#1e7e34' : '#c62828' }
                                        ]}>
                                            {item.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
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
  form: {
    padding: 20,
  },
  section: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      ...shadow.card,
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#333',
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
      paddingBottom: 8,
  },
  inputContainer: {
      marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selector: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    ...shadow.card,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
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
    height: '80%',
    ...shadow.card,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      margin: 16,
      paddingHorizontal: 12,
      borderRadius: 12,
      height: 44,
  },
  modalSearchInput: {
      flex: 1,
      fontSize: 16,
      color: '#333',
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  modalItemSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  }
});

export default ProductFormScreen;
