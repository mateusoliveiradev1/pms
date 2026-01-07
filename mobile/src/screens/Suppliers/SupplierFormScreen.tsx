import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../ui/components/Header';
import { colors, shadow } from '../../ui/theme';

const SupplierFormScreen = () => {
  const [name, setName] = useState('');
  const [integrationType, setIntegrationType] = useState('MANUAL'); // MANUAL, API
  const [shippingDeadline, setShippingDeadline] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);
  
  const navigation = useNavigation();

  const handleSave = async () => {
    if (!name || !shippingDeadline) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/suppliers', {
        name,
        integrationType,
        shippingDeadline: parseInt(shippingDeadline, 10),
        status,
      });
      Alert.alert('Sucesso', 'Fornecedor cadastrado com sucesso!');
      navigation.goBack();
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
          >
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{label}</Text>
          </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Novo Fornecedor" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form}>
            <View style={styles.section}>
                <Text style={styles.label}>Nome do Fornecedor *</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="business-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Fornecedor SP"
                    placeholderTextColor="#999"
                    />
                </View>

                <Text style={styles.label}>Prazo de Envio (dias) *</Text>
                <View style={styles.inputContainer}>
                    <Ionicons name="time-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                    style={styles.input}
                    value={shippingDeadline}
                    onChangeText={setShippingDeadline}
                    placeholder="Ex: 2"
                    placeholderTextColor="#999"
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

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.saveButtonText}>Salvar Fornecedor</Text>
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
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
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
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f9f9f9',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#eee',
      marginBottom: 20,
      paddingHorizontal: 12,
  },
  inputIcon: {
      marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: '#666',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    ...shadow.card,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SupplierFormScreen;
