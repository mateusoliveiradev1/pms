import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Header from '../../ui/components/Header';
import { colors, shadow, radius, spacing } from '../../ui/theme';

const OrderDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { order } = route.params as { order: any };

  const [currentOrder, setCurrentOrder] = useState(order);
  const [loading, setLoading] = useState(false);
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || '');

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'NEW': return colors.primary;
        case 'SENT_TO_SUPPLIER': return '#fd7e14';
        case 'SHIPPING': return '#17a2b8';
        case 'DELIVERED': return colors.success;
        case 'CANCELLED': return colors.error;
        default: return colors.muted;
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NEW': return 'Novo Pedido';
      case 'SENT_TO_SUPPLIER': return 'Enviado ao Fornecedor';
      case 'SHIPPING': return 'Em Transporte';
      case 'DELIVERED': return 'Entregue';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
      switch (status) {
        case 'NEW': return 'sparkles-outline';
        case 'SENT_TO_SUPPLIER': return 'paper-plane-outline';
        case 'SHIPPING': return 'bus-outline';
        case 'DELIVERED': return 'checkmark-done-circle-outline';
        case 'CANCELLED': return 'close-circle-outline';
        default: return 'help-circle-outline';
      }
  };

  const handleStatusUpdate = async (newStatus: string, code?: string) => {
    setLoading(true);
    try {
      const payload: any = { status: newStatus };
      if (code) payload.trackingCode = code;

      const response = await api.put(`/orders/${currentOrder.id}/status`, payload);
      setCurrentOrder(response.data);
      Alert.alert('Sucesso', 'Status do pedido atualizado!');
      
      if (newStatus === 'SHIPPING') {
          setTrackingModalVisible(false);
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Falha ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusButton = () => {
    switch (currentOrder.status) {
      case 'NEW':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#fd7e14' }]}
            onPress={() => handleStatusUpdate('SENT_TO_SUPPLIER')}
            disabled={loading}
          >
            <Ionicons name="paper-plane" size={20} color="#FFF" style={{marginRight: 8}} />
            <Text style={styles.actionButtonText}>Enviar ao Fornecedor</Text>
          </TouchableOpacity>
        );
      case 'SENT_TO_SUPPLIER':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#17a2b8' }]}
            onPress={() => setTrackingModalVisible(true)}
            disabled={loading}
          >
            <Ionicons name="bus" size={20} color="#FFF" style={{marginRight: 8}} />
            <Text style={styles.actionButtonText}>Informar Rastreio</Text>
          </TouchableOpacity>
        );
      case 'SHIPPING':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => handleStatusUpdate('DELIVERED')}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{marginRight: 8}} />
            <Text style={styles.actionButtonText}>Marcar como Entregue</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={`Pedido #${currentOrder.id.substring(0, 8).toUpperCase()}`} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={[styles.heroCard, { borderTopColor: getStatusColor(currentOrder.status) }]}>
            <View style={styles.heroHeader}>
                <View style={[styles.iconBox, { backgroundColor: getStatusColor(currentOrder.status) + '20' }]}>
                    <Ionicons name={getStatusIcon(currentOrder.status) as any} size={28} color={getStatusColor(currentOrder.status)} />
                </View>
                <View style={styles.statusInfo}>
                    <Text style={[styles.statusLabel, { color: getStatusColor(currentOrder.status) }]}>
                        {getStatusLabel(currentOrder.status)}
                    </Text>
                    <Text style={styles.dateLabel}>Criado em {new Date(currentOrder.createdAt).toLocaleDateString()}</Text>
                </View>
            </View>
            
            {currentOrder.trackingCode && (
                <View style={styles.trackingContainer}>
                    <View style={styles.trackingContent}>
                        <Ionicons name="barcode-outline" size={20} color={colors.text} style={{marginRight: 8}} />
                        <View>
                            <Text style={styles.trackingLabel}>Código de Rastreio</Text>
                            <Text style={styles.trackingCode}>{currentOrder.trackingCode}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.copyButton}>
                         <Ionicons name="copy-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            )}
        </View>

        {/* Customer Card */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Dados do Cliente</Text>
            <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color={colors.muted} style={styles.infoIcon} />
                <View>
                    <Text style={styles.infoLabel}>Nome</Text>
                    <Text style={styles.infoValue}>{currentOrder.customerName || 'N/A'}</Text>
                </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={colors.muted} style={styles.infoIcon} />
                <View>
                    <Text style={styles.infoLabel}>Endereço</Text>
                    <Text style={styles.infoValue}>{currentOrder.customerAddress || 'Endereço não informado'}</Text>
                </View>
            </View>
        </View>

        {/* Items Card */}
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Itens do Pedido</Text>
            {currentOrder.items && currentOrder.items.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
                <View style={styles.itemIcon}>
                    <Ionicons name="cube-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.product?.name || 'Produto'}</Text>
                    <Text style={styles.itemSku}>SKU: {item.product?.sku || '---'}</Text>
                </View>
                <View style={styles.itemPricing}>
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    <Text style={styles.itemTotal}>R$ {(item.price * item.quantity).toFixed(2)}</Text>
                </View>
            </View>
            ))}
            
            <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>R$ {currentOrder.totalAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Frete</Text>
                    <Text style={styles.summaryValue}>Grátis</Text>
                </View>
                <View style={styles.totalDivider} />
                <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>R$ {currentOrder.totalAmount.toFixed(2)}</Text>
                </View>
            </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
            {renderStatusButton()}

            {currentOrder.status !== 'CANCELLED' && currentOrder.status !== 'DELIVERED' && (
                <TouchableOpacity 
                    style={[styles.outlineButton, { borderColor: colors.error }]}
                    onPress={() => handleStatusUpdate('CANCELLED')}
                    disabled={loading}
                >
                    <Ionicons name="close-circle-outline" size={20} color={colors.error} style={{marginRight: 8}} />
                    <Text style={[styles.outlineButtonText, { color: colors.error }]}>Cancelar Pedido</Text>
                </TouchableOpacity>
            )}
        </View>
      </ScrollView>

      {/* Modal de Rastreio */}
      <Modal
        visible={trackingModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTrackingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Informar Rastreio</Text>
                <TouchableOpacity onPress={() => setTrackingModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Insira o código de rastreamento da transportadora.</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Ex: AA123456789BR"
              value={trackingCode}
              onChangeText={setTrackingCode}
              autoCapitalize="characters"
            />
            
            <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => handleStatusUpdate('SHIPPING', trackingCode)}
            >
                <Text style={styles.confirmButtonText}>Salvar e Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
      backgroundColor: '#fff',
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 16,
      ...shadow.card,
      borderTopWidth: 4,
  },
  heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  iconBox: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  statusInfo: {
      flex: 1,
  },
  statusLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 4,
  },
  dateLabel: {
      fontSize: 14,
      color: colors.muted,
  },
  trackingContainer: {
      marginTop: 16,
      padding: 12,
      backgroundColor: '#f8f9fa',
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
  },
  trackingContent: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  trackingLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 2,
  },
  trackingCode: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
  },
  copyButton: {
      padding: 8,
  },
  sectionCard: {
      backgroundColor: '#fff',
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 16,
      ...shadow.card,
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
  },
  infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  infoIcon: {
      width: 24,
      marginRight: 12,
  },
  infoLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 2,
  },
  infoValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
  },
  divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
      marginLeft: 36,
  },
  itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
  },
  itemIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: '#f0f7ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  itemDetails: {
      flex: 1,
  },
  itemName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
  },
  itemSku: {
      fontSize: 12,
      color: colors.muted,
  },
  itemPricing: {
      alignItems: 'flex-end',
  },
  itemQuantity: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 2,
  },
  itemTotal: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary,
  },
  summaryContainer: {
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
  },
  summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
  },
  summaryLabel: {
      fontSize: 14,
      color: colors.muted,
  },
  summaryValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
  },
  totalDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
  },
  totalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
  },
  totalValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
  },
  actionsContainer: {
      gap: 12,
  },
  actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: radius.md,
      ...shadow.sm,
  },
  actionButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFF',
  },
  outlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: radius.md,
      borderWidth: 1,
      backgroundColor: 'transparent',
  },
  outlineButtonText: {
      fontSize: 16,
      fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 20,
    ...shadow.lg,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalSubtitle: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  modalButton: {
    padding: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderDetailsScreen;