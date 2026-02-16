import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
    View, 
    Text, 
    ScrollView, 
    StyleSheet, 
    RefreshControl, 
    Alert, 
    TouchableOpacity, 
    Modal, 
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import Header from '../../ui/components/Header';
import Button from '../../ui/components/Button';
import Input from '../../ui/components/Input';
import { colors, spacing, radius, shadow } from '../../ui/theme';

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

// --- Visual Components ---

const StatusCard = ({ icon, value, label, status, color, backgroundColor }: { icon: keyof typeof Ionicons.glyphMap, value: number, label: string, status: string, color: string, backgroundColor?: string }) => (
    <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.statusHeader]}>
            <View style={[styles.iconContainer, { backgroundColor: backgroundColor || color + '15' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.statusValue, { color: colors.text }]}>{value}</Text>
        </View>
        <View>
            <Text style={styles.statusLabel}>{label}</Text>
            <View style={[styles.statusBadge, { backgroundColor: backgroundColor || color + '10' }]}>
                 <Text style={[styles.statusText, { color: color }]} numberOfLines={1}>{status}</Text>
            </View>
        </View>
    </View>
);

const ActionButton = ({ icon, title, subtitle, onPress, variant = 'primary' }: { icon: keyof typeof Ionicons.glyphMap, title: string, subtitle: string, onPress: () => void, variant?: 'primary' | 'secondary' }) => (
    <TouchableOpacity 
        style={[
            styles.actionButton, 
            variant === 'secondary' && styles.actionButtonSecondary,
            variant === 'primary' && styles.actionButtonPrimary
        ]} 
        onPress={onPress}
        activeOpacity={0.8}
    >
        <View style={[
            styles.actionIcon, 
            { backgroundColor: variant === 'primary' ? 'rgba(255,255,255,0.2)' : colors.background }
        ]}>
            <Ionicons 
                name={icon} 
                size={24} 
                color={variant === 'primary' ? '#FFF' : colors.textSecondary} 
            />
        </View>
        <View style={styles.actionContent}>
            <Text style={[
                styles.actionTitle,
                variant === 'primary' && { color: '#FFF' }
            ]}>{title}</Text>
            <Text style={[
                styles.actionSubtitle,
                variant === 'primary' && { color: 'rgba(255,255,255,0.8)' }
            ]}>{subtitle}</Text>
        </View>
        <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={variant === 'primary' ? '#FFF' : colors.textSecondary} 
            style={{ opacity: 0.7 }} 
        />
    </TouchableOpacity>
);

const WebhookEmptyState = ({ onPress }: { onPress: () => void }) => (
    <View style={styles.emptyStateContainer}>
        <View style={styles.emptyIllustration}>
            <View style={styles.emptyCircleLarge} />
            <View style={styles.emptyCircleSmall} />
            <Ionicons name="git-network-outline" size={48} color={colors.primary} style={{ zIndex: 1 }} />
        </View>
        <Text style={styles.emptyStateTitle}>Integração Externa</Text>
        <Text style={styles.emptyStateText}>
            Webhooks permitem notificar sistemas externos sobre eventos financeiros em tempo real.
        </Text>
        <TouchableOpacity style={styles.createWebhookBtn} onPress={onPress}>
            <Text style={styles.createWebhookBtnText}>+ Criar primeiro webhook</Text>
        </TouchableOpacity>
    </View>
);

// --- Main Screen ---

