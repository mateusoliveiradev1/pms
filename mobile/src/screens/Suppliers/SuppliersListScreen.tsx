import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole } from '../../hooks/useAuthRole';
import Header from '../../ui/components/Header';
import { colors, shadow, spacing, radius } from '../../ui/theme';

type Supplier = {
  id: string;
  name: string;
  integrationType: string;
  status: string;
};

const SuppliersListScreen = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { isAccountAdmin, isSystemAdmin, isSupplierUser, isSupplierAdmin } = useAuthRole();

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

  const visibleSuppliers = useMemo(() => {
      if (!searchQuery) return suppliers;
      const lower = searchQuery.toLowerCase();
      return suppliers.filter(s => s.name.toLowerCase().includes(lower));
  }, [suppliers, searchQuery]);

  const renderItem = ({ item }: { item: Supplier }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: item.status === 'ACTIVE' ? colors.success + '20' : colors.danger + '20' }]}>
                <Ionicons 
                    name="business" 
                    size={20} 
                    color={item.status === 'ACTIVE' ? colors.success : colors.danger} 
                />
            </View>
            <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.badgeContainer}>
                    <View style={styles.miniBadge}>
                        <Ionicons name="code-working-outline" size={12} color={colors.muted} style={{marginRight: 4}} />
                        <Text style={styles.cardSubtitle}>{item.integrationType}</Text>
                    </View>
                </View>
            </View>
        </View>
        
        {(isAccountAdmin || isSystemAdmin) && (
            <TouchableOpacity 
                onPress={() => handleDelete(item.id)} 
                style={styles.deleteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.muted} />
            </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.divider} />

      <View style={styles.cardFooter}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: item.status === 'ACTIVE' ? colors.success + '15' : colors.danger + '15' }
          ]}>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'ACTIVE' ? colors.success : colors.danger }]} />
            <Text style={[
              styles.statusText,
              { color: item.status === 'ACTIVE' ? colors.success : colors.danger }
            ]}>
              {item.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.editButton} onPress={() => (navigation as any).navigate('SupplierForm', { supplier: item })}>
              <Text style={styles.editButtonText}>Editar</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
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

      <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color={colors.muted} style={{marginRight: 8}} />
              <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar fornecedor..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={colors.muted}
              />
              {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </TouchableOpacity>
              )}
          </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleSuppliers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                  <Ionicons name="business-outline" size={64} color={colors.border} />
              </View>
              <Text style={styles.emptyTitle}>Nenhum fornecedor</Text>
              <Text style={styles.emptyText}>
                  {searchQuery ? 'Nenhum resultado para sua busca.' : 'Para começar a vender, crie seu primeiro fornecedor.'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => (navigation as any).navigate('SupplierForm')}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      backgroundColor: '#fff',
      zIndex: 1,
  },
  searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: radius.md,
      paddingHorizontal: 12,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
  },
  searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    ...shadow.card,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  badgeContainer: {
      flexDirection: 'row',
  },
  miniBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  deleteButton: {
      padding: 4,
  },
  divider: {
      height: 1,
      backgroundColor: '#f0f0f0',
      marginBottom: 12,
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
  },
  statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 6,
  },
  statusText: {
      fontSize: 12,
      fontWeight: 'bold',
  },
  editButton: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  editButtonText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
      marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
  },
  emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
  },
  emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.lg,
    zIndex: 10,
  },
});

export default SuppliersListScreen;