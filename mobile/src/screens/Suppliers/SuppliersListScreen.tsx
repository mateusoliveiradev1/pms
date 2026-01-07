import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Header from '../../ui/components/Header';
import { colors, shadow, spacing } from '../../ui/theme';

type Supplier = {
  id: string;
  name: string;
  integrationType: string;
  status: string;
};

const SuppliersListScreen = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'ADMIN';

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Não foi possível carregar os fornecedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchSuppliers();
    }
  }, [isFocused]);

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este fornecedor?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/suppliers/${id}`);
              await fetchSuppliers();
            } catch (error: any) {
              if (error?.response?.status === 403) {
                Alert.alert('Permissão negada', 'Apenas usuários ADMIN podem excluir fornecedores.');
              } else {
                Alert.alert('Erro', 'Falha ao excluir fornecedor.');
              }
            }
          } 
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Supplier }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: item.status === 'ACTIVE' ? '#e8f5e9' : '#ffebee' }]}>
                <Ionicons name="business-outline" size={20} color={item.status === 'ACTIVE' ? colors.success : colors.danger} />
            </View>
            <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>Integração: {item.integrationType}</Text>
            </View>
        </View>
        
        {isAdmin && (
            <TouchableOpacity onPress={() => handleDelete(item.id)} accessibilityLabel="Excluir fornecedor" style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.cardFooter}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: item.status === 'ACTIVE' ? '#e8f5e9' : '#ffebee' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'ACTIVE' ? colors.success : colors.danger }
            ]}>
              {item.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
            </Text>
          </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        title="Fornecedores" 
        onBack={() => navigation.goBack()}
        rightIcon="refresh"
        onRightPress={fetchSuppliers}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Nenhum fornecedor cadastrado.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('SupplierForm' as never)}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
  },
  iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
      padding: 8,
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    marginTop: 16,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default SuppliersListScreen;