export default function AdminIntegrationsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<HealthStats | null>(null);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    
    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
    const [url, setUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [events, setEvents] = useState('');

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
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

    useFocusEffect(
        useCallback(() => {
            fetchData();
            const interval = setInterval(() => {
                fetchData(true);
            }, 5000);
            return () => clearInterval(interval);
        }, [])
    );

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
            fetchData();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao alterar status');
        }
    };

    const handleExportExcel = async () => {
        try {
            const wb = XLSX.utils.book_new();

            // 1. Health Stats Sheet
            const statsData = stats ? [
                { Metric: 'Eventos Processados Hoje', Value: stats.processedEventsToday },
                { Metric: 'Falhas de Webhook', Value: stats.failedWebhooksToday },
                { Metric: 'Anomalies', Value: stats.anomalies },
                { Metric: 'Saques Travados', Value: stats.stuckWithdrawals },
                { Metric: 'Fornecedores Suspensos', Value: stats.suspendedSuppliers },
                { Metric: 'Data do Relatório', Value: new Date().toLocaleString() }
            ] : [{ Metric: 'Status', Value: 'Sem dados disponíveis' }];

            const wsStats = XLSX.utils.json_to_sheet(statsData);
            XLSX.utils.book_append_sheet(wb, wsStats, "Saúde do Sistema");

            // 2. Webhooks Sheet
            const webhooksData = webhooks.map(wh => ({
                ID: wh.id,
                URL: wh.url,
                Ativo: wh.isActive ? 'Sim' : 'Não',
                Eventos: wh.subscribedEvents.join(', ')
            }));
            
            if (webhooksData.length === 0) {
                 webhooksData.push({ ID: 'Nenhum webhook', URL: '', Ativo: '', Eventos: '' });
            }

            const wsWebhooks = XLSX.utils.json_to_sheet(webhooksData);
            XLSX.utils.book_append_sheet(wb, wsWebhooks, "Webhooks");

            // 3. Generate file
            const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
            const fileName = `relatorio_sistema_${new Date().getTime()}.xlsx`;
            const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: (FileSystem as any).EncodingType.Base64
            });

            // 4. Share
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert('Sucesso', `Arquivo salvo em: ${fileUri}`);
            }
        } catch (error) {
            console.error('Excel Export Error:', error);
            Alert.alert('Erro', 'Falha ao gerar Excel');
        }
    };

    const handleExport = async (format: 'csv' | 'xlsx') => {
        if (format === 'xlsx') {
            await handleExportExcel();
            return;
        }

        try {
            const today = new Date();
            const lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 30);
            
            const startDate = lastMonth.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];
            
            const response = await api.get('/admin/integrations/export', {
                params: { startDate, endDate, format },
                responseType: 'text'
            });

            const fileName = `accounting_${startDate}_${endDate}.${format}`;
            // @ts-ignore
            const fileUri = (FileSystem.documentDirectory || '') + fileName;

            if (format === 'csv') {
                // @ts-ignore
                await FileSystem.writeAsStringAsync(fileUri, response.data, { encoding: FileSystem.EncodingType.UTF8 });
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
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Health Stats */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Saúde do Sistema</Text>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </View>

                <View style={styles.grid}>
                    <StatusCard 
                        icon="pulse" 
                        value={stats?.processedEventsToday || 0} 
                        label="Eventos Hoje" 
                        status="Operando normalmente"
                        color={colors.primary}
                        backgroundColor="#E3F2FD"
                    />
                    <StatusCard 
                        icon="alert-circle" 
                        value={stats?.failedWebhooksToday || 0} 
                        label="Falhas Webhook" 
                        status={stats?.failedWebhooksToday ? "Atenção requerida" : "Nenhuma falha"}
                        color={stats?.failedWebhooksToday ? colors.error : colors.success}
                        backgroundColor={stats?.failedWebhooksToday ? "#FFEBEE" : "#E8F5E9"}
                    />
                </View>
                <View style={[styles.grid, { marginTop: 12 }]}>
                    <StatusCard 
                        icon="shield-checkmark" 
                        value={stats?.anomalies || 0} 
                        label="Anomalias" 
                        status={stats?.anomalies ? "Detectadas" : "Sistema íntegro"}
                        color={stats?.anomalies ? colors.warning : colors.success}
                        backgroundColor={stats?.anomalies ? "#FFF3E0" : "#E8F5E9"}
                    />
                </View>

                {/* 2. Actions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Ações Rápidas</Text>
                </View>
                
                <View style={styles.actionsContainer}>
                    <ActionButton 
                        icon="notifications-circle" 
                        title="Testar Alertas" 
                        subtitle="Simula incidentes do sistema"
                        onPress={handleTestNotification}
                        variant="primary"
                    />
                    <View style={{ height: 16 }} />
                    <ActionButton 
                        icon="document-text" 
                        title="Exportar CSV (30d)" 
                        subtitle="Relatório contábil completo"
                        onPress={() => handleExport('csv')}
                        variant="secondary"
                    />
                    <View style={{ height: 16 }} />
                    <ActionButton 
                        icon="stats-chart" 
                        title="Exportar Excel" 
                        subtitle="Relatório gerencial (XLSX)"
                        onPress={() => handleExport('xlsx')}
                        variant="secondary"
                    />
                </View>

                {/* 3. Webhooks */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Webhooks Internos</Text>
                    {webhooks.length > 0 && (
                        <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
                            <Ionicons name="add" size={16} color="#FFF" />
                            <Text style={styles.addButtonText}>Novo</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {webhooks.length === 0 ? (
                    <WebhookEmptyState onPress={() => openModal()} />
                ) : (
                    <View>
                        {webhooks.map(webhook => (
                            <View key={webhook.id} style={styles.webhookItem}>
                                <View style={styles.webhookIcon}>
                                    <Ionicons name="globe-outline" size={24} color={colors.primary} />
                                </View>
                                <View style={styles.webhookContent}>
                                    <Text style={styles.webhookUrl} numberOfLines={1}>{webhook.url}</Text>
                                    <Text style={styles.webhookEvents} numberOfLines={1}>
                                        {webhook.subscribedEvents.join(', ')}
                                    </Text>
                                </View>
                                <Switch 
                                    value={webhook.isActive} 
                                    onValueChange={() => handleToggleWebhook(webhook.id, webhook.isActive)}
                                    trackColor={{ false: '#E0E0E0', true: colors.primary }}
                                    thumbColor="#FFF"
                                />
                                <TouchableOpacity onPress={() => openModal(webhook)} style={styles.moreBtn}>
                                    <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

            </ScrollView>

            {/* Modal */}
            <Modal
                visible={modalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.inputLabel}>URL de Destino</Text>
                        <Input 
                            placeholder="https://api.seu-sistema.com/webhook"
                            value={url}
                            onChangeText={setUrl}
                            autoCapitalize="none"
                        />
                        
                        <Text style={styles.inputLabel}>Secret (HMAC)</Text>
                        <Input 
                            placeholder="Chave secreta para assinatura"
                            value={secret}
                            onChangeText={setSecret}
                            secureTextEntry
                        />
                        
                        <Text style={styles.inputLabel}>Eventos (separados por vírgula)</Text>
                        <Input 
                            placeholder="ORDER_PAID, WITHDRAWAL_REQUESTED"
                            value={events}
                            onChangeText={setEvents}
                            autoCapitalize="none"
                        />

                        <View style={styles.modalFooter}>
                            {editingWebhook && (
                                <TouchableOpacity 
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteWebhook(editingWebhook.id)}
                                >
                                    <Text style={styles.deleteButtonText}>Excluir</Text>
                                </TouchableOpacity>
                            )}
                            <View style={{ flex: 1 }} />
                            <Button 
                                title="Salvar Configuração" 
                                onPress={handleSaveWebhook} 
                                style={{ flex: editingWebhook ? 0 : 1, minWidth: 120 }}
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
        backgroundColor: '#F8F9FA', // Lighter background for professional look
    },
    content: {
        padding: spacing.md,
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        marginTop: spacing.sm,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
    },
    // Status Card Styles
    statusCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: radius.lg,
        ...shadow.sm,
        minHeight: 120,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusValue: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statusLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: 6,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    // Action Button Styles
    actionsContainer: {
        marginBottom: spacing.lg,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radius.lg,
        ...shadow.sm,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    actionButtonPrimary: {
        backgroundColor: colors.primary,
        borderWidth: 0,
        ...shadow.medium,
    },
    actionButtonSecondary: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    // Webhook Styles
    addButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
    },
    webhookItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        ...shadow.sm,
    },
    webhookIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    webhookContent: {
        flex: 1,
        marginRight: spacing.sm,
    },
    webhookUrl: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    webhookEvents: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    moreBtn: {
        padding: 4,
        marginLeft: 8,
    },
    // Empty State
    emptyStateContainer: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EDEEF2',
        borderStyle: 'dashed',
        marginTop: spacing.sm,
    },
    emptyIllustration: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    emptyCircleLarge: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary + '05',
    },
    emptyCircleSmall: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary + '10',
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.lg,
        maxWidth: '90%',
    },
    createWebhookBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        ...shadow.sm,
    },
    createWebhookBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.xl,
        minHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 6,
        marginTop: 12,
    },
    modalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    deleteButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    deleteButtonText: {
        color: colors.error,
        fontWeight: '600',
    },
});
