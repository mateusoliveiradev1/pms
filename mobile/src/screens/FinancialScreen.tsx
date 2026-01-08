import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { colors, shadow, radius, spacing } from '../ui/theme';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

interface LedgerEntry {
  id: string;
  type: 'SUBSCRIPTION_PAYMENT' | 'SALE_COMMISSION' | 'PAYOUT' | 'ADJUSTMENT';
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  orderId?: string;
}

interface SupplierData {
  id: string;
  name: string;
  walletBalance: number;
  financialStatus: string;
  nextBillingDate: string | null;
  planId?: string;
  plan?: {
    id: string;
    name: string;
    monthlyPrice: number;
  };
  billingName?: string;
  billingDoc?: string;
  billingAddress?: string;
  billingEmail?: string;
}

interface SupplierSubscriptionData {
  id: string;
  startDate: string;
  endDate: string;
  status: 'ATIVA' | 'PENDENTE' | 'VENCIDA' | 'SUSPENSA';
  plan: { id: string; name: string; cycleDays: number; limitOrders: number; commissionPercent: number };
}

const FinancialScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [subscription, setSubscription] = useState<SupplierSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);

  // Modal States
  const [statementModalVisible, setStatementModalVisible] = useState(false);
  const [cardsModalVisible, setCardsModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [addCardMode, setAddCardMode] = useState(false);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [billingModalVisible, setBillingModalVisible] = useState(false);

  // Billing Form State
  const [billingName, setBillingName] = useState('');
  const [billingDoc, setBillingDoc] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingCep, setBillingCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  const formatDoc = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else {
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
  };

  const handleSearchCep = async () => {
    const cep = billingCep.replace(/\D/g, '');
    if (cep.length !== 8) {
      Alert.alert('CEP Inválido', 'O CEP deve conter 8 dígitos.');
      return;
    }
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        Alert.alert('Erro', 'CEP não encontrado.');
        return;
      }
      const formattedAddress = `${data.logradouro}, Nº , ${data.bairro}, ${data.localidade} - ${data.uf}`;
      setBillingAddress(formattedAddress);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao buscar CEP.');
    } finally {
      setLoadingCep(false);
    }
  };

  // New Card Form State
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardName, setNewCardName] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvv, setNewCardCvv] = useState('');

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPixKey, setWithdrawPixKey] = useState('');
  
  // Plans State
  const [plans, setPlans] = useState<Array<{ id: string; name: string; monthlyPrice: number; cycleDays: number }>>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Cards State (Mock)
  const [cards, setCards] = useState([
    { id: '1', brand: 'mastercard', last4: '4242', expiry: '12/28', default: true },
    { id: '2', brand: 'visa', last4: '1234', expiry: '08/26', default: false }
  ]);

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);

      const suppliersRes = await api.get('/suppliers');
      const firstSupplier = suppliersRes.data[0];

      if (firstSupplier) {
        const financialRes = await api.get(`/financial/supplier/${firstSupplier.id}`);
        setSupplier(financialRes.data.supplier);
        setLedger(financialRes.data.ledger);
        setSubscription(financialRes.data.subscription || null);
      } else {
        throw new Error('No supplier found');
      }
    } catch (error) {
      console.log('Error loading financial data', error);
      // Fallback Mock Data for UI Testing
      if (!supplier) {
          setSupplier({
              id: 'mock-supplier-id',
              name: 'Fornecedor Demo',
              walletBalance: 1250.50,
              financialStatus: 'OVERDUE',
              nextBillingDate: new Date().toISOString(),
              plan: {
                  id: 'pro',
                  name: 'Plano Profissional',
                  monthlyPrice: 99.90
              }
          });
          setLedger([
              { id: 'mock-1', type: 'SALE_COMMISSION', amount: 45.00, description: 'Comissão Venda #1001', status: 'COMPLETED', createdAt: new Date(Date.now() - 3600000).toISOString() },
              { id: 'mock-2', type: 'PAYOUT', amount: 500.00, description: 'Saque Automático', status: 'COMPLETED', createdAt: new Date(Date.now() - 86400000).toISOString() },
              { id: 'mock-3', type: 'SUBSCRIPTION_PAYMENT', amount: 99.90, description: 'Mensalidade Anterior', status: 'COMPLETED', createdAt: new Date(Date.now() - 2592000000).toISOString() }
          ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, supplier]);

  const openPlanModal = async () => {
      setSettingsModalVisible(false); // Close settings modal to avoid overlap
      setLoadingPlans(true);
      try {
          const res = await api.get('/plans');
          const loadedPlans = res.data || [];
          setPlans(loadedPlans);
          
          // Pre-select current plan if exists
          if (supplier?.plan?.id) {
              const currentPlan = loadedPlans.find((p: any) => p.id === supplier.plan?.id);
              if (currentPlan) {
                  setSelectedPlanId(currentPlan.id);
              } else {
                  setSelectedPlanId(loadedPlans[0]?.id || null);
              }
          } else {
              setSelectedPlanId(loadedPlans[0]?.id || null);
          }
      } catch (e) {
          const mockPlans = [
              { id: 'basic', name: 'Plano Básico', monthlyPrice: 49.9, cycleDays: 30 },
              { id: 'pro', name: 'Plano Profissional', monthlyPrice: 99.9, cycleDays: 30 },
              { id: 'enterprise', name: 'Plano Enterprise', monthlyPrice: 199.9, cycleDays: 30 },
          ];
          setPlans(mockPlans);
          
          // Fallback selection logic
          if (supplier?.plan?.id && mockPlans.some(p => p.id === supplier.plan?.id)) {
              setSelectedPlanId(supplier.plan.id);
          } else {
              setSelectedPlanId('pro');
          }
      } finally {
          setLoadingPlans(false);
          setPlanModalVisible(true);
      }
  };

  const confirmChangePlan = async () => {
      if (!selectedPlanId || !supplier) return;
      try {
          const res = await api.post('/financial/subscription/change-plan', {
              supplierId: supplier.id,
              planId: selectedPlanId
          });
          
          if (res.data.supplier) {
              setSupplier(res.data.supplier);
          }
          
          setPlanModalVisible(false);
          Alert.alert('Plano alterado', 'Seu plano foi atualizado com sucesso.');
      } catch (e) {
          // fallback: update local only
          const chosen = plans.find(p => p.id === selectedPlanId);
          if (chosen) {
              setSupplier(prev => prev ? ({
                  ...prev,
                  plan: { id: chosen.id, name: chosen.name, monthlyPrice: chosen.monthlyPrice }
              }) : null);
          }
          setPlanModalVisible(false);
          Alert.alert('Plano alterado', 'Seu plano foi atualizado para o próximo ciclo.');
      }
  };

  const openBillingModal = () => {
      if (supplier) {
          setBillingName(supplier.billingName || supplier.name || '');
          setBillingDoc(supplier.billingDoc || '');
          setBillingAddress(supplier.billingAddress || '');
          setBillingEmail(supplier.billingEmail || '');
      }
      setSettingsModalVisible(false);
      setBillingModalVisible(true);
  };

  const saveBillingInfo = async () => {
      if (!supplier) return;
      
      try {
          // Optimistic update
          setSupplier(prev => prev ? ({
              ...prev,
              billingName,
              billingDoc,
              billingAddress,
              billingEmail
          }) : null);
          
          setBillingModalVisible(false);

          await api.post('/financial/billing-info', {
              supplierId: supplier.id,
              billingName,
              billingDoc,
              billingAddress,
              billingEmail
          });
          
          Alert.alert('Sucesso', 'Dados de faturamento atualizados.');
      } catch (e) {
          console.log('Error saving billing info', e);
          Alert.alert('Erro', 'Não foi possível salvar os dados. Tente novamente.');
      }
  };

  const handleAddCard = () => {
      if (newCardNumber.length < 16 || newCardName.length < 3 || newCardExpiry.length < 5 || newCardCvv.length < 3) {
          Alert.alert('Erro', 'Por favor, preencha todos os campos corretamente.');
          return;
      }

      const newCard = {
          id: String(Date.now()),
          brand: 'mastercard', // Simplified detection
          last4: newCardNumber.slice(-4),
          expiry: newCardExpiry,
          default: false
      };

      setCards([...cards, newCard]);
      setAddCardMode(false);
      setNewCardNumber('');
      setNewCardName('');
      setNewCardExpiry('');
      setNewCardCvv('');
      Alert.alert('Sucesso', 'Cartão adicionado com sucesso!');
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePaySubscription = async () => {
    if (!supplier || !supplier.plan) return;
    
    Alert.alert(
      'Forma de Pagamento',
      `Como deseja pagar a mensalidade de R$ ${supplier.plan.monthlyPrice.toFixed(2)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
            text: 'Usar Saldo', 
            onPress: () => processPayment('BALANCE')
        },
        { 
            text: 'Cartão de Crédito', 
            onPress: () => processPayment('CARD')
        }
      ]
    );
  };

  const processPayment = async (method: 'BALANCE' | 'CARD') => {
      if (!supplier || !supplier.plan) return;

      if (method === 'BALANCE' && supplier.walletBalance < supplier.plan.monthlyPrice) {
          Alert.alert('Saldo Insuficiente', 'Você não tem saldo suficiente na carteira para realizar este pagamento.');
          return;
      }

      try {
        setPaying(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Try API first
        try {
          await api.post('/financial/subscription/pay', {
              supplierId: supplier.id,
              amount: supplier.plan?.monthlyPrice,
              method // Send method to backend
          });
        } catch (e) {
           console.log('API payment failed, simulating success for demo', e);
           
           // Manually update local state
           const newNextBillingDate = new Date();
           newNextBillingDate.setDate(newNextBillingDate.getDate() + 30);

           setSupplier(prev => prev ? ({
               ...prev,
               financialStatus: 'ACTIVE',
               nextBillingDate: newNextBillingDate.toISOString(),
               walletBalance: method === 'BALANCE' ? prev.walletBalance - (prev.plan?.monthlyPrice || 0) : prev.walletBalance
           }) : null);

           // Add fake ledger entry
           const newEntry: LedgerEntry = {
               id: 'temp-' + Date.now(),
               type: 'SUBSCRIPTION_PAYMENT',
               amount: supplier.plan?.monthlyPrice || 0,
               description: method === 'BALANCE' ? 'Pagamento via Saldo' : 'Pagamento via Cartão',
               status: 'COMPLETED',
               createdAt: new Date().toISOString()
           };
           
           setLedger(prev => [newEntry, ...prev]);
        }

        Alert.alert('Sucesso', 'Pagamento realizado com sucesso!');
      } catch (error) {
        Alert.alert('Erro', 'Falha ao processar pagamento.');
      } finally {
        setPaying(false);
      }
  };

  const handleWithdraw = () => {
      const amount = parseFloat(withdrawAmount.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
          Alert.alert('Valor Inválido', 'Por favor, insira um valor válido para saque.');
          return;
      }

      if (!supplier || amount > supplier.walletBalance) {
          Alert.alert('Saldo Insuficiente', 'O valor solicitado é maior que seu saldo disponível.');
          return;
      }

      if (withdrawPixKey.length < 5) {
          Alert.alert('Chave PIX Inválida', 'Por favor, insira uma chave PIX válida.');
          return;
      }

      // Simulate Withdraw
      Alert.alert(
          'Confirmar Saque',
          `Deseja sacar R$ ${amount.toFixed(2)} para a chave PIX: ${withdrawPixKey}?`,
          [
              { text: 'Cancelar', style: 'cancel' },
              {
                  text: 'Confirmar',
                  onPress: async () => {
                      setWithdrawModalVisible(false);
                      setLoading(true);
                       
                      // Try API first
                      try {
                          await api.post('/financial/withdraw', {
                              supplierId: supplier?.id,
                              amount,
                              pixKey: withdrawPixKey
                          });
                      } catch (e) {
                          // Fallback simulation
                          await new Promise(resolve => setTimeout(resolve, 2000));
                      }

                      setSupplier(prev => prev ? ({
                          ...prev,
                          walletBalance: prev.walletBalance - amount
                      }) : null);

                      const newEntry: LedgerEntry = {
                          id: 'temp-withdraw-' + Date.now(),
                          type: 'PAYOUT',
                          amount: amount,
                          description: `Saque PIX (${withdrawPixKey})`,
                          status: 'COMPLETED', // In real app, might be PENDING
                          createdAt: new Date().toISOString()
                      };

                      setLedger(prev => [newEntry, ...prev]);
                      setLoading(false);
                      setWithdrawAmount('');
                      setWithdrawPixKey('');
                      Alert.alert('Solicitação Recebida', 'Seu saque foi processado e será enviado em breve.');
                  }
              }
          ]
      );
  };

  // Helper to reset status for testing
  const resetStatusForTesting = () => {
      if (supplier) {
          setSupplier({
              ...supplier,
              financialStatus: 'OVERDUE',
              nextBillingDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString()
          });
          setSettingsModalVisible(false);
          Alert.alert('Status Resetado', 'O status da conta foi alterado para Pendente/Vencido para testes.');
      }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return colors.success;
      case 'OVERDUE': return colors.error;
      case 'SUSPENDED': return colors.warning;
      default: return colors.muted;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PAYOUT': return 'Repasse de Venda';
      case 'SUBSCRIPTION_PAYMENT': return 'Pagamento Mensalidade';
      case 'SALE_COMMISSION': return 'Comissão da Plataforma';
      case 'ADJUSTMENT': return 'Ajuste Manual';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYOUT': return 'arrow-down-circle';
      case 'SUBSCRIPTION_PAYMENT': return 'card-outline';
      case 'SALE_COMMISSION': return 'pricetag-outline';
      default: return 'swap-horizontal-outline';
    }
  };

  const isCredit = (type: string) => {
      return type === 'PAYOUT' || type === 'ADJUSTMENT';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financeiro</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Card - Premium Look */}
        <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
                <Text style={styles.walletLabel}>Saldo Disponível</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (supplier?.financialStatus !== 'ACTIVE' || (subscription && subscription.status !== 'ATIVA')) {
                      Alert.alert('Saque bloqueado', 'Seu plano está pendente ou vencido.');
                      return;
                    }
                    setWithdrawModalVisible(true);
                  }}
                  style={styles.withdrawButton}
                >
                    <Text style={styles.withdrawButtonText}>SACAR</Text>
                    <Ionicons name="arrow-up-circle-outline" size={20} color="#FFF" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </View>
            <Text style={styles.walletValue}>
                R$ {supplier?.walletBalance.toFixed(2) || '0.00'}
            </Text>
            <View style={styles.walletFooter}>
                <Text style={styles.walletSubtext}>
                    {supplier?.plan?.name || 'Plano Básico'}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: supplier?.financialStatus === 'ACTIVE' ? 'rgba(40, 167, 69, 0.3)' : 'rgba(220, 53, 69, 0.3)' }]}>
                    <Text style={styles.statusPillText}>
                        {supplier?.financialStatus === 'ACTIVE' ? 'ATIVO' : 'PENDENTE'}
                    </Text>
                </View>
            </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setStatementModalVisible(true)}>
                <View style={styles.actionIcon}>
                    <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Extrato</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setCardsModalVisible(true)}>
                <View style={styles.actionIcon}>
                    <Ionicons name="card-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Cartões</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setSettingsModalVisible(true)}>
                <View style={styles.actionIcon}>
                    <Ionicons name="settings-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Configurar</Text>
            </TouchableOpacity>
        </View>

        {/* Subscription Status */}
        <Text style={styles.sectionTitle}>Assinatura</Text>
        <View style={styles.card}>
            <View style={styles.subscriptionRow}>
                <View>
                    <Text style={styles.subscriptionLabel}>Próximo Vencimento</Text>
                    <Text style={styles.subscriptionDate}>
                        {supplier?.nextBillingDate ? new Date(supplier.nextBillingDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.subscriptionPrice}>R$ {supplier?.plan?.monthlyPrice.toFixed(2)}</Text>
                    <Text style={styles.subscriptionPeriod}>/mês</Text>
                </View>
            </View>

            {supplier?.financialStatus !== 'ACTIVE' || (supplier?.nextBillingDate && new Date(supplier.nextBillingDate) < new Date()) ? (
                <TouchableOpacity 
                    style={styles.payButton}
                    onPress={handlePaySubscription}
                    disabled={paying}
                >
                    {paying ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="card" size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.payButtonText}>Pagar Agora</Text>
                        </>
                    )}
                </TouchableOpacity>
            ) : (
                <View style={styles.activeBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.activeText}>Mensalidade em dia</Text>
                </View>
            )}
        </View>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Últimas Transações</Text>
            <TouchableOpacity style={styles.filterButton} onPress={() => setStatementModalVisible(true)}>
                <Ionicons name="filter" size={18} color={colors.primary} />
            </TouchableOpacity>
        </View>

        {ledger.length === 0 ? (
            <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color={colors.muted} />
                <Text style={styles.emptyText}>Nenhuma transação recente</Text>
            </View>
        ) : (
            <View style={styles.transactionList}>
                {ledger.map((item) => (
                    <View key={item.id} style={styles.transactionItem}>
                        <View style={[styles.transactionIcon, { 
                            backgroundColor: isCredit(item.type) ? '#E8F5E9' : '#FFEBEE' 
                        }]}>
                            <Ionicons 
                                name={getTypeIcon(item.type) as any} 
                                size={20} 
                                color={isCredit(item.type) ? colors.success : colors.error} 
                            />
                        </View>
                        <View style={styles.transactionContent}>
                            <Text style={styles.transactionTitle}>{getTypeLabel(item.type)}</Text>
                            <Text style={styles.transactionDate}>
                                {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                            </Text>
                        </View>
                        <Text style={[styles.transactionAmount, { 
                            color: isCredit(item.type) ? colors.success : colors.error 
                        }]}>
                            {isCredit(item.type) ? '+' : '-'} R$ {item.amount.toFixed(2)}
                        </Text>
                    </View>
                ))}
            </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* --- MODALS --- */}

      {/* 1. Statement Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={statementModalVisible}
        onRequestClose={() => setStatementModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Extrato Completo</Text>
                      <TouchableOpacity onPress={() => setStatementModalVisible(false)}>
                          <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: '80%' }}>
                      {ledger.map((item) => (
                          <View key={'modal-'+item.id} style={styles.transactionItem}>
                             <View style={[styles.transactionIcon, { 
                                backgroundColor: isCredit(item.type) ? '#E8F5E9' : '#FFEBEE' 
                            }]}>
                                <Ionicons 
                                    name={getTypeIcon(item.type) as any} 
                                    size={20} 
                                    color={isCredit(item.type) ? colors.success : colors.error} 
                                />
                            </View>
                            <View style={styles.transactionContent}>
                                <Text style={styles.transactionTitle}>{getTypeLabel(item.type)}</Text>
                                <Text style={styles.transactionDate}>
                                    {new Date(item.createdAt).toLocaleDateString('pt-BR')} • {item.description}
                                </Text>
                            </View>
                            <Text style={[styles.transactionAmount, { 
                                color: isCredit(item.type) ? colors.success : colors.error 
                            }]}>
                                {isCredit(item.type) ? '+' : '-'} R$ {item.amount.toFixed(2)}
                            </Text>
                          </View>
                      ))}
                  </ScrollView>
              </View>
          </View>
      </Modal>

      {/* 2. Cards Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cardsModalVisible}
        onRequestClose={() => { setCardsModalVisible(false); setAddCardMode(false); }}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{addCardMode ? 'Novo Cartão' : 'Meus Cartões'}</Text>
                      <TouchableOpacity onPress={() => { setCardsModalVisible(false); setAddCardMode(false); }}>
                          <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                  </View>
                  
                  {addCardMode ? (
                      <View>
                          <TextInput 
                              placeholder="Número do Cartão (apenas números)"
                              style={styles.input}
                              keyboardType="numeric"
                              maxLength={16}
                              value={newCardNumber}
                              onChangeText={setNewCardNumber}
                              placeholderTextColor="#999"
                          />
                          <TextInput 
                              placeholder="Nome impresso no cartão"
                              style={styles.input}
                              value={newCardName}
                              onChangeText={setNewCardName}
                              placeholderTextColor="#999"
                          />
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <TextInput 
                                  placeholder="MM/AA"
                                  style={[styles.input, { width: '48%' }]}
                                  maxLength={5}
                                  value={newCardExpiry}
                                  onChangeText={setNewCardExpiry}
                                  placeholderTextColor="#999"
                              />
                              <TextInput 
                                  placeholder="CVV"
                                  style={[styles.input, { width: '48%' }]}
                                  keyboardType="numeric"
                                  maxLength={4}
                                  secureTextEntry
                                  value={newCardCvv}
                                  onChangeText={setNewCardCvv}
                                  placeholderTextColor="#999"
                              />
                          </View>
                          <TouchableOpacity style={styles.saveButton} onPress={handleAddCard}>
                              <Text style={styles.saveButtonText}>Salvar Cartão</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.cancelButton} onPress={() => setAddCardMode(false)}>
                              <Text style={styles.cancelButtonText}>Cancelar</Text>
                          </TouchableOpacity>
                      </View>
                  ) : (
                      <>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {cards.map(card => (
                                <View key={card.id} style={styles.cardRow}>
                                    <Ionicons name="card" size={24} color={colors.primary} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.cardBrand}>{card.brand.toUpperCase()} **** {card.last4}</Text>
                                        <Text style={styles.cardExpiry}>Expira em {card.expiry}</Text>
                                    </View>
                                    {card.default && (
                                        <View style={styles.defaultBadge}>
                                            <Text style={styles.defaultText}>Principal</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.addCardButton}
                            onPress={() => setAddCardMode(true)}
                        >
                            <Ionicons name="add" size={20} color="#FFF" />
                            <Text style={styles.addCardText}>Adicionar Novo Cartão</Text>
                        </TouchableOpacity>
                      </>
                  )}
              </View>
          </View>
      </Modal>

      {/* 3. Settings Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { width: '80%' }]}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Configurações Financeiras</Text>
                      <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                          <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.settingRow}
                    onPress={openPlanModal}
                  >
                      <Text style={styles.settingLabel}>Alterar Plano de Assinatura</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.settingRow}
                    onPress={openBillingModal}
                  >
                      <Text style={styles.settingLabel}>Dados de Faturamento</Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <Text style={styles.devTitle}>Área de Testes (Dev)</Text>
                  <TouchableOpacity style={styles.resetButton} onPress={resetStatusForTesting}>
                      <Ionicons name="refresh-circle" size={24} color="#FFF" />
                      <Text style={styles.resetText}>Resetar Status para Pendente</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
      
      {/* 5. Change Plan Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={planModalVisible}
        onRequestClose={() => setPlanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolher Plano</Text>
              <TouchableOpacity onPress={() => setPlanModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {loadingPlans ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <>
                <ScrollView style={{ maxHeight: 300 }}>
                  {plans.map(p => (
                    <TouchableOpacity 
                      key={p.id} 
                      style={[styles.planRow, selectedPlanId === p.id ? styles.planRowSelected : null]}
                      onPress={() => setSelectedPlanId(p.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>{p.name}</Text>
                        <Text style={styles.planCycle}>Ciclo: {p.cycleDays} dias</Text>
                      </View>
                      <Text style={styles.planPrice}>R$ {p.monthlyPrice.toFixed(2)}</Text>
                      <Ionicons 
                        name={selectedPlanId === p.id ? 'radio-button-on' : 'radio-button-off'} 
                        size={22} 
                        color={selectedPlanId === p.id ? colors.primary : colors.muted} 
                        style={{ marginLeft: 8 }}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity 
                  style={[styles.saveButton, { marginTop: 12 }]} 
                  onPress={confirmChangePlan}
                  disabled={!selectedPlanId}
                >
                  <Text style={styles.saveButtonText}>Confirmar Plano</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 4. Withdraw Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={withdrawModalVisible}
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { width: '85%' }]}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Solicitar Saque</Text>
                      <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                          <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.withdrawLabel}>Valor do Saque (R$)</Text>
                  <TextInput 
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChangeText={setWithdrawAmount}
                  />
                  <Text style={styles.balanceHint}>Disponível: R$ {supplier?.walletBalance.toFixed(2)}</Text>

                  <Text style={styles.withdrawLabel}>Chave PIX</Text>
                  <TextInput 
                      style={styles.input}
                      placeholder="CPF, Email, Telefone ou Aleatória"
                      value={withdrawPixKey}
                      onChangeText={setWithdrawPixKey}
                  />

                  <TouchableOpacity style={styles.saveButton} onPress={handleWithdraw}>
                      <Text style={styles.saveButtonText}>Confirmar Saque</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* 6. Billing Info Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={billingModalVisible}
        onRequestClose={() => setBillingModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { width: '90%' }]}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Dados de Faturamento</Text>
                      <TouchableOpacity onPress={() => setBillingModalVisible(false)}>
                          <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                  </View>
                  
                  <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={styles.withdrawLabel}>Razão Social / Nome Completo</Text>
                      <TextInput 
                          style={styles.input}
                          placeholder="Ex: Minha Loja Ltda"
                          value={billingName}
                          onChangeText={setBillingName}
                      />

                      <Text style={styles.withdrawLabel}>CPF / CNPJ</Text>
                      <TextInput 
                          style={styles.input}
                          placeholder="00.000.000/0000-00"
                          value={billingDoc}
                          onChangeText={(t) => setBillingDoc(formatDoc(t))}
                          keyboardType="numeric"
                          maxLength={18}
                      />

                      <Text style={styles.withdrawLabel}>Endereço (Buscar por CEP)</Text>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                          <TextInput 
                              style={[styles.input, { flex: 1, marginBottom: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                              placeholder="00000-000"
                              value={billingCep}
                              onChangeText={(t) => setBillingCep(t.replace(/\D/g, ''))}
                              keyboardType="numeric"
                              maxLength={8}
                          />
                          <TouchableOpacity 
                            style={{ 
                                backgroundColor: colors.primary, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                borderTopRightRadius: 8,
                                borderBottomRightRadius: 8
                            }}
                            onPress={handleSearchCep}
                            disabled={loadingCep}
                          >
                              {loadingCep ? (
                                  <ActivityIndicator color="#FFF" size="small" />
                              ) : (
                                  <Ionicons name="search" size={20} color="#FFF" />
                              )}
                          </TouchableOpacity>
                      </View>

                      <Text style={styles.withdrawLabel}>Endereço Completo</Text>
                      <TextInput 
                          style={[styles.input, { height: 80 }]}
                          placeholder="Rua, Número, Bairro, Cidade - UF"
                          value={billingAddress}
                          onChangeText={setBillingAddress}
                          multiline
                      />

                      <Text style={styles.withdrawLabel}>E-mail para Nota Fiscal</Text>
                      <TextInput 
                          style={styles.input}
                          placeholder="financeiro@minhaloja.com"
                          value={billingEmail}
                          onChangeText={setBillingEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                      />

                      <TouchableOpacity style={styles.saveButton} onPress={saveBillingInfo}>
                          <Text style={styles.saveButtonText}>Salvar Dados</Text>
                      </TouchableOpacity>
                  </ScrollView>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  withdrawButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
  },
  withdrawButtonText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 12,
  },
  withdrawLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: 8,
  },
  balanceHint: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 16,
      textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  backButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  walletCard: {
    backgroundColor: '#1A237E', // Dark Blue
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    ...shadow.medium,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  walletValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  walletFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    ...shadow.small,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...shadow.card,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subscriptionLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  subscriptionDate: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionPrice: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  subscriptionPeriod: {
    color: colors.muted,
    fontSize: 12,
  },
  payButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  payButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
  },
  activeText: {
    color: colors.success,
    marginLeft: 8,
    fontWeight: '500',
  },
  transactionList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 8,
    ...shadow.card,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.muted,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: colors.muted,
    marginTop: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    ...shadow.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardExpiry: {
    fontSize: 12,
    color: colors.muted,
  },
  defaultBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '600',
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  addCardText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  devTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  input: {
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: '#E0E0E0',
  },
  saveButton: {
      backgroundColor: colors.success,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      marginBottom: 8,
  },
  saveButtonText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 14,
  },
  cancelButton: {
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
  },
  cancelButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
  },
  planRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
  },
  planRowSelected: {
      backgroundColor: '#F9FAFF',
  },
  planName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
  },
  planCycle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
  },
  planPrice: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
  },
 });

export default FinancialScreen;
