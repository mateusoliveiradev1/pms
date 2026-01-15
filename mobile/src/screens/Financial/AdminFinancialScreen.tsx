import React, { useState, useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Modal, TextInput, Text, TouchableOpacity, Share, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadow } from '../../ui/theme';
import { useAuth } from '../../context/AuthContext';
import { useAuthRole } from '../../hooks/useAuthRole';
import { useFocusEffect } from '@react-navigation/native';
import Skeleton from '../../ui/components/Skeleton';

import { useAdminDashboard } from './hooks/useAdminDashboard';
import { WithdrawalRequest } from './types';

import AdminStatsCards from './components/AdminStatsCards';
import RevenueCharts from './components/RevenueCharts';
import WithdrawalsList from './components/WithdrawalsList';
import SuppliersTable from './components/SuppliersTable';
import AuditLogsList from './components/AuditLogsList';
import ReconciliationList from './components/ReconciliationList';
import OperationalAlerts from './components/OperationalAlerts';

const AdminFinancialScreen = () => {
  const { activeAccountId } = useAuth();
  const { isAccountAdmin, isSystemAdmin } = useAuthRole();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SUPPLIERS' | 'WITHDRAWALS' | 'SETTINGS' | 'AUDIT' | 'RECONCILIATION'>('DASHBOARD');
  const isAuthorized = isAccountAdmin || isSystemAdmin;
  
  // Enforce Context Guard for ALL roles
  const missingContext = !activeAccountId && !isSystemAdmin;

  // Supplier Selection for System Admin
  const [selectedSupplier, setSelectedSupplier] = useState<{id: string, name: string} | null>(null);
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  
  // Filters
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [withdrawalFilter, setWithdrawalFilter] = useState('PENDING');
  const [withdrawalStartDate, setWithdrawalStartDate] = useState('');
  const [withdrawalEndDate, setWithdrawalEndDate] = useState('');
  const [withdrawalSupplierId, setWithdrawalSupplierId] = useState('');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  
  // Custom Date Filter
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Reconciliation Filters
  const [recStartDate, setRecStartDate] = useState('');
  const [recEndDate, setRecEndDate] = useState('');
  const [recSupplierId, setRecSupplierId] = useState('');

  // Audit Filters
  const [auditAction, setAuditAction] = useState('ALL');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');

  const {
      stats, suppliers, withdrawals, auditLogs, settings,
      reconciliation, alerts,
      loading, refreshing, setRefreshing, setLoading,
      fetchDashboard, fetchWithdrawals, fetchSuppliers, fetchSettings, fetchAudit, fetchReconciliation,
      approveWithdrawal, rejectWithdrawal, updateSettings
  } = useAdminDashboard();

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Settings Local State
  const [localSettings, setLocalSettings] = useState<any>(null);

  useEffect(() => {
    // Gate apenas via UI; sem redirecionamento
  }, [isAccountAdmin, isSystemAdmin, navigation]);

  useEffect(() => {
      if (settings) setLocalSettings(settings);
  }, [settings]);

  const loadData = useCallback(async (silent = false) => {
    if (!isAuthorized) return;
    if (missingContext) return;

    if (activeTab === 'DASHBOARD') {
        let start = new Date();
        let end = new Date();
        
        if (period === 'custom' && customStart && customEnd) {
             start = new Date(customStart);
             end = new Date(customEnd);
        } else {
            if (period === '7d') start.setDate(end.getDate() - 7);
            if (period === '30d') start.setDate(end.getDate() - 30);
            if (period === '90d') start.setDate(end.getDate() - 90);
        }
        fetchDashboard(start, end, selectedSupplier?.id, silent);
    }
    if (activeTab === 'WITHDRAWALS') {
        fetchWithdrawals(withdrawalFilter, {
            startDate: withdrawalStartDate ? new Date(withdrawalStartDate) : undefined,
            endDate: withdrawalEndDate ? new Date(withdrawalEndDate) : undefined,
            supplierId: withdrawalSupplierId || selectedSupplier?.id || undefined
        }, silent);
    }
    if (activeTab === 'SUPPLIERS') fetchSuppliers(supplierSearch, supplierFilter, silent);
    if (activeTab === 'SETTINGS') fetchSettings(silent);
    if (activeTab === 'AUDIT') {
        fetchAudit({
            action: auditAction,
            startDate: auditStartDate ? new Date(auditStartDate) : undefined,
            endDate: auditEndDate ? new Date(auditEndDate) : undefined
        }, silent);
    }
    if (activeTab === 'RECONCILIATION') {
        fetchReconciliation({
            startDate: recStartDate ? new Date(recStartDate) : undefined,
            endDate: recEndDate ? new Date(recEndDate) : undefined,
            supplierId: recSupplierId || selectedSupplier?.id || undefined
         }, silent);
     }
    }, [
        isAuthorized, missingContext, activeTab, 
        withdrawalFilter, supplierSearch, supplierFilter, period, 
        customStart, customEnd, auditAction, auditStartDate, auditEndDate, 
        recStartDate, recEndDate, recSupplierId, withdrawalStartDate, withdrawalEndDate, withdrawalSupplierId, 
        selectedSupplier,
        fetchDashboard, fetchWithdrawals, fetchSuppliers, fetchSettings, fetchAudit, fetchReconciliation
    ]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(() => {
        loadData(true);
      }, 5000);
      return () => clearInterval(interval);
    }, [loadData])
  );

  useEffect(() => {
     if (activeTab === 'SUPPLIERS') {
         const timeout = setTimeout(() => {
             fetchSuppliers(supplierSearch, supplierFilter);
         }, 500);
         return () => clearTimeout(timeout);
     }
  }, [supplierSearch]);

  useEffect(() => {
      if (supplierModalVisible && modalSearch !== '') {
          const timeout = setTimeout(() => {
              fetchSuppliers(modalSearch, 'ALL');
          }, 500);
          return () => clearTimeout(timeout);
      } else if (supplierModalVisible && modalSearch === '') {
          // If search is cleared while modal is open, fetch all immediately (or debounced if preferred, but usually immediate reset is better)
           fetchSuppliers('', 'ALL');
      }
  }, [modalSearch]); // Removed supplierModalVisible dependency to avoid double fetch on open

  const renderDashboardSkeleton = () => (
      <View style={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Skeleton width="48%" height={100} borderRadius={radius.md} />
              <Skeleton width="48%" height={100} borderRadius={radius.md} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Skeleton width="48%" height={100} borderRadius={radius.md} />
              <Skeleton width="48%" height={100} borderRadius={radius.md} />
          </View>
          <Skeleton width="100%" height={200} borderRadius={radius.md} />
      </View>
  );

  const renderTabs = () => (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {(['DASHBOARD', 'SUPPLIERS', 'WITHDRAWALS', 'SETTINGS', 'AUDIT', 'RECONCILIATION'] as const).map((tab) => (
              <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                  onPress={() => setActiveTab(tab)}
              >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                      {tab === 'DASHBOARD' ? 'Visão Geral' : 
                       tab === 'SUPPLIERS' ? 'Fornecedores' :
                       tab === 'WITHDRAWALS' ? 'Saques' :
                       tab === 'SETTINGS' ? 'Config' : 
                       tab === 'AUDIT' ? 'Auditoria' : 'Reconciliação'}
                  </Text>
              </TouchableOpacity>
          ))}
      </ScrollView>
  );

  // Rendering States Hierarchy
  if (!isAuthorized) return null; // Or redirect

  if (missingContext) {
      return (
          <SafeAreaView style={styles.container} edges={['top']}>
              <View style={[styles.content, styles.center]}>
                  <Text style={styles.emptyTitle}>Nenhuma Conta Selecionada</Text>
                  <Text style={styles.emptyText}>Selecione uma conta para visualizar o financeiro.</Text>
              </View>
          </SafeAreaView>
      );
  }
  
  // NON-BLOCKING LOADING PATTERN
  // We only block if it's the INITIAL load (no stats yet)
  if (loading && !stats && !refreshing) {
       return (
          <SafeAreaView style={styles.container} edges={['top']}>
              <Text style={styles.headerTitle}>Financeiro Admin</Text>
              {renderTabs()}
              {renderDashboardSkeleton()}
          </SafeAreaView>
      );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApprove = (req: WithdrawalRequest) => {
    Alert.alert(
      'Confirmar Aprovação',
      `Deseja aprovar o saque de R$ ${req.amount.toFixed(2)} para ${req.supplier.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: async () => {
             const success = await approveWithdrawal(req.id);
             if (success) fetchWithdrawals(withdrawalFilter);
          }
        }
      ]
    );
  };

  const handleRejectConfirm = async () => {
      if (!selectedRequest || !rejectReason) return;
      const success = await rejectWithdrawal(selectedRequest.id, rejectReason);
      if (success) {
          setRejectModalVisible(false);
          setRejectReason('');
          setSelectedRequest(null);
          fetchWithdrawals(withdrawalFilter);
      }
  };

  const handleSaveSettings = async () => {
      if (!localSettings) return;
      await updateSettings(localSettings);
  };

  const handleExportWithdrawalsCSV = async () => {
      if (!withdrawals.length) return Alert.alert('Aviso', 'Sem dados para exportar');
      const header = 'ID,Fornecedor,Valor,Status,Data Solicitação,Data Processamento\n';
      const rows = withdrawals.map(w => 
          `${w.id},${w.supplier.name},${w.amount},${w.status},${w.createdAt},${w.processedAt || ''}`
      ).join('\n');
      
      try {
          await Share.share({ message: header + rows, title: 'Saques.csv' });
      } catch (e) { Alert.alert('Erro', 'Falha ao exportar'); }
  };

  const handleExportAuditCSV = async () => {
      if (!auditLogs.length) return Alert.alert('Aviso', 'Sem dados para exportar');
      try {
          const header = 'Data,Ação,Admin,Detalhes,IP\n';
          const rows = auditLogs.map(l => 
          `${l.createdAt},${l.action},${l.adminEmail},"${(l.details || '').replace(/"/g, '""')}",${l.ipAddress}`
          ).join('\n');
          
          await Share.share({ message: header + rows, title: 'Auditoria.csv' });
      } catch (e) { Alert.alert('Erro', 'Falha ao exportar'); }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const renderPeriodFilter = () => (
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 8 }}>
          {(['7d', '30d', '90d', 'custom'] as const).map((p) => (
              <TouchableOpacity 
                  key={p} 
                  style={[
                      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                      period === p && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => {
                      if (p === 'custom') setShowCustomModal(true);
                      setPeriod(p);
                  }}
              >
                  <Text style={[
                      { fontSize: 13, color: colors.textSecondary },
                      period === p && { color: '#fff', fontWeight: 'bold' }
                  ]}>
                      {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : p === '90d' ? '90 dias' : 'Personalizado'}
                  </Text>
              </TouchableOpacity>
          ))}
      </View>
  );

  const renderCustomPeriodModal = () => (
      <Modal visible={showCustomModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Período Personalizado</Text>
                  <Text style={styles.inputLabel}>Data Início (YYYY-MM-DD)</Text>
                  <TextInput 
                      style={styles.input} 
                      value={customStart} 
                      onChangeText={setCustomStart} 
                      placeholder="2024-01-01"
                  />
                  <Text style={styles.inputLabel}>Data Fim (YYYY-MM-DD)</Text>
                  <TextInput 
                      style={styles.input} 
                      value={customEnd} 
                      onChangeText={setCustomEnd}
                      placeholder="2024-01-31" 
                  />
                  <TouchableOpacity 
                      style={[styles.saveSettingsButton, { marginTop: 16 }]} 
                      onPress={() => {
                          setShowCustomModal(false);
                          loadData();
                      }}
                  >
                      <Text style={styles.saveButtonText}>Aplicar Filtro</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowCustomModal(false)} style={styles.modalCancel}>
                      <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
  );

  const renderHeaderFilter = () => {
      if (!isSystemAdmin) return null;
      return (
          <View style={styles.headerFilterContainer}>
              <View style={{ flex: 1 }}>
                  <Text style={styles.headerFilterLabel}>Exibindo dados de:</Text>
                  <Text style={styles.headerFilterValue}>
                      {selectedSupplier ? selectedSupplier.name : 'Visão Global (Todos)'}
                  </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                  {selectedSupplier && (
                      <TouchableOpacity 
                          style={[styles.filterActionButton, { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: colors.error }]}
                          onPress={() => setSelectedSupplier(null)}
                      >
                          <Text style={[styles.filterActionButtonText, { color: colors.error }]}>Limpar</Text>
                      </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                      style={styles.filterActionButton}
                      onPress={() => {
                          setModalSearch('');
                          setSupplierModalVisible(true);
                          fetchSuppliers('', 'ALL'); // Fetch immediately on open
                      }}
                  >
                      <Text style={styles.filterActionButtonText}>Alterar</Text>
                  </TouchableOpacity>
              </View>
          </View>
      );
  };

  const renderSupplierSelectionModal = () => (
      <Modal visible={supplierModalVisible} animationType="slide">
          <SafeAreaView style={styles.container}>
              <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecionar Fornecedor</Text>
                  <TouchableOpacity onPress={() => setSupplierModalVisible(false)} style={{ padding: 8 }}>
                      <Text style={styles.closeButtonText}>Fechar</Text>
                  </TouchableOpacity>
              </View>
              <View style={{ padding: 16, paddingBottom: 0 }}>
                  <TextInput 
                      style={styles.input} 
                      placeholder="Buscar fornecedor..." 
                      value={modalSearch}
                      onChangeText={setModalSearch}
                  />
              </View>
              {loading && suppliers.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                      <ActivityIndicator size="large" color={colors.primary} />
                  </View>
              ) : (
                  <FlatList
                      data={suppliers}
                      keyExtractor={item => item.id}
                      renderItem={({ item }) => (
                          <TouchableOpacity 
                                style={styles.supplierItem}
                                onPress={() => {
                                    const supplier = { id: item.id, name: item.name };
                                    setSelectedSupplier(supplier);
                                    setSupplierModalVisible(false);
                                    // Immediate update triggering
                                    setLoading(true); // Show loading immediately to prevent "old data" lag perception
                                    // The useEffect will catch the selectedSupplier change and fetch, 
                                    // but we set loading here to give instant feedback.
                                }}
                            >
                              <View>
                                  <Text style={styles.supplierName}>{item.name}</Text>
                                  <Text style={styles.supplierStatus}>{item.financialStatus}</Text>
                              </View>
                              {selectedSupplier?.id === item.id && (
                                  <View style={styles.selectedBadge} />
                              )}
                          </TouchableOpacity>
                      )}
                      contentContainerStyle={{ padding: 16 }}
                      ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>Nenhum fornecedor encontrado</Text>}
                  />
              )}
          </SafeAreaView>
      </Modal>
  );

  return (
      <SafeAreaView style={styles.container} edges={['top']}>
          <Text style={styles.headerTitle}>Financeiro Admin</Text>
          {renderTabs()}
          <ScrollView 
              contentContainerStyle={styles.content}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
              {activeTab === 'DASHBOARD' && (
                  <>
                      {renderHeaderFilter()}
                      {renderPeriodFilter()}
                      
                      {loading && !stats ? (
                          <View style={styles.loadingContainer}>
                              <ActivityIndicator size="large" color={colors.primary} />
                              <Text style={styles.loadingText}>Atualizando dados...</Text>
                          </View>
                      ) : !stats ? (
                          <View style={styles.emptyContainer}>
                              <Text style={styles.emptyTitle}>Ainda não há dados financeiros suficientes</Text>
                              <Text style={styles.emptyText}>Assim que pedidos forem processados, os indicadores aparecerão aqui.</Text>
                          </View>
                      ) : (
                          <>
                              <OperationalAlerts alerts={alerts} />
                              <AdminStatsCards stats={stats} formatCurrency={formatCurrency} isFiltered={!!selectedSupplier} loading={loading} />
                              
                              {stats.charts?.revenue?.labels?.length > 0 ? (
                                  <RevenueCharts stats={stats} />
                              ) : (
                                  <View style={styles.emptyChartContainer}>
                                      <Text style={styles.emptyText}>Ainda não há dados financeiros suficientes para exibir gráficos.</Text>
                                  </View>
                              )}
                          </>
                      )}
                  </>
              )}

              {activeTab === 'WITHDRAWALS' && (
                  <>
                       <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                           <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
                               <TextInput 
                                   style={[styles.input, { flex: 1 }]} 
                                   placeholder="ID Fornecedor" 
                                   value={withdrawalSupplierId}
                                   onChangeText={setWithdrawalSupplierId}
                               />
                               <TouchableOpacity onPress={() => loadData()} style={styles.filterButton}>
                                   <Text style={styles.filterButtonText}>Buscar</Text>
                               </TouchableOpacity>
                           </View>
                           <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                              <View style={[styles.statCard, { flex: 1, backgroundColor: '#FFF3E0', borderColor: '#FFE0B2', borderWidth: 1 }]}>
                                  <Text style={styles.statLabel}>Pendente</Text>
                                  <Text style={[styles.statValue, { color: '#F57C00' }]}>{formatCurrency(stats?.payouts.pendingAmount || 0)}</Text>
                              </View>
                              <View style={[styles.statCard, { flex: 1, backgroundColor: '#E8F5E9', borderColor: '#C8E6C9', borderWidth: 1 }]}>
                                  <Text style={styles.statLabel}>Pago (Período)</Text>
                                  <Text style={[styles.statValue, { color: '#2E7D32' }]}>{formatCurrency(stats?.payouts.totalPaid || 0)}</Text>
                              </View>
                          </View>
                          <TouchableOpacity onPress={handleExportWithdrawalsCSV} style={styles.exportButton}>
                              <Text style={styles.exportButtonText}>Exportar Histórico (CSV)</Text>
                          </TouchableOpacity>
                      </View>
                      <WithdrawalsList 
                          withdrawals={withdrawals}
                          filter={withdrawalFilter}
                          setFilter={setWithdrawalFilter}
                          onApprove={handleApprove}
                          onReject={(req) => { setSelectedRequest(req); setRejectModalVisible(true); }}
                          formatCurrency={formatCurrency}
                      />
                  </>
              )}

              {activeTab === 'SUPPLIERS' && (
                  <SuppliersTable 
                      suppliers={suppliers}
                      search={supplierSearch}
                      setSearch={setSupplierSearch}
                      filter={supplierFilter}
                      setFilter={setSupplierFilter}
                      formatCurrency={formatCurrency}
                  />
              )}

              {activeTab === 'AUDIT' && (
                  <>
                      <View style={styles.filterContainer}>
                          <TextInput 
                              style={[styles.input, { flex: 1, marginRight: 8 }]} 
                              placeholder="Ação (Ex: UPDATE_SETTINGS)" 
                              value={auditAction}
                              onChangeText={setAuditAction}
                          />
                          <TouchableOpacity onPress={() => loadData()} style={styles.filterButton}>
                              <Text style={styles.filterButtonText}>Filtrar</Text>
                          </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={handleExportAuditCSV} style={[styles.exportButton, { marginHorizontal: 16, marginBottom: 16 }]}>
                          <Text style={styles.exportButtonText}>Exportar Auditoria (CSV)</Text>
                      </TouchableOpacity>
                      <AuditLogsList logs={auditLogs} />
                  </>
              )}

              {activeTab === 'RECONCILIATION' && (
                  <>
                      <View style={styles.filterContainer}>
                          <TextInput 
                              style={[styles.input, { flex: 1, marginRight: 8 }]} 
                              placeholder="ID Fornecedor (Opcional)" 
                              value={recSupplierId}
                              onChangeText={setRecSupplierId}
                          />
                          <TouchableOpacity onPress={() => loadData()} style={styles.filterButton}>
                              <Text style={styles.filterButtonText}>Filtrar</Text>
                          </TouchableOpacity>
                      </View>
                      <ReconciliationList data={reconciliation} />
                  </>
              )}

              {activeTab === 'SETTINGS' && localSettings && (
                  <View style={styles.tabContent}>
                      <Text style={styles.sectionTitle}>Configurações Financeiras Globais</Text>
                      <View style={styles.formCard}>
                          <Text style={styles.inputLabel}>Dias para Liberação (D+N)</Text>
                          <TextInput 
                              style={styles.input}
                              keyboardType="numeric"
                              value={String(localSettings.defaultReleaseDays)}
                              onChangeText={t => setLocalSettings({...localSettings, defaultReleaseDays: parseInt(t) || 0})}
                          />

                          <Text style={styles.inputLabel}>Saque Mínimo (R$)</Text>
                          <TextInput 
                              style={styles.input}
                              keyboardType="numeric"
                              value={String(localSettings.defaultMinWithdrawal)}
                              onChangeText={t => setLocalSettings({...localSettings, defaultMinWithdrawal: parseFloat(t) || 0})}
                          />

                          <Text style={styles.inputLabel}>Limite de Saques Mensais</Text>
                          <TextInput 
                              style={styles.input}
                              keyboardType="numeric"
                              value={String(localSettings.defaultWithdrawalLimit)}
                              onChangeText={t => setLocalSettings({...localSettings, defaultWithdrawalLimit: parseInt(t) || 0})}
                          />

                          <TouchableOpacity style={styles.saveSettingsButton} onPress={handleSaveSettings}>
                              <Text style={styles.saveButtonText}>Salvar Configurações</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              )}
            </ScrollView>

          <Modal visible={rejectModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Motivo da Rejeição</Text>
                    <TextInput 
                        style={styles.modalInput}
                        placeholder="Descreva o motivo..."
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        multiline
                    />
                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={styles.modalCancel}>
                            <Text style={styles.modalCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleRejectConfirm} style={styles.modalConfirm}>
                            <Text style={styles.modalConfirmText}>Confirmar Rejeição</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
          </Modal>
          {renderSupplierSelectionModal()}
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 16,
      textAlign: 'center',
  },
  emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
      marginBottom: 24,
  },
  headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
  },
  tabsContainer: {
      backgroundColor: '#fff',
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexGrow: 0,
  },
  tabButton: {
      paddingHorizontal: 16,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
  },
  activeTabButton: {
      borderBottomColor: colors.primary,
  },
  tabText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
  },
  activeTabText: {
      color: colors.primary,
  },
  tabContent: {
      padding: spacing.md,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.md,
  },
  formCard: {
      backgroundColor: '#fff',
      padding: spacing.lg,
      borderRadius: radius.md,
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
      borderColor: colors.border,
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
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: spacing.md,
  },
  modalContent: {
      backgroundColor: '#fff',
      borderRadius: radius.md,
      padding: spacing.lg,
  },
  modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
      color: colors.text,
      textAlign: 'center',
  },
  modalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      marginBottom: 15,
      fontSize: 16,
      height: 100,
      textAlignVertical: 'top',
  },
  modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
  },
  modalCancel: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
      marginRight: 10,
      backgroundColor: colors.background,
      borderRadius: 8,
  },
  filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      alignItems: 'center'
  },
  filterButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      justifyContent: 'center',
  },
  filterButtonText: {
      color: '#fff',
      fontWeight: 'bold',
  },
  exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      marginTop: 10,
      marginBottom: 10,
  },
  exportButtonText: {
      color: colors.primary,
      fontWeight: '600',
  },
  statCard: {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
  },
  statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
      fontWeight: '600',
      textTransform: 'uppercase'
  },
  statValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
  },
  modalConfirm: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
      backgroundColor: colors.error,
      borderRadius: 8,
  },
  modalCancelText: {
      color: colors.text,
      fontWeight: '600',
  },
  modalConfirmText: {
      color: '#fff',
      fontWeight: 'bold',
  },
  loadingContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
  },
  loadingText: {
      marginTop: 10,
      color: colors.textSecondary,
  },
  emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      minHeight: 300,
  },
  emptyChartContainer: {
      padding: 20,
      backgroundColor: '#fff',
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginBottom: 16,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.border,
  },
  headerFilterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      backgroundColor: '#fff',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
  },
  headerFilterLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
  },
  headerFilterValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
  },
  filterActionButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
  },
  filterActionButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
  },
  closeButtonText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 16,
  },
  supplierItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  supplierName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
  },
  supplierStatus: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
  },
  selectedBadge: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
  }
});

export default AdminFinancialScreen;
