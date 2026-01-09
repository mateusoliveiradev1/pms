import React, { useState, useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Modal, TextInput, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadow } from '../../ui/theme';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

import { useAdminDashboard } from './hooks/useAdminDashboard';
import { WithdrawalRequest } from './types';

import AdminStatsCards from './components/AdminStatsCards';
import RevenueCharts from './components/RevenueCharts';
import WithdrawalsList from './components/WithdrawalsList';
import SuppliersTable from './components/SuppliersTable';
import AuditLogsList from './components/AuditLogsList';

const AdminFinancialScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SUPPLIERS' | 'WITHDRAWALS' | 'SETTINGS' | 'AUDIT'>('DASHBOARD');
  
  // Filters
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [withdrawalFilter, setWithdrawalFilter] = useState('PENDING');

  const {
      stats, suppliers, withdrawals, auditLogs, settings,
      loading, refreshing, setRefreshing,
      fetchDashboard, fetchWithdrawals, fetchSuppliers, fetchSettings, fetchAudit,
      approveWithdrawal, rejectWithdrawal, updateSettings
  } = useAdminDashboard();

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Settings Local State
  const [localSettings, setLocalSettings] = useState<any>(null);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
        navigation.goBack();
    }
  }, [user, navigation]);

  useEffect(() => {
      if (settings) setLocalSettings(settings);
  }, [settings]);

  const loadData = useCallback(async () => {
    if (activeTab === 'DASHBOARD') fetchDashboard();
    if (activeTab === 'WITHDRAWALS') fetchWithdrawals(withdrawalFilter);
    if (activeTab === 'SUPPLIERS') fetchSuppliers(supplierSearch, supplierFilter);
    if (activeTab === 'SETTINGS') fetchSettings();
    if (activeTab === 'AUDIT') fetchAudit();
  }, [activeTab, withdrawalFilter, supplierSearch, supplierFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const renderTabs = () => (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {['DASHBOARD', 'SUPPLIERS', 'WITHDRAWALS', 'SETTINGS', 'AUDIT'].map((tab) => (
              <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                  onPress={() => setActiveTab(tab as any)}
              >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                      {tab === 'DASHBOARD' ? 'Visão Geral' : 
                       tab === 'SUPPLIERS' ? 'Fornecedores' :
                       tab === 'WITHDRAWALS' ? 'Saques' :
                       tab === 'SETTINGS' ? 'Config' : 'Auditoria'}
                  </Text>
              </TouchableOpacity>
          ))}
      </ScrollView>
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
                      <AdminStatsCards stats={stats} formatCurrency={formatCurrency} />
                      <RevenueCharts stats={stats} />
                  </>
              )}

              {activeTab === 'WITHDRAWALS' && (
                  <WithdrawalsList 
                      withdrawals={withdrawals}
                      filter={withdrawalFilter}
                      setFilter={setWithdrawalFilter}
                      onApprove={handleApprove}
                      onReject={(req) => { setSelectedRequest(req); setRejectModalVisible(true); }}
                      formatCurrency={formatCurrency}
                  />
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

              {activeTab === 'AUDIT' && <AuditLogsList logs={auditLogs} />}

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
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: colors.background,
  },
  headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
  },
  content: {
      padding: spacing.md,
      paddingBottom: 100,
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
});

export default AdminFinancialScreen;
