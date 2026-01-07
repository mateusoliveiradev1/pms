import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import Header from '../../ui/components/Header';
import { colors } from '../../ui/theme';
import { Ionicons } from '@expo/vector-icons';

type InventoryLog = {
    id: string;
    quantity: number;
    type: string;
    reason: string;
    createdAt: string;
};

type Product = {
    id: string;
    name: string;
    sku: string;
    description: string;
    stockAvailable: number;
    finalPrice: number;
};

const ProductDetailsScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    // @ts-ignore
    const { productId } = route.params;

    const [product, setProduct] = useState<Product | null>(null);
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [productId])
    );

    const loadData = async () => {
        console.log('Loading details for product ID:', productId);
        if (!productId) {
            console.error('No productId provided');
            setLoading(false);
            return;
        }
        try {
            const [prodRes, logsRes] = await Promise.all([
                api.get(`/products/${productId}`),
                api.get(`/products/${productId}/history`)
            ]);
            setProduct(prodRes.data);
            setLogs(logsRes.data);
        } catch (error) {
            console.log('Error loading details', error);
            Alert.alert('Erro', 'Não foi possível carregar os detalhes do produto.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    };

    const renderLogItem = (item: InventoryLog) => {
        const isPositive = item.quantity > 0;
        return (
        <View style={[styles.logItem, { borderLeftColor: isPositive ? colors.success : colors.danger }]}>
            <View style={styles.logIconContainer}>
                <Ionicons 
                    name={isPositive ? "arrow-up-circle" : "arrow-down-circle"} 
                    size={24} 
                    color={isPositive ? colors.success : colors.danger} 
                />
            </View>
            <View style={styles.logContent}>
                <View style={styles.logHeader}>
                    <Text style={styles.logType}>{item.type}</Text>
                    <Text style={styles.logDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.logReason}>{item.reason}</Text>
            </View>
            <View style={styles.logQuantityContainer}>
                <Text style={[styles.logQuantity, { color: isPositive ? colors.success : colors.danger }]}>
                    {isPositive ? '+' : ''}{item.quantity}
                </Text>
            </View>
        </View>
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    if (!product) {
        return <View style={styles.center}><Text>Produto não encontrado</Text></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Detalhes do Produto" onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <View style={{flex: 1}}>
                            <Text style={styles.name}>{product.name}</Text>
                            <Text style={styles.sku}>SKU: {product.sku}</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.iconButton}
                            // @ts-ignore
                            onPress={() => navigation.navigate('ProductForm', { productId: product.id })}
                        >
                            <Ionicons name="create-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.description}>{product.description}</Text>
                </View>
                    
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Ionicons name="pricetag-outline" size={20} color={colors.success} style={{marginBottom: 4}} />
                        <Text style={styles.label}>Preço</Text>
                        <Text style={[styles.price, { color: colors.success }]}>R$ {product.finalPrice?.toFixed(2)}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="cube-outline" size={20} color={colors.primary} style={{marginBottom: 4}} />
                        <Text style={styles.label}>Estoque</Text>
                        <Text style={[styles.stock, { color: product.stockAvailable < 5 ? colors.danger : colors.primary }]}>
                            {product.stockAvailable}
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={20} color="#555" style={{marginRight: 8}} />
                    <Text style={styles.sectionTitle}>Histórico de Movimentação</Text>
                </View>

                {logs.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={48} color="#ccc" />
                        <Text style={styles.empty}>Nenhum registro encontrado.</Text>
                    </View>
                ) : (
                    logs.map(log => (
                        <View key={log.id} style={styles.logContainerWrapper}>
                             {renderLogItem(log)}
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16 },
    headerCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2} },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    name: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    sku: { color: '#888', fontSize: 14, fontWeight: '600' },
    description: { color: '#666', fontSize: 14, lineHeight: 20 },
    iconButton: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
    
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    statCard: { flex: 0.48, backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
    
    label: { fontSize: 12, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    price: { fontSize: 18, fontWeight: 'bold' },
    stock: { fontSize: 24, fontWeight: 'bold' },
    
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555' },
    
    logContainerWrapper: { marginBottom: 10 },
    logItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderLeftWidth: 4, elevation: 1 },
    logIconContainer: { marginRight: 12 },
    logContent: { flex: 1 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    logType: { fontWeight: 'bold', fontSize: 14, color: '#333' },
    logDate: { fontSize: 11, color: '#999' },
    logReason: { color: '#666', fontSize: 12 },
    logQuantityContainer: { marginLeft: 12, minWidth: 40, alignItems: 'flex-end' },
    logQuantity: { fontWeight: 'bold', fontSize: 16 },
    
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    empty: { textAlign: 'center', color: '#888', marginTop: 12 }
});

export default ProductDetailsScreen;
