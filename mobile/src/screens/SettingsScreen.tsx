import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import Header from '../ui/components/Header';
import { colors, shadow } from '../ui/theme';

const SettingsScreen = () => {
  const { signOut, user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [mlConnected, setMlConnected] = useState(false);
  const [mlSellerId, setMlSellerId] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      const response = await api.get('/mercadolivre/status');
      setMlConnected(response.data.connected);
      if (response.data.connected) {
        setMlSellerId(response.data.sellerId);
      }
    } catch (error) {
      console.log('Error checking ML connection', error);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleConnectML = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mercadolivre/auth-url');
      const { url } = response.data;
      
      // Open the browser
      await WebBrowser.openBrowserAsync(url);
      
      // After browser closes (or user returns), check connection again
      // We might need a "Check Again" button if this returns immediately
      // But let's try checking after a small delay or just wait for user action
      setTimeout(checkConnection, 2000); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível iniciar a conexão com Mercado Livre.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await api.post('/mercadolivre/sync-products');
      Alert.alert('Sucesso', `Sincronização concluída. ${response.data.updated} produtos vinculados.`);
    } catch (error) {
        Alert.alert('Erro', 'Falha na sincronização.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Ajustes" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integrações</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                 <Ionicons name="pricetag" size={24} color="#ffe600" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Mercado Livre</Text>
                <Text style={styles.cardStatus}>
                  {mlConnected ? `Conectado (ID: ${mlSellerId})` : 'Não conectado'}
                </Text>
              </View>
              {mlConnected && (
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              )}
            </View>
            
            {!mlConnected ? (
              <TouchableOpacity 
                style={styles.connectButton} 
                onPress={handleConnectML}
                disabled={loading}
              >
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.connectButtonText}>Conectar</Text>
                )}
              </TouchableOpacity>
            ) : (
                <TouchableOpacity 
                    style={styles.syncButton}
                    onPress={handleSync}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.syncButtonText}>Sincronizar Dados</Text>
                    )}
                </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conta</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                <Ionicons name="log-out-outline" size={20} color="#dc3545" style={{marginRight: 8}} />
                <Text style={styles.logoutText}>Sair do App</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3CD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  syncButton: {
      backgroundColor: '#17a2b8',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
  },
  syncButtonText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 16,
  },
  logoutButton: {
      flexDirection: 'row',
      backgroundColor: '#FFF',
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.card,
  },
  logoutText: {
      color: '#dc3545',
      fontWeight: 'bold',
      fontSize: 16,
  }
});

export default SettingsScreen;
