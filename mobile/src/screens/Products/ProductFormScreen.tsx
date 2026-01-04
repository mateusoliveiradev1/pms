import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../ui/components/Header';
import { useIsFocused } from '@react-navigation/native';

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
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [marginValue, setMarginValue] = useState('');
  const isFocused = useIsFocused();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState('');
  
  const navigation = useNavigation();

  useEffect(() => {
    fetchSuppliers();
  }, []);

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
      await api.post('/products', {
        name,
        sku,
        description,
        supplierPrice: parseFloat(supplierPrice),
        stockAvailable: parseInt(stockAvailable || '0', 10),
        virtualStock: parseInt(stockAvailable || '0', 10), // Inicialmente igual
        supplierId: selectedSupplier.id,
        marginType: 'FIXED', // Simplificado para MVP
        marginValue: parseFloat(marginValue || '0'),
      });
      Alert.alert('Sucesso', 'Produto cadastrado com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={() => navigation.goBack()} showLogo logoSize={32} animateLogo={isFocused} logoDuration={700} />

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Nome do Produto *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Fone Bluetooth"
        />

        <Text style={styles.label}>SKU *</Text>
        <TextInput
          style={styles.input}
          value={sku}
          onChangeText={setSku}
          placeholder="Ex: FONE-001"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Detalhes do produto"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Preço do Fornecedor (R$) *</Text>
        <TextInput
          style={styles.input}
          value={supplierPrice}
          onChangeText={setSupplierPrice}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Estoque Virtual (Fornecedor)</Text>
        <TextInput
          style={styles.input}
          value={stockAvailable}
          onChangeText={setStockAvailable}
          placeholder="0"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Margem de Lucro (R$ Fixo)</Text>
        <TextInput
          style={styles.input}
          value={marginValue}
          onChangeText={setMarginValue}
          placeholder="0.00"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Fornecedor *</Text>
        <TouchableOpacity 
            style={styles.selector}
            onPress={() => setModalVisible(true)}
        >
            <Text style={selectedSupplier ? styles.selectorText : styles.placeholderText}>
                {selectedSupplier ? selectedSupplier.name : 'Selecione um fornecedor'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Produto</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Supplier Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecione o Fornecedor</Text>
                <TextInput
                    style={styles.modalSearch}
                    placeholder="Buscar fornecedor"
                    value={supplierQuery}
                    onChangeText={setSupplierQuery}
                />
                <FlatList
                    data={suppliers.filter(s => s.name.toLowerCase().includes(supplierQuery.toLowerCase()))}
                    keyExtractor={(item) => item.id}
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
                <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                >
                    <Text style={styles.closeButtonText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
        </View>
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selector: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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
    fontWeight: '600',
    color: '#222'
  },
  modalItemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  modalSearch: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  closeButton: {
    margin: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12
  },
  closeButtonText: {
    color: '#333',
    fontWeight: '600'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  }
});

export default ProductFormScreen;
