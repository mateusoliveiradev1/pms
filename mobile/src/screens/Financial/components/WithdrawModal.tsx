import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { colors, radius, spacing } from '../../../ui/theme';

interface WithdrawModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    amount: string;
    setAmount: (val: string) => void;
    pixKey: string;
    setPixKey: (val: string) => void;
    loading: boolean;
    limits: { min: number; remaining: number } | null;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ 
    visible, onClose, onConfirm, amount, setAmount, pixKey, setPixKey, loading, limits 
}) => {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Solicitar Saque</Text>
                    <Text style={styles.modalSub}>Disponível para saque: R$ {limits?.remaining.toFixed(2) || '0.00'}</Text>

                    <Text style={styles.inputLabel}>Valor (R$)</Text>
                    <TextInput
                        style={styles.modalInput}
                        placeholder={`Mínimo R$ ${limits?.min.toFixed(2) || '50.00'}`}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <Text style={styles.inputLabel}>Chave PIX</Text>
                    <TextInput
                        style={styles.modalInput}
                        placeholder="CPF, CNPJ, Email ou Aleatória"
                        value={pixKey}
                        onChangeText={setPixKey}
                    />

                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={onClose} style={styles.modalCancel} disabled={loading}>
                            <Text style={styles.modalCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onConfirm} style={styles.modalConfirm} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Solicitar</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
        marginBottom: 5,
        color: colors.text,
        textAlign: 'center',
    },
    modalSub: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
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
        backgroundColor: colors.primary,
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

export default WithdrawModal;
