import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../ui/theme';
import { MonitorService, HealthMetrics } from '../../services/monitorService';
import Card from '../../ui/components/Card';
import Badge from '../../ui/components/Badge';
import Header from '../../ui/components/Header';
import { Ionicons } from '@expo/vector-icons';

const HealthMonitorScreen = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<HealthMetrics | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async (silent = false) => {
        try {
            setError(null);
            if (!silent) setLoading(true);
            const health = await MonitorService.getHealth();
            setData(health);
        } catch (error) {
            console.error('Failed to fetch health data', error);
            setError('Falha ao carregar dados de saúde.');
        } finally {
            setLoading(false);
            setRefreshing(false);
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

    useEffect(() => {
        // Initial load handled by useFocusEffect
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Header title="Monitoramento de Saúde" />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Header title="Monitoramento de Saúde" />
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
                    <Text style={{ color: theme.colors.text, marginTop: 16, fontSize: 16 }}>{error || 'Dados indisponíveis'}</Text>
                    <TouchableOpacity onPress={() => fetchData()} style={styles.retryButton}>
                        <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>TENTAR NOVAMENTE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Header title="Monitoramento de Saúde" />
            
            <ScrollView 
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* System Status */}
                <Card style={styles.statusCard}>
                    <View style={styles.row}>
                        <Text style={[styles.label, { color: theme.colors.text }]}>Status do Sistema</Text>
                        <Badge 
                            text={data?.status || 'UNKNOWN'} 
                            color={theme.colors.surface}
                            backgroundColor={data?.status === 'OK' ? theme.colors.success : theme.colors.error} 
                        />
                    </View>
                </Card>

                {/* Metrics Grid */}
                <View style={styles.grid}>
                    <Card style={styles.metricCard}>
                        <Ionicons name="globe-outline" size={24} color={theme.colors.primary} />
                        <Text style={[styles.metricValue, { color: theme.colors.text }]}>{data?.metrics?.webhooks?.processed ?? 0}</Text>
                        <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Webhooks Hoje</Text>
                    </Card>
                    <Card style={styles.metricCard}>
                        <Ionicons name="alert-circle-outline" size={24} color={theme.colors.error} />
                        <Text style={[styles.metricValue, { color: theme.colors.text }]}>{data?.metrics?.webhooks?.failed ?? 0}</Text>
                        <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Falhas Webhook</Text>
                    </Card>
                    <Card style={styles.metricCard}>
                        <Ionicons name="cash-outline" size={24} color={theme.colors.success} />
                        <Text style={[styles.metricValue, { color: theme.colors.text }]}>{data?.metrics?.payments?.confirmed ?? 0}</Text>
                        <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Pagamentos OK</Text>
                    </Card>
                    <Card style={styles.metricCard}>
                        <Ionicons name="close-circle-outline" size={24} color={theme.colors.error} />
                        <Text style={[styles.metricValue, { color: theme.colors.text }]}>{data?.metrics?.payments?.rejected ?? 0}</Text>
                        <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Pagamentos Falhos</Text>
                    </Card>
                </View>

                {/* Anomalies & Critical */}
                <Card style={styles.sectionCard}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Alertas & Anomalias</Text>
                    
                    <View style={styles.alertRow}>
                        <Text style={{ color: theme.colors.text }}>Anomalias Financeiras</Text>
                        <Badge 
                            text={String(data?.metrics?.anomalies ?? 0)} 
                            color={theme.colors.surface}
                            backgroundColor={(data?.metrics?.anomalies ?? 0) > 0 ? theme.colors.error : theme.colors.success} 
                        />
                    </View>
                    
                    <View style={styles.alertRow}>
                        <Text style={{ color: theme.colors.text }}>Saques Pendentes</Text>
                        <Badge 
                            text={String(data?.metrics?.withdrawals?.pending ?? 0)} 
                            color={theme.colors.text}
                            backgroundColor={theme.colors.warning} 
                        />
                    </View>
                </Card>

                {data?.lastCritical && (
                    <Card style={[styles.sectionCard, { borderColor: theme.colors.error, borderWidth: 1 }]}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Último Erro Crítico</Text>
                        <Text style={{ color: theme.colors.text, fontWeight: 'bold', marginTop: 8 }}>{data.lastCritical.action}</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{new Date(data.lastCritical.createdAt).toLocaleString()}</Text>
                        <Text style={{ color: theme.colors.text, marginTop: 4 }}>{JSON.stringify(data.lastCritical.payload || {}, null, 2)}</Text>
                    </Card>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16 },
    statusCard: { marginBottom: 16, padding: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 18, fontWeight: 'bold' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
    metricCard: { width: '48%', padding: 16, alignItems: 'center', marginBottom: 12 },
    metricValue: { fontSize: 24, fontWeight: 'bold', marginVertical: 8 },
    metricLabel: { fontSize: 12 },
    sectionCard: { padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    retryButton: { marginTop: 16, padding: 12 }
});

export default HealthMonitorScreen;
