import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Fornecedor</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Nome do Fornecedor *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Fornecedor SP"
        />

        <Text style={styles.label}>Tipo de Integração</Text>
        <View style={styles.row}>
          <TouchableOpacity 
            style={[styles.optionButton, integrationType === 'MANUAL' && styles.optionSelected]}
            onPress={() => setIntegrationType('MANUAL')}
          >
            <Text style={[styles.optionText, integrationType === 'MANUAL' && styles.optionTextSelected]}>Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.optionButton, integrationType === 'API' && styles.optionSelected]}
            onPress={() => setIntegrationType('API')}
          >
            <Text style={[styles.optionText, integrationType === 'API' && styles.optionTextSelected]}>API</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Prazo de Envio (dias) *</Text>
        <TextInput
          style={styles.input}
          value={shippingDeadline}
          onChangeText={setShippingDeadline}
          placeholder="Ex: 2"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Status</Text>
        <View style={styles.row}>
          <TouchableOpacity 
            style={[styles.optionButton, status === 'ACTIVE' && styles.optionSelected]}
            onPress={() => setStatus('ACTIVE')}
          >
            <Text style={[styles.optionText, status === 'ACTIVE' && styles.optionTextSelected]}>Ativo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.optionButton, status === 'PAUSED' && styles.optionSelected]}
            onPress={() => setStatus('PAUSED')}
          >
            <Text style={[styles.optionText, status === 'PAUSED' && styles.optionTextSelected]}>Pausado</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
            {loading ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <Text style={styles.saveButtonText}>Salvar Fornecedor</Text>
            )}
        </TouchableOpacity>
      </ScrollView>
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
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  optionSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  optionText: {
    color: '#333',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: '#28a745',
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
});

export default SupplierFormScreen;
