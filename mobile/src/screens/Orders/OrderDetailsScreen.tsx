import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Header from '../../ui/components/Header';
import { colors, shadow } from '../../ui/theme';

const OrderDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { order } = route.params as { order: any }; // Assuming we pass the full order object, or fetch it if needed

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'NEW': return '#007bff';
        case 'SENT_TO_SUPPLIER': return '#fd7e14';
        case 'SHIPPING': return '#17a2b8';
        case 'DELIVERED': return '#28a745';
        case 'CANCELLED': return '#dc3545';
        default: return '#6c757d';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NEW': return 'Novo';
      case 'SENT_TO_SUPPLIER': return 'Enviado ao Fornecedor';
      case 'SHIPPING': return 'Em Transporte';
      case 'DELIVERED': return 'Entregue';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const [currentOrder, setCurrentOrder] = useState(order);
  const [loading, setLoading] = useState(false);
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || '');

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
            <Ionicons name="send" size={20} color="#FFF" style={{marginRight: 8}} />
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
            style={[styles.actionButton, { backgroundColor: '#28a745' }]}
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
      <Header title={`Pedido #${currentOrder.id.substring(0, 8)}`} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentOrder.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(currentOrder.status)}</Text>
          </View>
          {currentOrder.trackingCode && (
             <View style={styles.trackingContainer}>
                 <Text style={styles.label}>Rastreio:</Text>
                 <Text style={styles.value}>{currentOrder.trackingCode}</Text>
             </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.value}>{currentOrder.customerName || 'N/A'}</Text>
          
          <Text style={styles.label}>Endereço:</Text>
          <Text style={styles.value}>{currentOrder.customerAddress || 'N/A'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Itens</Text>
          {currentOrder.items && currentOrder.items.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.product?.name || 'Produto'}</Text>
                <Text style={styles.itemSku}>Qtd: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>R$ {(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.separator} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R$ {currentOrder.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {renderStatusButton()}

        {currentOrder.status !== 'CANCELLED' && currentOrder.status !== 'DELIVERED' && (
             <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#dc3545', marginTop: 12 }]}
                onPress={() => handleStatusUpdate('CANCELLED')}
                disabled={loading}
            >
                <Ionicons name="close-circle" size={20} color="#FFF" style={{marginRight: 8}} />
                <Text style={styles.actionButtonText}>Cancelar Pedido</Text>
            </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal de Rastreio */}
      <Modal
        visible={trackingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTrackingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Informar Código de Rastreio</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: AA123456789BR"
              value={trackingCode}
              onChangeText={setTrackingCode}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setTrackingModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => handleStatusUpdate('SHIPPING', trackingCode)}
              >
                <Text style={styles.confirmButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'NEW': return '#007bff';
        case 'SENT_TO_SUPPLIER': return '#fd7e14';
        case 'SHIPPING': return '#17a2b8';
        case 'DELIVERED': return '#28a745';
        case 'CANCELLED': return '#dc3545';
        default: return '#6c757d';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'NEW': return 'Novo';
        case 'SENT_TO_SUPPLIER': return 'Enviado ao fornecedor';
        case 'SHIPPING': return 'Em transporte';
        case 'DELIVERED': return 'Entregue';
        case 'CANCELLED': return 'Cancelado';
        default: return status;
    }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...shadow.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  trackingContainer: {
      marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemSku: {
    fontSize: 12,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadow.card,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#eee',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default OrderDetailsScreen;
