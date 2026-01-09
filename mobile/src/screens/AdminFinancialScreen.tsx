import React, { useState, useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, ActivityIndicator, Dimensions, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../ui/theme';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

interface AdminDashboardStats {
  revenue: {
    commissions: number;
    subscriptions: number;
    total: number;
  };
  payouts: {
      totalPaid: number;
      pendingCount: number;
  };
  balance: {
      totalHeld: number;
  };
  charts: {
      revenue: {
          labels: string[];
          datasets: { data: number[] }[];
      }
  }
}

interface SupplierFinancial {
    id: string;
    name: string;
    financialStatus: string;
    walletBalance: number;
    pendingBalance: number;
    blockedBalance: number;
    totalCommission: number;
    plan: { name: string } | null;
    _count: { orders: number };
    totalBalance: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  requestedAt: string;
  pixKey: string;
  status: string;
  supplier: {
    name: string;
    billingDoc: string | null;
  };
}

interface AdminLog {
    id: string;
    adminName: string;
    action: string;
    details: string | null;
    createdAt: string;
}

interface FinancialSettings {
    defaultReleaseDays: number;
    defaultMinWithdrawal: number;
    defaultWithdrawalLimit: number;
}

const AdminFinancialScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SUPPLIERS' | 'WITHDRAWALS' | 'SETTINGS' | 'AUDIT'>('DASHBOARD');

  // Data
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierFinancial[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminLog[]>([]);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);

  // Settings Form
  const [editSettings, setEditSettings] = useState<FinancialSettings | null>(null);

  // Action States
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
        navigation.goBack();
    }
  }, [user, navigation]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load Dashboard & Withdrawals always (Summary)
      const [statsRes, withdrawalsRes] = await Promise.all([
        api.get('/financial/admin/dashboard'),
        api.get('/financial/admin/withdrawals?status=PENDING')
      ]);

      setStats(statsRes.data);
      setWithdrawals(withdrawalsRes.data);

      // Lazy load others based on tab? For simplicity load all or just essential.
      // Let's load others on tab change or if active.
      if (activeTab === 'SUPPLIERS') fetchSuppliers();
      if (activeTab === 'SETTINGS') fetchSettings();
      if (activeTab === 'AUDIT') fetchAudit();

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar os dados financeiros.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSuppliers = async () => {
      try {
          const res = await api.get('/financial/admin/suppliers');
          setSuppliers(res.data);
      } catch (e) { console.error(e); }
  };

  const fetchSettings = async () => {
      try {
          const res = await api.get('/financial/admin/settings');
          const data = res.data || {
              defaultReleaseDays: 14,
              defaultMinWithdrawal: 50,
              defaultWithdrawalLimit: 4
          };
          setSettings(data);
          setEditSettings(data);
      } catch (e) { console.error(e); }
  };

  const fetchAudit = async () => {
      try {
          const res = await api.get('/financial/admin/audit');
          setAuditLogs(res.data);
      } catch (e) { console.error(e); }
  };

  // Trigger fetch on tab change
  useEffect(() => {
      if (activeTab === 'SUPPLIERS') fetchSuppliers();
      if (activeTab === 'SETTINGS') fetchSettings();
      if (activeTab === 'AUDIT') fetchAudit();
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApproveWithdraw = (request: WithdrawalRequest) => {
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
              loadData(); 
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

  const handleRejectWithdraw = async () => {
      if (!selectedRequest || !rejectReason) return;
      try {
          setProcessingAction(true);
          await api.post(`/financial/admin/withdrawals/${selectedRequest.id}/reject`, { reason: rejectReason });
          setRejectModalVisible(false);
          setRejectReason('');
          setSelectedRequest(null);
          Alert.alert('Sucesso', 'Saque rejeitado.');
          loadData();
      } catch (error) {
          Alert.alert('Erro', 'Falha ao rejeitar saque.');
      } finally {
          setProcessingAction(false);
      }
  };

  const handleSaveSettings = async () => {
      if (!editSettings) return;
      try {
          setProcessingAction(true);
          await api.put('/financial/admin/settings', editSettings);
          Alert.alert('Sucesso', 'Configurações atualizadas.');
          fetchSettings(); // refresh
      } catch (error) {
          Alert.alert('Erro', 'Falha ao salvar configurações.');
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

  const renderDashboard = () => (
      <View style={styles.tabContent}>
          {stats && (
              <>
                  <View style={styles.kpiContainer}>
                      <View style={[styles.kpiCard, { backgroundColor: colors.primary }]}>
                          <Text style={styles.kpiLabelLight}>Receita Bruta</Text>
                          <Text style={styles.kpiValueLight}>{formatCurrency(stats.revenue.total)}</Text>
                          <Text style={styles.kpiSubLight}>Comissões: {formatCurrency(stats.revenue.commissions)}</Text>
                      </View>
                      <View style={[styles.kpiCard, { backgroundColor: '#fff' }]}>
                          <Text style={styles.kpiLabel}>MRR (Planos)</Text>
                          <Text style={styles.kpiValue}>{formatCurrency(stats.revenue.subscriptions)}</Text>
                      </View>
                  </View>

                  <View style={styles.kpiContainer}>
                      <View style={[styles.kpiCard, { backgroundColor: '#fff' }]}>
                          <Text style={styles.kpiLabel}>Total Pago</Text>
                          <Text style={[styles.kpiValue, { color: colors.success }]}>{formatCurrency(stats.payouts.totalPaid)}</Text>
                      </View>
                      <View style={[styles.kpiCard, { backgroundColor: '#fff' }]}>
                          <Text style={styles.kpiLabel}>Saldo Retido</Text>
                          <Text style={[styles.kpiValue, { color: colors.warning }]}>{formatCurrency(stats.balance.totalHeld)}</Text>
                      </View>
                  </View>

                  <View style={styles.chartContainer}>
                      <Text style={styles.sectionTitle}>Evolução da Receita (6 Meses)</Text>
                      {stats.charts?.revenue && stats.charts.revenue.labels.length > 0 ? (
                          <LineChart
                              data={stats.charts.revenue}
                              width={width - 40}
                              height={220}
                              chartConfig={{
                                  backgroundColor: "#ffffff",
                                  backgroundGradientFrom: "#ffffff",
                                  backgroundGradientTo: "#ffffff",
                                  decimalPlaces: 0,
                                  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                  style: { borderRadius: 16 },
                                  propsForDots: { r: "6", strokeWidth: "2", stroke: colors.primary }
                              }}
                              bezier
                              style={{ marginVertical: 8, borderRadius: 16 }}
                          />
                      ) : (
                          <Text style={styles.emptyText}>Sem dados suficientes para o gráfico.</Text>
                      )}
                  </View>
              </>
          )}
      </View>
  );

  const renderWithdrawals = () => (
      <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Solicitações Pendentes ({withdrawals.length})</Text>
          {withdrawals.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma solicitação pendente.</Text>
          ) : (
              withdrawals.map(req => (
                  <View key={req.id} style={styles.withdrawalCard}>
                      <View style={styles.withdrawalHeader}>
                          <Text style={styles.supplierName}>{req.supplier.name}</Text>
                          <Text style={styles.withdrawalAmount}>{formatCurrency(req.amount)}</Text>
                      </View>
                      <Text style={styles.withdrawalInfo}>Chave PIX: {req.pixKey}</Text>
                      <Text style={styles.withdrawalDate}>Solicitado em: {new Date(req.requestedAt).toLocaleDateString()}</Text>
                      
                      <View style={styles.withdrawalActions}>
                          <TouchableOpacity 
                              style={[styles.actionButton, styles.rejectButton]}
                              onPress={() => {
                                  setSelectedRequest(req);
                                  setRejectModalVisible(true);
                              }}
                          >
                              <Text style={styles.actionButtonText}>Rejeitar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                              style={[styles.actionButton, styles.approveButton]}
                              onPress={() => handleApproveWithdraw(req)}
                          >
                              <Text style={styles.actionButtonText}>Aprovar</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              ))
          )}
      </View>
  );

  const renderSuppliers = () => (
      <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Visão por Fornecedor</Text>
          {suppliers.map(sup => (
              <View key={sup.id} style={styles.supplierCard}>
                  <View style={styles.rowBetween}>
                      <Text style={styles.supplierName}>{sup.name}</Text>
                      <View style={[styles.statusBadge, sup.financialStatus === 'OVERDUE' ? { backgroundColor: colors.error } : { backgroundColor: colors.success }]}>
                          <Text style={styles.statusText}>{sup.financialStatus}</Text>
                      </View>
                  </View>
                  <Text style={styles.supplierPlan}>Plano: {sup.plan?.name || 'Sem plano'}</Text>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.rowBetween}>
                      <View>
                          <Text style={styles.label}>Saldo Total</Text>
                          <Text style={styles.value}>{formatCurrency(sup.totalBalance)}</Text>
                      </View>
                      <View>
                          <Text style={styles.label}>Comissões Geradas</Text>
                          <Text style={styles.value}>{formatCurrency(sup.totalCommission)}</Text>
                      </View>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>Pedidos: {sup._count.orders}</Text>
                  </View>
              </View>
          ))}
      </View>
  );

  const renderSettings = () => (
      <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Configurações Financeiras Globais</Text>
          {editSettings && (
              <View style={styles.formCard}>
                  <Text style={styles.inputLabel}>Dias para Liberação (D+N)</Text>
                  <TextInput 
                      style={styles.input}
                      keyboardType="numeric"
                      value={String(editSettings.defaultReleaseDays)}
                      onChangeText={t => setEditSettings({...editSettings, defaultReleaseDays: parseInt(t) || 0})}
                  />

                  <Text style={styles.inputLabel}>Saque Mínimo (R$)</Text>
                  <TextInput 
                      style={styles.input}
                      keyboardType="numeric"
                      value={String(editSettings.defaultMinWithdrawal)}
                      onChangeText={t => setEditSettings({...editSettings, defaultMinWithdrawal: parseFloat(t) || 0})}
                  />

                  <Text style={styles.inputLabel}>Limite de Saques Mensais</Text>
                  <TextInput 
                      style={styles.input}
                      keyboardType="numeric"
                      value={String(editSettings.defaultWithdrawalLimit)}
                      onChangeText={t => setEditSettings({...editSettings, defaultWithdrawalLimit: parseInt(t) || 0})}
                  />

                  <TouchableOpacity 
                      style={styles.saveSettingsButton}
                      onPress={handleSaveSettings}
                      disabled={processingAction}
                  >
                      {processingAction ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Salvar Configurações</Text>}
                  </TouchableOpacity>
              </View>
          )}
      </View>
  );

  const renderAudit = () => (
      <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Auditoria & Logs</Text>
          {auditLogs.map(log => (
              <View key={log.id} style={styles.logCard}>
                  <Text style={styles.logAction}>{log.action}</Text>
                  <Text style={styles.logDetails}>{log.details}</Text>
                  <View style={styles.rowBetween}>
                      <Text style={styles.logUser}>{log.adminName}</Text>
                      <Text style={styles.logDate}>{new Date(log.createdAt).toLocaleString()}</Text>
                  </View>
              </View>
          ))}
      </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Gestão Financeira</Text>
      </View>

      <View style={styles.tabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['DASHBOARD', 'WITHDRAWALS', 'SUPPLIERS', 'SETTINGS', 'AUDIT'].map((tab) => (
                  <TouchableOpacity 
                      key={tab} 
                      style={[styles.tab, activeTab === tab && styles.activeTab]}
                      onPress={() => setActiveTab(tab as any)}
                  >
                      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                          {tab === 'WITHDRAWALS' ? 'SAQUES' : 
                           tab === 'SUPPLIERS' ? 'FORNECEDORES' : 
                           tab === 'SETTINGS' ? 'CONFIG' : 
                           tab === 'AUDIT' ? 'AUDITORIA' : 'DASHBOARD'}
                      </Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
          {loading && !refreshing ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
              <>
                  {activeTab === 'DASHBOARD' && renderDashboard()}
                  {activeTab === 'WITHDRAWALS' && renderWithdrawals()}
                  {activeTab === 'SUPPLIERS' && renderSuppliers()}
                  {activeTab === 'SETTINGS' && renderSettings()}
                  {activeTab === 'AUDIT' && renderAudit()}
              </>
          )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Motivo da Rejeição</Text>
                  <TextInput
                      style={styles.modalInput}
                      placeholder="Digite o motivo..."
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      multiline
                  />
                  <View style={styles.modalActions}>
                      <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={styles.modalCancel}>
                          <Text style={styles.modalCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleRejectWithdraw} style={styles.modalConfirm}>
                          <Text style={styles.modalConfirmText}>Confirmar Rejeição</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: spacing.medium,
    paddingBottom: spacing.medium,
    backgroundColor: '#fff',
    ...shadow.small,
  },
  backButton: {
    marginRight: spacing.medium,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  tabs: {
      flexDirection: 'row',
      backgroundColor: '#fff',
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.small,
  },
  tab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 8,
      borderRadius: 20,
      backgroundColor: colors.lightGray,
  },
  activeTab: {
      backgroundColor: colors.primary,
  },
  tabText: {
      fontWeight: '600',
      color: colors.textDim,
      fontSize: 12,
  },
  activeTabText: {
      color: '#fff',
  },
  scrollContent: {
    padding: spacing.medium,
  },
  tabContent: {
      gap: spacing.medium,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.small,
  },
  kpiContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.small,
  },
  kpiCard: {
      flex: 1,
      padding: spacing.medium,
      borderRadius: radius.medium,
      ...shadow.small,
  },
  kpiLabel: {
      fontSize: 12,
      color: colors.textDim,
      marginBottom: 4,
  },
  kpiValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
  },
  kpiLabelLight: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: 4,
  },
  kpiValueLight: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
  },
  kpiSubLight: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
  },
  chartContainer: {
      backgroundColor: '#fff',
      padding: spacing.medium,
      borderRadius: radius.medium,
      ...shadow.small,
      alignItems: 'center',
  },
  emptyText: {
      textAlign: 'center',
      color: colors.textDim,
      marginVertical: 20,
  },
  // Withdrawals
  withdrawalCard: {
      backgroundColor: '#fff',
      padding: spacing.medium,
      borderRadius: radius.medium,
      marginBottom: spacing.small,
      ...shadow.small,
  },
  withdrawalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  supplierName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
  },
  withdrawalAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
  },
  withdrawalInfo: {
      color: colors.textDim,
      fontSize: 14,
  },
  withdrawalDate: {
      color: colors.textDim,
      fontSize: 12,
      marginTop: 4,
  },
  withdrawalActions: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 10,
  },
  actionButton: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
  },
  rejectButton: {
      backgroundColor: '#ffebee',
  },
  approveButton: {
      backgroundColor: '#e8f5e9',
  },
  actionButtonText: {
      fontWeight: '600',
      fontSize: 14,
  },
  // Suppliers
  supplierCard: {
      backgroundColor: '#fff',
      padding: spacing.medium,
      borderRadius: radius.medium,
      marginBottom: spacing.small,
      ...shadow.small,
  },
  supplierPlan: {
      color: colors.textDim,
      fontSize: 14,
  },
  rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  divider: {
      height: 1,
      backgroundColor: colors.lightGray,
      marginVertical: 10,
  },
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
  },
  statusText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
  },
  label: {
      fontSize: 12,
      color: colors.textDim,
  },
  value: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
  },
  // Settings
  formCard: {
      backgroundColor: '#fff',
      padding: spacing.medium,
      borderRadius: radius.medium,
      ...shadow.small,
  },
  inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: 10,
  },
  input: {
      borderWidth: 1,
      borderColor: colors.lightGray,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
  },
  saveSettingsButton: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
  },
  saveButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },
  // Audit
  logCard: {
      backgroundColor: '#fff',
      padding: spacing.medium,
      borderRadius: radius.medium,
      marginBottom: spacing.small,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      ...shadow.small,
  },
  logAction: {
      fontWeight: 'bold',
      color: colors.text,
  },
  logDetails: {
      color: colors.textDim,
      fontSize: 12,
      marginVertical: 4,
  },
  logUser: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
  },
  logDate: {
      fontSize: 10,
      color: colors.textDim,
  },
  // Modal
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
  },
  modalContent: {
      backgroundColor: '#fff',
      borderRadius: radius.medium,
      padding: spacing.medium,
  },
  modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
  },
  modalInput: {
      borderWidth: 1,
      borderColor: colors.lightGray,
      borderRadius: 8,
      padding: 10,
      height: 100,
      textAlignVertical: 'top',
      marginBottom: 20,
  },
  modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
  },
  modalCancel: {
      padding: 10,
  },
  modalCancelText: {
      color: colors.textDim,
  },
  modalConfirm: {
      backgroundColor: colors.error,
      padding: 10,
      borderRadius: 8,
  },
  modalConfirmText: {
      color: '#fff',
      fontWeight: 'bold',
  },
});

export default AdminFinancialScreen;