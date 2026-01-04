import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const OrderDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { order } = route.params as { order: any }; // Assuming we pass the full order object, or fetch it if needed

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
            <Text style={styles.actionButtonText}>Marcar como Entregue</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedido #{currentOrder.id.substring(0, 8)}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentOrder.status) }]}>
            <Text style={styles.statusText}>{currentOrder.status}</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  trackingContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  itemSku: {
    fontSize: 12,
    color: '#999',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#eee',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#007bff',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default OrderDetailsScreen;