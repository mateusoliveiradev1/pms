import React, { useState, useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../ui/theme';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

interface AdminDashboardStats {
  revenue: {
    commissions: number;
    subscriptions: number;
    total: number;
  };
  pendingWithdrawals: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  requestedAt: string;
  pixKey: string;
  supplier: {
    name: string;
    billingDoc: string | null;
  };
}

const AdminFinancialScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
        navigation.goBack();
    }
  }, [user, navigation]);

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  
  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, withdrawalsRes] = await Promise.all([
        api.get('/financial/admin/dashboard'),
        api.get('/financial/admin/withdrawals?status=PENDING')
      ]);

      setStats(statsRes.data);
      setWithdrawals(withdrawalsRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar os dados financeiros.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = (request: WithdrawalRequest) => {
    Alert.alert(
      'Confirmar Aprovação',
      `Deseja aprovar o saque de R$ ${request.amount.toFixed(2)} para ${request.supplier.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: async () => {
            try {
              setProcessingAction(true);
              await api.post(`/financial/admin/withdrawals/${request.id}/approve`);
              Alert.alert('Sucesso', 'Saque aprovado e processado.');
              loadData(); // Refresh list
            } catch (error) {
              Alert.alert('Erro', 'Falha ao aprovar saque.');
            } finally {
              setProcessingAction(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectPress = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Atenção', 'Informe o motivo da rejeição.');
      return;
    }

    try {
      setProcessingAction(true);
      await api.post(`/financial/admin/withdrawals/${selectedRequest?.id}/reject`, {
        reason: rejectReason
      });
      setRejectModalVisible(false);
      Alert.alert('Sucesso', 'Saque rejeitado.');
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao rejeitar saque.');
    } finally {
      setProcessingAction(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financeiro da Plataforma</Text>
        <Text style={styles.headerSubtitle}>Gestão Administrativa</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Dashboard Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <View style={styles.statHeader}>
              <Ionicons name="wallet-outline" size={24} color="#FFF" />
              <Text style={styles.statLabel}>Receita Total</Text>
            </View>
            <Text style={styles.statValue}>
              {stats ? formatCurrency(stats.revenue.total) : 'R$ 0,00'}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.statCardSmall, { backgroundColor: colors.success }]}>
               <Text style={styles.statLabelSmall}>Comissões</Text>
               <Text style={styles.statValueSmall}>
                 {stats ? formatCurrency(stats.revenue.commissions) : 'R$ 0,00'}
               </Text>
            </View>
            <View style={[styles.statCardSmall, { backgroundColor: colors.info }]}>
               <Text style={styles.statLabelSmall}>Mensalidades</Text>
               <Text style={styles.statValueSmall}>
                 {stats ? formatCurrency(stats.revenue.subscriptions) : 'R$ 0,00'}
               </Text>
            </View>
          </View>
        </View>

        {/* Pending Withdrawals */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Solicitações de Saque</Text>
          {stats?.pendingWithdrawals ? (
             <View style={styles.badge}>
               <Text style={styles.badgeText}>{stats.pendingWithdrawals}</Text>
             </View>
          ) : null}
        </View>

        {withdrawals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>Nenhuma solicitação pendente.</Text>
          </View>
        ) : (
          withdrawals.map((req) => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View>
                  <Text style={styles.supplierName}>{req.supplier.name}</Text>
                  <Text style={styles.requestDate}>{formatDate(req.requestedAt)}</Text>
                </View>
                <Text style={styles.requestAmount}>{formatCurrency(req.amount)}</Text>
              </View>

              <View style={styles.pixContainer}>
                <Text style={styles.pixLabel}>Chave PIX:</Text>
                <Text style={styles.pixValue}>{req.pixKey || 'Não informada'}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRejectPress(req)}
                  disabled={processingAction}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.actionText}>Rejeitar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprove(req)}
                  disabled={processingAction}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.actionText}>Aprovar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejeitar Saque</Text>
            <Text style={styles.modalSubtitle}>
              Informe o motivo da rejeição para o fornecedor:
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Ex: Dados bancários incorretos"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmReject}
                disabled={processingAction}
              >
                {processingAction ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirmar Rejeição</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  statsContainer: {
    marginBottom: spacing.xl,
  },
  statCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadow.medium,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginLeft: spacing.sm,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCardSmall: {
    flex: 0.48,
    padding: spacing.md,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  statLabelSmall: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginBottom: 4,
  },
  statValueSmall: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: spacing.sm,
  },
  badge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 16,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  requestDate: {
    fontSize: 12,
    color: colors.muted,
  },
  requestAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  pixContainer: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  pixLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 2,
  },
  pixValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.danger,
  },
  actionText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.danger,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default AdminFinancialScreen;
