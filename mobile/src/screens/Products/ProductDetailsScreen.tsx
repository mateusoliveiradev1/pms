import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import Header from '../../ui/components/Header';
import { colors, radius, shadow, spacing } from '../../ui/theme';
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
        if (!productId) {
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
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    };

    const renderLogItem = (item: InventoryLog, index: number) => {
        const isPositive = item.quantity > 0;
        const isLast = index === logs.length - 1;
        
        return (
            <View style={styles.timelineItem} key={item.id}>
                <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: isPositive ? colors.success : colors.danger }]} />
                    {!isLast && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                    <View style={styles.logCard}>
                        <View style={styles.logHeader}>
                            <Text style={styles.logType}>{item.type}</Text>
                            <Text style={styles.logDate}>{formatDate(item.createdAt)}</Text>
                        </View>
                        <Text style={styles.logReason} numberOfLines={2}>{item.reason}</Text>
                        <Text style={[styles.logQuantity, { color: isPositive ? colors.success : colors.danger }]}>
                            {isPositive ? '+' : ''}{item.quantity} un
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    if (!product) {
        return (
            <SafeAreaView style={styles.container}>
                 <Header onBack={() => navigation.goBack()} title="Detalhes" />
                 <View style={styles.center}>
                     <Text style={styles.errorText}>Produto não encontrado.</Text>
                 </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header 
                onBack={() => navigation.goBack()} 
                title="Detalhes do Produto"
                rightIcon="create-outline"
                // @ts-ignore
                onRightPress={() => navigation.navigate('ProductForm', { productId: product.id })}
            />
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="cube" size={48} color={colors.primary} />
                    </View>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productSku}>SKU: {product.sku}</Text>
                    <Text style={styles.productPrice}>R$ {product.finalPrice?.toFixed(2)}</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Ionicons name="layers" size={24} color={colors.info} />
                        <Text style={styles.statValue}>{product.stockAvailable}</Text>
                        <Text style={styles.statLabel}>Estoque</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="pricetag" size={24} color={colors.success} />
                        <Text style={styles.statValue}>R$ {product.finalPrice?.toFixed(2)}</Text>
                        <Text style={styles.statLabel}>Preço</Text>
                    </View>
                     <View style={styles.statCard}>
                        <Ionicons name="time" size={24} color={colors.warning} />
                        <Text style={styles.statValue}>{logs.length}</Text>
                        <Text style={styles.statLabel}>Movimentações</Text>
                    </View>
                </View>

                {/* Description */}
                {product.description ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Descrição</Text>
                        <Text style={styles.descriptionText}>{product.description}</Text>
                    </View>
                ) : null}

                {/* History Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Histórico de Movimentação</Text>
                    <View style={styles.timelineContainer}>
                        {logs.length === 0 ? (
                            <Text style={styles.emptyText}>Nenhuma movimentação registrada.</Text>
                        ) : (
                            logs.map((log, index) => renderLogItem(log, index))
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => Alert.alert('Atenção', 'Deseja excluir este produto?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Excluir', style: 'destructive', onPress: async () => {
                            try {
                                await api.delete(`/products/${product.id}`);
                                navigation.goBack();
                            } catch (error) {
                                Alert.alert('Erro', 'Não foi possível excluir o produto.');
                            }
                        }}
                    ])}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    <Text style={[styles.actionButtonText, { color: colors.danger }]}>Excluir</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 80,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.surface,
        borderBottomLeftRadius: radius.xl,
        borderBottomRightRadius: radius.xl,
        ...shadow.card,
        marginBottom: spacing.md,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    productName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
        marginBottom: 4,
    },
    productSku: {
        fontSize: 14,
        color: colors.muted,
        marginBottom: spacing.sm,
    },
    productPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginHorizontal: 4,
        ...shadow.card,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: colors.muted,
    },
    section: {
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    descriptionText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
    },
    timelineContainer: {
        paddingLeft: spacing.sm,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    timelineLeft: {
        alignItems: 'center',
        width: 20,
        marginRight: spacing.sm,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        zIndex: 1,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: spacing.md,
    },
    logCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        ...shadow.card,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    logType: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    logDate: {
        fontSize: 12,
        color: colors.muted,
    },
    logReason: {
        fontSize: 14,
        color: colors.muted,
        marginBottom: 4,
    },
    logQuantity: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    emptyText: {
        fontSize: 14,
        color: colors.muted,
        fontStyle: 'italic',
    },
    errorText: {
        fontSize: 16,
        color: colors.danger,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    deleteButton: {
        borderColor: colors.danger,
        backgroundColor: colors.danger + '10',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    }
});

export default ProductDetailsScreen;
