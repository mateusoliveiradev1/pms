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
  TextInput,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { colors, shadow, radius, spacing } from '../../ui/theme';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

interface LedgerEntry {
  id: string;
  type: 'SUBSCRIPTION_PAYMENT' | 'SALE_COMMISSION' | 'PAYOUT' | 'ADJUSTMENT' | 'SALE_REVENUE';
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  orderId?: string;
  releaseDate?: string;
}

interface SupplierData {
  id: string;
  name: string;
  walletBalance: number;
  pendingBalance?: number;
  blockedBalance?: number;
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
    case 'SALE_REVENUE': return 'Venda Aprovada';
    case 'PAYOUT': return 'Saque Realizado';
    case 'SUBSCRIPTION_PAYMENT': return 'Pagamento Mensalidade';
    case 'SALE_COMMISSION': return 'Comissão da Plataforma';
    case 'ADJUSTMENT': return 'Ajuste Manual';
    default: return type;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'PAYOUT': return 'arrow-up-circle-outline';
    case 'SALE_REVENUE': return 'cash-outline';
    case 'SUBSCRIPTION_PAYMENT': return 'card-outline';
    case 'SALE_COMMISSION': return 'pricetag-outline';
    default: return 'swap-horizontal-outline';
  }
};

const isCredit = (type: string) => {
    return type === 'SALE_REVENUE';
};

const luhnCheck = (value: string) => {
    // Remove non-digits
    let bEven = false;
    const valueStr = value.replace(/\D/g, "");

    if (/[^0-9-\s]+/.test(valueStr)) return false;

    let nSum = 0;
    
    for (let n = valueStr.length - 1; n >= 0; n--) {
        let cDigit = valueStr.charAt(n);
        let nDigit = parseInt(cDigit, 10);

        if (bEven) {
            if ((nDigit *= 2) > 9) nDigit -= 9;
        }

        nSum += nDigit;
        bEven = !bEven;
    }

    return (nSum % 10) == 0;
};

const FinancialScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'SYSTEM_ADMIN') {
      // Redirect Admin to AdminFinancial if they somehow reach here
      navigation.replace('AdminFinancial' as never);
    }
  }, [user, navigation]);
  
  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [subscription, setSubscription] = useState<SupplierSubscriptionData | null>(null);
  const [limits, setLimits] = useState<{ min: number; limitCount: number; usedCount: number; remaining: number } | null>(null);
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
  const [pendingHelpModalVisible, setPendingHelpModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<LedgerEntry | null>(null);

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

  const handleSearchCep = async (cepToSearch?: string) => {
    const cep = cepToSearch || billingCep.replace(/\D/g, '');
    if (cep.length !== 8) {
      if (!cepToSearch) Alert.alert('CEP Inválido', 'O CEP deve conter 8 dígitos.');
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

  const handleViewReceipt = (entry: LedgerEntry) => {
      setSelectedReceipt(entry);
      setReceiptModalVisible(true);
  };

  const handleShareReceipt = async () => {
      if (!selectedReceipt) return;
      try {
          const message = `
COMPROVANTE DE TRANSAÇÃO - PMS
--------------------------------
Tipo: ${getTypeLabel(selectedReceipt.type)}
Valor: R$ ${Math.abs(selectedReceipt.amount).toFixed(2)}
Data: ${new Date(selectedReceipt.createdAt).toLocaleString('pt-BR')}
ID Transação: ${selectedReceipt.id}
Descrição: ${selectedReceipt.description}
Status: ${selectedReceipt.status === 'COMPLETED' ? 'Concluído' : selectedReceipt.status === 'PENDING' ? 'Pendente' : selectedReceipt.status}
--------------------------------
Este é um comprovante digital gerado pelo sistema PMS.
          `.trim();

          await Share.share({
              message: message,
              title: 'Comprovante PMS'
          });
      } catch (error: any) {
          Alert.alert('Erro', error.message);
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
  const [plans, setPlans] = useState<Array<{ id: string; name: string; monthlyPrice: number; cycleDays: number; commissionPercent: number; limitOrders: number; limitProducts: number; priorityLevel: number }>>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Cards State
  const [cards, setCards] = useState<any[]>([]);

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
        setLimits(financialRes.data.withdrawalLimits || null);
      } else {
        console.log('Nenhum fornecedor encontrado.');
        Alert.alert('Aviso', 'Nenhum fornecedor vinculado a este usuário.');
      }
    } catch (error) {
      console.log('Error loading financial data', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados financeiros.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const openPlanModal = async () => {
      setSettingsModalVisible(false); // Close settings modal to avoid overlap
      setLoadingPlans(true);
      try {
          const res = await api.get('/plans');
          const loadedPlans = (res.data || []).map((p: any) => ({
              id: String(p.id),
              name: String(p.name ?? ''),
              monthlyPrice: Number(p.monthlyPrice ?? 0),
              cycleDays: Number(p.cycleDays ?? 30),
              commissionPercent: Number(p.commissionPercent ?? 10),
              limitOrders: Number(p.limitOrders ?? 1000),
              limitProducts: Number(p.limitProducts ?? 100),
              priorityLevel: Number(p.priorityLevel ?? 1)
          }));
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
          Alert.alert('Erro', 'Não foi possível carregar os planos. Tente novamente.');
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
      const cleanNumber = newCardNumber.replace(/\D/g, '');
      if (cleanNumber.length < 13 || !luhnCheck(cleanNumber)) {
          Alert.alert('Cartão Inválido', 'O número do cartão digitado não é válido.');
          return;
      }
      
      if (newCardName.length < 3 || newCardExpiry.length < 5 || newCardCvv.length < 3) {
          Alert.alert('Erro', 'Por favor, preencha todos os campos corretamente.');
          return;
      }

      // SECURITY MOCK: In a real app, this data would go to Stripe/MercadoPago directly.
      // We generate a "token" here to simulate the process.
      const mockToken = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newCard = {
          id: String(Date.now()),
          brand: 'mastercard', // Simplified detection
          last4: cleanNumber.slice(-4),
          expiry: newCardExpiry,
          token: mockToken, // Store ONLY the token
          default: cards.length === 0 // First card is default
      };

      // NEVER store the full number or CVV
      setCards([...cards, newCard]);
      setAddCardMode(false);
      setNewCardNumber('');
      setNewCardName('');
      setNewCardExpiry('');
      setNewCardCvv('');
      Alert.alert('Sucesso', 'Cartão adicionado e tokenizado com segurança!');
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

      let paymentToken = undefined;

      if (method === 'BALANCE' && supplier.walletBalance < supplier.plan.monthlyPrice) {
          Alert.alert('Saldo Insuficiente', 'Você não tem saldo suficiente na carteira para realizar este pagamento.');
          return;
      }

      if (method === 'CARD') {
          if (cards.length === 0) {
              Alert.alert('Nenhum cartão', 'Adicione um cartão de crédito para prosseguir.');
              // Optionally open cards modal
              setCardsModalVisible(true);
              return;
          }
          // Use the first card/default
          const selectedCard = cards[0];
          paymentToken = selectedCard.token;
      }

      try {
        setPaying(true);
        
        // Try API first
        const res = await api.post('/financial/subscription/pay', {
            supplierId: supplier.id,
            amount: supplier.plan?.monthlyPrice,
            method, // Send method to backend
            paymentToken // Send token if available
        });

        // Update state from API response if available
        if (res.data.supplier) {
            setSupplier(res.data.supplier);
            // Refresh full data to ensure sync
            loadData(); 
            Alert.alert('Sucesso', 'Pagamento realizado com sucesso!');
        }
      } catch (error) {
        console.log('Payment failed', error);
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

      if (limits) {
          if (amount < limits.min) {
              Alert.alert('Valor Mínimo', `O valor mínimo para saque é R$ ${limits.min.toFixed(2)}.`);
              return;
          }
          if (limits.remaining <= 0) {
              Alert.alert('Limite Atingido', `Você atingiu o limite mensal de ${limits.limitCount} saques.`);
              return;
          }
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
                          
                          // Update local state on success
                          setSupplier(prev => prev ? ({
                              ...prev,
                              walletBalance: prev.walletBalance - amount,
                              blockedBalance: (prev.blockedBalance || 0) + amount
                          }) : null);

                          const newEntry: LedgerEntry = {
                              id: 'temp-withdraw-' + Date.now(),
                              type: 'PAYOUT',
                              amount: amount,
                              description: `Saque solicitado (PIX: ${withdrawPixKey})`,
                              status: 'PENDING', 
                              createdAt: new Date().toISOString()
                          };

                          setLedger(prev => [newEntry, ...prev]);
                          Alert.alert('Solicitação Recebida', 'Seu saque foi processado e será enviado em breve.');

                      } catch (e) {
                          console.log(e);
                          Alert.alert('Erro', 'Não foi possível solicitar o saque. Tente novamente.');
                      } finally {
                          setLoading(false);
                          setWithdrawAmount('');
                          setWithdrawPixKey('');
                      }
                  }
              }
          ]
      );
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
            
            {(supplier?.blockedBalance || 0) > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 4 }}>
                        Bloqueado/Em Saque: R$ {supplier?.blockedBalance?.toFixed(2)}
                    </Text>
                </View>
            )}
            {(supplier?.pendingBalance || 0) > 0 && (
                <TouchableOpacity 
                    onPress={() => setPendingHelpModalVisible(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, alignSelf: 'flex-start' }}
                >
                    <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.9)" />
                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginLeft: 4, marginRight: 4 }}>
                        A Liberar: R$ {supplier?.pendingBalance?.toFixed(2)}
                    </Text>
                    <Ionicons name="help-circle-outline" size={14} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
            )}
            <View style={styles.walletFooter}>
                <Text style={styles.walletSubtext}>
                    {supplier?.plan?.name || 'Plano Básico'} • {subscription ? `Comissão ${subscription?.plan?.commissionPercent ?? 10}%` : ''}
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

        {/* Pending Releases */}
        {ledger.some(item => item.status === 'PENDING' && item.releaseDate) && (
            <View style={{ marginBottom: 24 }}>
                <Text style={styles.sectionTitle}>Próximas Liberações</Text>
                <View style={styles.card}>
                    {(() => {
                        const pendingItems = ledger
                            .filter(item => item.status === 'PENDING' && item.releaseDate)
                            .sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime())
                            .slice(0, 5);

                        return pendingItems.map((item, index) => {
                            const releaseDate = new Date(item.releaseDate!);
                            const today = new Date();
                            const isToday = releaseDate.toDateString() === today.toDateString();
                            
                            return (
                                <View key={item.id} style={{ 
                                    flexDirection: 'row', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    paddingVertical: 14,
                                    borderBottomWidth: index < pendingItems.length - 1 ? 1 : 0,
                                    borderBottomColor: colors.border
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={{ 
                                            width: 40, height: 40, borderRadius: 20, 
                                            backgroundColor: isToday ? '#E8F5E9' : '#FFF3E0', 
                                            alignItems: 'center', justifyContent: 'center', marginRight: 12 
                                        }}>
                                            <Ionicons 
                                                name={isToday ? "checkmark-circle-outline" : "time-outline"} 
                                                size={20} 
                                                color={isToday ? colors.success : colors.warning} 
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                                                {item.description || 'Receita Pendente'}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                                                {isToday ? 'Libera Hoje' : `Libera em ${releaseDate.toLocaleDateString('pt-BR')}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                                            R$ {item.amount.toFixed(2)}
                                        </Text>
                                        {item.orderId && (
                                            <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>
                                                Pedido #{item.orderId.substring(0,8)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            );
                        });
                    })()}
                </View>
            </View>
        )}

        {/* Subscription Status */}
        <Text style={styles.sectionTitle}>Assinatura</Text>
        <View style={styles.card}>
            <View style={styles.subscriptionRow}>
                <View>
                    <Text style={styles.subscriptionLabel}>Próximo Vencimento</Text>
                    <Text style={styles.subscriptionDate}>
                        {(supplier?.nextBillingDate || subscription?.endDate) 
                            ? new Date(supplier?.nextBillingDate || subscription?.endDate!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) 
                            : 'N/A'}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.subscriptionPrice}>R$ {supplier?.plan?.monthlyPrice.toFixed(2)}</Text>
                    <Text style={styles.subscriptionPeriod}>/mês</Text>
                </View>
            </View>

            {(supplier?.financialStatus !== 'ACTIVE' || 
              (supplier?.nextBillingDate && new Date(supplier.nextBillingDate) < new Date()) ||
              (subscription?.endDate && new Date(subscription.endDate) < new Date())
            ) ? (
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
                <View style={{ width: '100%' }}>
                    <View style={styles.activeBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={styles.activeText}>Mensalidade em dia</Text>
                    </View>
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
                            {isCredit(item.type) ? '+' : '-'} R$ {Math.abs(item.amount).toFixed(2)}
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
                                {item.type === 'PAYOUT' && (
                                    <TouchableOpacity 
                                        style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}
                                        onPress={() => handleViewReceipt(item)}
                                    >
                                        <Ionicons name="receipt-outline" size={14} color={colors.primary} />
                                        <Text style={{ fontSize: 12, color: colors.primary, marginLeft: 4 }}>Ver Comprovante</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Text style={[styles.transactionAmount, { 
                                color: isCredit(item.type) ? colors.success : colors.error 
                            }]}>
                                {isCredit(item.type) ? '+' : '-'} R$ {Math.abs(item.amount).toFixed(2)}
                            </Text>
                          </View>
                      ))}
                  </ScrollView>
              </View>
          </View>
      </Modal>

      {/* 7. Receipt Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: '85%' }]}>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Comprovante de Saque</Text>
                    <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>PMS Marketplace</Text>
                </View>

                {selectedReceipt && (
                    <View style={{ backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={{ color: colors.muted }}>Valor</Text>
                            <Text style={{ fontWeight: 'bold', fontSize: 16, color: colors.text }}>
                                R$ {Math.abs(selectedReceipt.amount).toFixed(2)}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={{ color: colors.muted }}>Data</Text>
                            <Text style={{ color: colors.text }}>
                                {new Date(selectedReceipt.createdAt).toLocaleDateString('pt-BR')}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={{ color: colors.muted }}>Hora</Text>
                            <Text style={{ color: colors.text }}>
                                {new Date(selectedReceipt.createdAt).toLocaleTimeString('pt-BR')}
                            </Text>
                        </View>
                        <View style={{ marginBottom: 12 }}>
                            <Text style={{ color: colors.muted, marginBottom: 4 }}>Descrição</Text>
                            <Text style={{ color: colors.text, fontWeight: '500' }}>
                                {selectedReceipt.description}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' }}>
                            <Text style={{ color: colors.muted }}>ID da Transação</Text>
                            <Text style={{ color: colors.text, fontSize: 10 }}>
                                {selectedReceipt.id}
                            </Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.saveButton, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]} 
                    onPress={handleShareReceipt}
                >
                    <Ionicons name="share-social-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Compartilhar Comprovante</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.cancelButton, { marginTop: 12 }]} 
                    onPress={() => setReceiptModalVisible(false)}
                >
                    <Text style={styles.cancelButtonText}>Fechar</Text>
                </TouchableOpacity>
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
                        <Text style={styles.planCycle}>Ciclo: {p.cycleDays} dias • Comissão: {p.commissionPercent}%</Text>
                        <Text style={styles.planCycle}>Limite Pedidos: {p.limitOrders} • Limite Produtos: {p.limitProducts}</Text>
                        <Text style={styles.planCycle}>Prioridade: {p.priorityLevel}</Text>
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

      {/* 6. Pending Help Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={pendingHelpModalVisible}
        onRequestClose={() => setPendingHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sobre o Saldo a Liberar</Text>
              <TouchableOpacity onPress={() => setPendingHelpModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                    <Ionicons name="time-outline" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                            Prazo de Liberação
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
                            Os valores das vendas ficam pendentes por um período de segurança (geralmente 14 a 30 dias após a entrega), conforme seu plano.
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={colors.success} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                            Segurança
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
                            Isso garante que, em caso de devolução ou disputa, o valor possa ser estornado sem prejudicar seu saldo negativo.
                        </Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity 
                style={[styles.saveButton, { marginTop: 20 }]} 
                onPress={() => setPendingHelpModalVisible(false)}
            >
                <Text style={styles.saveButtonText}>Entendi</Text>
            </TouchableOpacity>
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
              <View style={[styles.modalContent, { width: '90%', maxWidth: 400 }]}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Solicitar Saque</Text>
                      <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                          <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                  </View>
                  
                  {limits && (
                      <View style={{ marginBottom: 20, backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                              <Text style={{ fontSize: 12, color: colors.muted }}>Limite Mensal</Text>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                                  {limits.usedCount} / {limits.limitCount} saques
                              </Text>
                          </View>
                          <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
                              <View style={{ 
                                  width: `${Math.min((limits.usedCount / limits.limitCount) * 100, 100)}%`, 
                                  height: '100%', 
                                  backgroundColor: limits.remaining > 0 ? colors.success : colors.error 
                              }} />
                          </View>
                          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
                              Mínimo por saque: R$ {limits.min.toFixed(2)}
                          </Text>
                      </View>
                  )}

                  <Text style={styles.withdrawLabel}>Valor do Saque (R$)</Text>
                  <View style={{ 
                      flexDirection: 'row', alignItems: 'center', 
                      borderWidth: 1, borderColor: '#DDD', borderRadius: 8, 
                      paddingHorizontal: 12, marginBottom: 4, backgroundColor: '#FAFAFA' 
                  }}>
                    <Text style={{ fontSize: 16, color: colors.text, marginRight: 8, fontWeight: '600' }}>R$</Text>
                    <TextInput 
                        style={{ flex: 1, height: 48, fontSize: 16, color: colors.text }}
                        keyboardType="numeric"
                        placeholder="0.00"
                        value={withdrawAmount}
                        onChangeText={setWithdrawAmount}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                      <Text style={styles.balanceHint}>
                          Disponível: R$ {supplier?.walletBalance.toFixed(2)}
                      </Text>
                      <TouchableOpacity onPress={() => setWithdrawAmount(supplier?.walletBalance.toString() || '0')}>
                          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Máximo</Text>
                      </TouchableOpacity>
                  </View>

                  <Text style={styles.withdrawLabel}>Chave PIX</Text>
                  <TextInput 
                      style={styles.input}
                      placeholder="CPF, Email, Telefone ou Aleatória"
                      value={withdrawPixKey}
                      onChangeText={setWithdrawPixKey}
                  />

                  <TouchableOpacity 
                    style={[
                        styles.saveButton, 
                        (limits && limits.remaining <= 0) || (parseFloat(withdrawAmount || '0') < (limits?.min || 0)) 
                        ? { backgroundColor: '#ccc' } : {}
                    ]} 
                    onPress={handleWithdraw}
                    disabled={!!limits && limits.remaining <= 0}
                  >
                      <Text style={styles.saveButtonText}>
                          {limits && limits.remaining <= 0 ? 'Limite Atingido' : 'Confirmar Saque'}
                      </Text>
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
                              onChangeText={(t) => {
                                  const clean = t.replace(/\D/g, '');
                                  setBillingCep(clean);
                                  if (clean.length === 8) {
                                      handleSearchCep(clean);
                                  }
                              }}
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
                            onPress={() => handleSearchCep()}
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