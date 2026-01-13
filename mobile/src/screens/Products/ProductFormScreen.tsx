import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../ui/components/Header';
import { colors, radius, shadow, spacing } from '../../ui/theme';

type Supplier = {
    id: string;
    name: string;
    integrationType?: string;
    status?: string;
};

import { useAuth } from '../../context/AuthContext';
import { useAuthRole } from '../../hooks/useAuthRole';
import { isPermissionError } from '../../utils/authErrorUtils';

const ProductFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { activeAccountId, activeSupplierId } = useAuth();
  const { isSystemAdmin, isAccountAdmin } = useAuthRole();

  // @ts-ignore
  const { productId } = route.params || {};
  const isEditing = !!productId;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [supplierPrice, setSupplierPrice] = useState('');
  const [stockAvailable, setStockAvailable] = useState('');
  const [safetyStock, setSafetyStock] = useState('0');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [marginValue, setMarginValue] = useState('');
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState('');

  useEffect(() => {
    fetchSuppliers();
    if (productId) {
        loadProductData();
        navigation.setOptions({ headerTitle: 'Editar Produto' });
    }
  }, [productId, navigation]);

  const loadProductData = async () => {
    if (!activeAccountId) return;
    try {
        setLoading(true);
        const response = await api.get(`/products/${productId}`);
        const p = response.data;
        setName(p.name);
        setSku(p.sku);
        setDescription(p.description || '');
        setMarginValue(String(p.marginValue || '0'));
        
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
    if (!activeAccountId) return;
    try {
        const response = await api.get('/suppliers');
        setSuppliers(response.data);
    } catch (error) {
        if (isPermissionError(error)) return;
        console.log('Error fetching suppliers', error);
    }
  };

  const handleSave = async () => {
    if (!activeAccountId) {
        Alert.alert('Erro', 'Contexto de conta não encontrado.');
        return;
    }

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
        virtualStock: parseInt(stockAvailable || '0', 10),
        safetyStock: parseInt(safetyStock || '0', 10),
        supplierId: selectedSupplier.id,
        marginType: 'FIXED', 
        marginValue: parseFloat(marginValue || '0'),
      };

      if (isEditing) {
          await api.put(`/products/${productId}`, payload);
          Alert.alert('Sucesso', 'Produto atualizado com sucesso!');
      } else {
          await api.post('/products', payload);
          Alert.alert('Sucesso', 'Produto criado com sucesso!');
      }
      
      navigation.goBack();
    } catch (error) {
      if (isPermissionError(error)) return;
      console.log('Error saving product', error);
      Alert.alert('Erro', 'Falha ao salvar o produto.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
      s.name.toLowerCase().includes(supplierQuery.toLowerCase())
  );

  const renderSupplierItem = ({ item }: { item: Supplier }) => (
    <TouchableOpacity 
        style={styles.supplierItem} 
        onPress={() => {
            setSelectedSupplier(item);
            setModalVisible(false);
        }}
    >
        <View style={styles.supplierAvatar}>
            <Text style={styles.supplierInitials}>{item.name.substring(0,2).toUpperCase()}</Text>
        </View>
        <Text style={styles.supplierName}>{item.name}</Text>
        {selectedSupplier?.id === item.id && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={isEditing ? "Editar Produto" : "Novo Produto"} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            {/* Basic Info Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Informações Básicas</Text>
                
                <Text style={styles.label}>Nome do Produto *</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="pricetag-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Ex: Camiseta Básica"
                        placeholderTextColor={colors.muted}
                    />
                </View>

                <View style={styles.row}>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>SKU *</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="barcode-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={sku}
                                onChangeText={setSku}
                                placeholder="Ex: CAM-001"
                                placeholderTextColor={colors.muted}
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>
                </View>

                <Text style={styles.label}>Descrição</Text>
                <View style={[styles.inputContainer, { alignItems: 'flex-start', paddingVertical: 12 }]}>
                    <Ionicons name="document-text-outline" size={20} color={colors.muted} style={[styles.inputIcon, { marginTop: 2 }]} />
                    <TextInput
                        style={[styles.input, { height: 80, paddingVertical: 0 }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Detalhes do produto..."
                        placeholderTextColor={colors.muted}
                        multiline
                        textAlignVertical="top"
                    />
                </View>
            </View>

            {/* Pricing & Stock Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preço e Estoque</Text>
                
                <View style={styles.row}>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Preço Custo (R$) *</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.currencyPrefix}>R$</Text>
                            <TextInput
                                style={styles.input}
                                value={supplierPrice}
                                onChangeText={setSupplierPrice}
                                placeholder="0.00"
                                placeholderTextColor={colors.muted}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Margem Fixa (R$)</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.currencyPrefix}>R$</Text>
                            <TextInput
                                style={styles.input}
                                value={marginValue}
                                onChangeText={setMarginValue}
                                placeholder="0.00"
                                placeholderTextColor={colors.muted}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Estoque Virtual</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="cube-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={stockAvailable}
                                onChangeText={setStockAvailable}
                                placeholder="0"
                                placeholderTextColor={colors.muted}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Estoque Mínimo</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="alert-circle-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={safetyStock}
                                onChangeText={setSafetyStock}
                                placeholder="0"
                                placeholderTextColor={colors.muted}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* Supplier Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fornecedor</Text>
                <Text style={styles.label}>Fornecedor Responsável *</Text>
                <TouchableOpacity 
                    style={styles.supplierSelectButton}
                    onPress={() => setModalVisible(true)}
                >
                    {selectedSupplier ? (
                        <View style={styles.selectedSupplierInfo}>
                            <View style={styles.supplierAvatarSmall}>
                                <Text style={styles.supplierInitialsSmall}>{selectedSupplier.name.substring(0,2).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.selectedSupplierName}>{selectedSupplier.name}</Text>
                        </View>
                    ) : (
                        <Text style={styles.placeholderText}>Selecione um fornecedor</Text>
                    )}
                    <Ionicons name="chevron-down" size={20} color={colors.muted} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                onPress={handleSave} 
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <>
                        <Ionicons name="save-outline" size={20} color="#FFF" style={{marginRight: 8}} />
                        <Text style={styles.saveButtonText}>Salvar Produto</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Supplier Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Selecionar Fornecedor</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={colors.muted} style={{marginRight: 8}} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Buscar fornecedor..."
                        value={supplierQuery}
                        onChangeText={setSupplierQuery}
                    />
                </View>

                <FlatList
                    data={filteredSuppliers}
                    keyExtractor={item => item.id}
                    renderItem={renderSupplierItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Nenhum fornecedor encontrado</Text>
                        </View>
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
  form: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
      backgroundColor: '#fff',
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 16,
      ...shadow.card,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f9f9f9',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      paddingHorizontal: 12,
  },
  inputIcon: {
      marginRight: 10,
  },
  currencyPrefix: {
      fontSize: 15,
      color: colors.muted,
      marginRight: 8,
      fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
    gap: 12,
  },
  supplierSelectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f9f9f9',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
  },
  selectedSupplierInfo: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  supplierAvatarSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
  },
  supplierInitialsSmall: {
      color: colors.primary,
      fontWeight: 'bold',
      fontSize: 10,
  },
  selectedSupplierName: {
      color: colors.text,
      fontWeight: '500',
      fontSize: 15,
  },
  placeholderText: {
      color: colors.muted,
      fontSize: 15,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
    ...shadow.lg,
  },
  saveButtonDisabled: {
      opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal Styles
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
  },
  modalContent: {
      backgroundColor: '#FFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: '70%',
      padding: 16,
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
  searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
  },
  searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
  },
  supplierItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
  },
  supplierAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
  },
  supplierInitials: {
      color: colors.primary,
      fontWeight: 'bold',
      fontSize: 16,
  },
  supplierName: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
  },
  emptyState: {
      alignItems: 'center',
      padding: 20,
  },
  emptyText: {
      color: colors.muted,
      fontSize: 14,
  },
});

export default ProductFormScreen;