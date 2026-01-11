import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    ScrollView, 
    StyleSheet, 
    RefreshControl, 
    Alert, 
    TouchableOpacity, 
    Modal, 
    Switch,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api from '../../services/api';
import Header from '../../ui/components/Header';
import Card from '../../ui/components/Card';
import Button from '../../ui/components/Button';
import Input from '../../ui/components/Input';
import { colors } from '../../ui/theme';

interface HealthStats {
    processedEventsToday: number;
    failedWebhooksToday: number;
    anomalies: number;
    stuckWithdrawals: number;
    suspendedSuppliers: number;
}

interface Webhook {
    id: string;
    url: string;
    secret: string;
    isActive: boolean;
    subscribedEvents: string[];
}

export default function AdminIntegrationsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<HealthStats | null>(null);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    
    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
    const [url, setUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [events, setEvents] = useState(''); // Comma separated

    const fetchData = async () => {
        setLoading(true);
        try {
            const [healthRes, webhooksRes] = await Promise.all([
                api.get('/admin/integrations/health'),
                api.get('/admin/integrations/webhooks')
            ]);
            setStats(healthRes.data);
            setWebhooks(webhooksRes.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao carregar dados de integração');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveWebhook = async () => {
        if (!url || !secret) {
            Alert.alert('Erro', 'URL e Secret são obrigatórios');
            return;
        }
        
        const eventList = events.split(',').map(e => e.trim()).filter(e => e.length > 0);
        
        try {
            if (editingWebhook) {
                await api.put(`/admin/integrations/webhooks/${editingWebhook.id}`, {
                    url,
                    secret,
                    subscribedEvents: eventList,
                    isActive: editingWebhook.isActive
                });
                Alert.alert('Sucesso', 'Webhook atualizado');
            } else {
                await api.post('/admin/integrations/webhooks', {
                    url,
                    secret,
                    subscribedEvents: eventList
                });
                Alert.alert('Sucesso', 'Webhook criado');
            }
            setModalVisible(false);
            fetchData();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar webhook');
        }
    };

    const handleDeleteWebhook = async (id: string) => {
        Alert.alert('Confirmar', 'Deseja excluir este webhook?', [
            { text: 'Cancelar', style: 'cancel' },
            { 
                text: 'Excluir', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/admin/integrations/webhooks/${id}`);
                        fetchData();
                    } catch (error) {
                        Alert.alert('Erro', 'Falha ao excluir');
                    }
                }
            }
        ]);
    };

    const handleToggleWebhook = async (id: string, currentStatus: boolean) => {
        try {
            await api.patch(`/admin/integrations/webhooks/${id}/toggle`, {
                isActive: !currentStatus
            });
            fetchData(); // Refresh list
        } catch (error) {
            Alert.alert('Erro', 'Falha ao alterar status');
        }
    };

    const handleExport = async (format: 'csv' | 'xlsx') => {
        try {
            const today = new Date();
            const lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 30);
            
            const startDate = lastMonth.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];
            
            const response = await api.get('/admin/integrations/export', {
                params: { startDate, endDate, format },
                responseType: 'text' // For CSV. For XLSX we need blob but React Native handles differently
            });

            const fileName = `accounting_${startDate}_${endDate}.${format}`;
            // @ts-ignore
            const fileUri = (FileSystem.documentDirectory || '') + fileName;

            if (format === 'csv') {
                // @ts-ignore
                await FileSystem.writeAsStringAsync(fileUri, response.data, { encoding: FileSystem.EncodingType.UTF8 });
            } else {
                // XLSX handling in RN requires buffer/base64 logic usually, simplistic here for CSV mainly
                // If backend sends binary, we need base64.
                // Assuming CSV for mobile ease for now.
                Alert.alert('Aviso', 'Exportação Excel via mobile requer configuração avançada. Use CSV por enquanto.');
                return; 
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert('Sucesso', `Arquivo salvo em: ${fileUri}`);
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha na exportação');
        }
    };

    const handleTestNotification = async () => {
        try {
            await api.post('/admin/integrations/test-notification', { channel: 'all' });
            Alert.alert('Sucesso', 'Notificação de teste enviada');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao enviar teste');
        }
    };

    const openModal = (webhook?: Webhook) => {
        if (webhook) {
            setEditingWebhook(webhook);
            setUrl(webhook.url);
            setSecret(webhook.secret);
            setEvents(webhook.subscribedEvents.join(', '));
        } else {
            setEditingWebhook(null);
            setUrl('');
            setSecret('');
            setEvents('ORDER_PAID, PAYMENT_FAILED, WITHDRAWAL_REQUESTED');
        }
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <Header title="Integrações & Sistema" onBack={() => navigation.goBack()} />
            
            <ScrollView 
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
            >
                {/* Health Check */}
                <Text style={styles.sectionTitle}>Saúde do Sistema</Text>
                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="pulse" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.statValue}>{stats?.processedEventsToday || 0}</Text>
                        <Text style={styles.statLabel}>Eventos Hoje</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: (stats?.failedWebhooksToday ? colors.error : colors.success) + '15' }]}>
                            <Ionicons name={stats?.failedWebhooksToday ? "alert" : "checkmark-circle"} size={24} color={stats?.failedWebhooksToday ? colors.error : colors.success} />
                        </View>
                        <Text style={styles.statValue}>{stats?.failedWebhooksToday || 0}</Text>
                        <Text style={styles.statLabel}>Falhas</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: (stats?.anomalies ? colors.warning : colors.textSecondary) + '15' }]}>
                            <Ionicons name="bug" size={24} color={stats?.anomalies ? colors.warning : colors.textSecondary} />
                        </View>
                        <Text style={styles.statValue}>{stats?.anomalies || 0}</Text>
                        <Text style={styles.statLabel}>Anomalias</Text>
                    </Card>
                </View>

                {/* Actions */}
                <Text style={styles.sectionTitle}>Ações Rápidas</Text>
                <View style={styles.actionRow}>
                    <Button 
                        title="Exportar CSV" 
                        onPress={() => handleExport('csv')} 
                        variant="outline"
                        style={{ flex: 1, marginRight: 8 }}
                    />
                    <Button 
                        title="Testar Alertas" 
                        onPress={handleTestNotification} 
                        variant="outline"
                        style={{ flex: 1, marginLeft: 8 }}
                    />
                </View>

                {/* Webhooks */}
                <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Webhooks Internos</Text>
                    <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.addButtonText}>Novo</Text>
                    </TouchableOpacity>
                </View>

                {webhooks.map(webhook => (
                    <Card key={webhook.id} style={styles.webhookCard}>
                        <View style={styles.webhookHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.webhookUrl} numberOfLines={1}>{webhook.url}</Text>
                                <Text style={styles.webhookEvents} numberOfLines={2}>
                                    {webhook.subscribedEvents.join(', ')}
                                </Text>
                            </View>
                            <Switch 
                                value={webhook.isActive} 
                                onValueChange={() => handleToggleWebhook(webhook.id, webhook.isActive)}
                                trackColor={{ false: '#767577', true: colors.primary }}
                            />
                        </View>
                        <View style={styles.webhookActions}>
                            <TouchableOpacity onPress={() => openModal(webhook)} style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteWebhook(webhook.id)} style={[styles.actionBtn, { marginLeft: 16 }]}>
                                <Text style={[styles.actionBtnText, { color: colors.error }]}>Excluir</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>
                ))}

                {webhooks.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="git-network-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={styles.emptyText}>Nenhum webhook configurado</Text>
                        <Text style={styles.emptySubText}>Adicione endpoints para receber notificações de eventos do sistema em tempo real.</Text>
                    </View>
                )}

            </ScrollView>

            {/* Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
                        </Text>
                        
                        <Input 
                            label="URL de Destino" 
                            placeholder="https://api.sistema.com/webhook"
                            value={url}
                            onChangeText={setUrl}
                            autoCapitalize="none"
                        />
                        
                        <Input 
                            label="Secret (HMAC)" 
                            placeholder="Chave secreta para assinatura"
                            value={secret}
                            onChangeText={setSecret}
                            secureTextEntry
                        />
                        
                        <Input 
                            label="Eventos (separados por vírgula)" 
                            placeholder="ORDER_PAID, WITHDRAWAL_REQUESTED"
                            value={events}
                            onChangeText={setEvents}
                            autoCapitalize="none"
                        />

                        <View style={styles.modalButtons}>
                            <Button 
                                title="Cancelar" 
                                onPress={() => setModalVisible(false)} 
                                variant="outline"
                                style={{ flex: 1, marginRight: 8 }}
                            />
                            <Button 
                                title="Salvar" 
                                onPress={handleSaveWebhook} 
                                style={{ flex: 1, marginLeft: 8 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12,
        marginTop: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
        padding: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginVertical: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    webhookCard: {
        marginBottom: 12,
        padding: 12,
    },
    webhookHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    webhookUrl: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    webhookEvents: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    webhookActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
    },
    iconBtn: {
        padding: 8,
        marginLeft: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        marginTop: 8,
    },
    emptySubText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 240,
    },
    addButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    actionBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    actionBtnText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: colors.text,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        marginTop: 16,
    }
});
