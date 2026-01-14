import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAuthRole } from '../hooks/useAuthRole';
import { ENV } from '../config/env';

import Header from '../ui/components/Header';
import Input from '../ui/components/Input';
import Button from '../ui/components/Button';
import { colors, shadow, spacing, radius } from '../ui/theme';

const SettingsScreen = () => {
  const { signOut, user, refetchUser } = useAuth();
  const { isAccountAdmin, isSystemAdmin } = useAuthRole();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [mlConnected, setMlConnected] = useState(false);
  const [mlSellerId, setMlSellerId] = useState<string | null>(null);

  // Profile State
  const [name, setName] = useState(user?.name || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
      if (user?.name) setName(user.name);
  }, [user]);

  const handleUpdateProfile = async () => {
      if (!name.trim()) {
          Alert.alert('Erro', 'O nome não pode estar vazio.');
          return;
      }
      setUpdatingProfile(true);
      try {
          await api.put('/auth/profile', { name });
          await refetchUser();
          Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
      } catch (error) {
          Alert.alert('Erro', 'Falha ao atualizar perfil.');
          console.error(error);
      } finally {
          setUpdatingProfile(false);
      }
  };

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
          <Text style={styles.sectionTitle}>Perfil</Text>
          <View style={styles.card}>
            <Input 
                label="Nome"
                value={name}
                onChangeText={setName}
                placeholder="Seu nome completo"
            />
            <Input 
                label="Email"
                value={user?.email}
                editable={false}
                style={{ backgroundColor: '#f9f9f9', color: '#666' }}
            />
            <Button 
                title={updatingProfile ? "Salvando..." : "Salvar Alterações"}
                onPress={handleUpdateProfile}
                disabled={updatingProfile}
                style={{ marginTop: 8 }}
            />
          </View>
        </View>

        { (isAccountAdmin || isSystemAdmin) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administração</Text>
            <View style={styles.card}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => navigation.navigate('AdminIntegrations' as never)}
              >
                <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="git-network-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.menuText}>Integrações & Webhooks</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>
        )}

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

        <View style={{ alignItems: 'center', padding: 24, paddingBottom: 40 }}>
            <Text style={{ color: '#aaa', fontSize: 12 }}>
                Version: {Constants.expoConfig?.version} (Build {Constants.expoConfig?.android?.versionCode || '1'})
            </Text>
            <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                Env: {ENV.APP_ENV.toUpperCase()}
            </Text>
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
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default SettingsScreen;
