import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../ui/components/Header';
import { colors, shadow, radius, spacing } from '../../ui/theme';
import { useAuth } from '../../context/AuthContext';
import { isPermissionError } from '../../utils/authErrorUtils';

type SupplierParams = {
  supplier?: {
    id: string;
    name: string;
    integrationType: string;
    shippingDeadline: number;
    status: string;
  };
  onboardingMode?: boolean;
};

const SupplierFormScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { activeAccountId, refetchUser } = useAuth();
  const { supplier, onboardingMode } = (route.params as SupplierParams) || {};
  const isEditing = !!supplier;

  const [name, setName] = useState('');
  const [integrationType, setIntegrationType] = useState('MANUAL'); // MANUAL, API
  const [shippingDeadline, setShippingDeadline] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
      if (isEditing && supplier) {
          setName(supplier.name);
          setIntegrationType(supplier.integrationType);
          setShippingDeadline(supplier.shippingDeadline ? String(supplier.shippingDeadline) : '');
          setStatus(supplier.status);
          navigation.setOptions({ headerTitle: 'Editar Fornecedor' });
      }
  }, [isEditing, supplier, navigation]);

  const handleSave = async () => {
    if (!activeAccountId) {
        Alert.alert('Erro', 'Contexto de conta não encontrado.');
        return;
    }

    if (!name || !shippingDeadline) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        integrationType,
        shippingDeadline: parseInt(shippingDeadline, 10),
        status,
      };

      if (isEditing) {
        await api.put(`/suppliers/${supplier.id}`, payload);
        Alert.alert('Sucesso', 'Fornecedor atualizado com sucesso!');
        navigation.goBack();
      } else {
        const response = await api.post('/suppliers', payload);
        const { account } = response.data;
        
        // Update context to reflect new status
        await refetchUser();

        if (onboardingMode && account?.onboardingStatus === 'COMPLETO') {
          (navigation as any).reset({
            index: 0,
            routes: [{ name: 'AppTabs' }],
          });
        } else {
          Alert.alert('Sucesso', 'Fornecedor cadastrado com sucesso!');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao salvar fornecedor.');
    } finally {
      setLoading(false);
    }
  };

  const renderOption = (label: string, value: string, currentValue: string, onSelect: (val: string) => void) => {
      const isSelected = currentValue === value;
      return (
          <TouchableOpacity 
            style={[styles.optionButton, isSelected && styles.optionSelected]}
            onPress={() => onSelect(value)}
            activeOpacity={0.7}
          >
            {isSelected && <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{marginRight: 6}} />}
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{label}</Text>
          </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        title={isEditing ? "Editar Fornecedor" : "Novo Fornecedor"} 
        onBack={!onboardingMode ? () => navigation.goBack() : undefined} 
      />

      {onboardingMode && (
        <View style={{ padding: 20, backgroundColor: '#E3F2FD', marginBottom: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1565C0', marginBottom: 5 }}>Bem-vindo!</Text>
            <Text style={{ fontSize: 14, color: '#1565C0' }}>Para começar a vender, crie seu primeiro fornecedor.</Text>
        </View>
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dados Principais</Text>
                
                <Text style={styles.label}>Nome do Fornecedor *</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="business-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Ex: Fornecedor SP"
                        placeholderTextColor={colors.muted}
                    />
                </View>

                <Text style={styles.label}>Prazo de Envio (dias) *</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="time-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        value={shippingDeadline}
                        onChangeText={setShippingDeadline}
                        placeholder="Ex: 2"
                        placeholderTextColor={colors.muted}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Configurações</Text>
                
                <Text style={styles.label}>Tipo de Integração</Text>
                <View style={styles.row}>
                    {renderOption('Manual', 'MANUAL', integrationType, setIntegrationType)}
                    {renderOption('API', 'API', integrationType, setIntegrationType)}
                </View>

                <Text style={styles.label}>Status</Text>
                <View style={styles.row}>
                    {renderOption('Ativo', 'ACTIVE', status, setStatus)}
                    {renderOption('Pausado', 'PAUSED', status, setStatus)}
                </View>
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
                        <Text style={styles.saveButtonText}>Salvar Fornecedor</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: '#fff',
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 14,
  },
  optionTextSelected: {
    color: '#FFF',
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
});

export default SupplierFormScreen;
