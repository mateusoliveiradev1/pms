import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from '../../../ui/theme';
import { AdminLog } from '../types';

interface AuditLogsListProps {
    logs: AdminLog[];
}

const formatActionName = (action: string) => {
    switch (action) {
        case 'APPROVE_WITHDRAWAL': return 'Aprovação de Saque';
        case 'REJECT_WITHDRAWAL': return 'Rejeição de Saque';
        case 'UPDATE_SETTINGS': return 'Alteração de Configurações';
        default: return action.replace(/_/g, ' ');
    }
};

const formatLogDetails = (details: string | null) => {
    if (!details) return '-';
    
    // Check for legacy English format "Approved withdrawal of R$ 150"
    if (details.includes("Approved withdrawal of")) {
        return details.replace("Approved withdrawal of", "Saque aprovado de");
    }
    if (details.includes("Rejected withdrawal of")) {
        return details.replace("Rejected withdrawal of", "Saque rejeitado de");
    }

    return details;
};

const AuditLogsList: React.FC<AuditLogsListProps> = ({ logs }) => {
    if (logs.length === 0) {
        return <Text style={styles.emptyText}>Nenhum registro de auditoria.</Text>;
    }

    return (
        <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Auditoria do Sistema</Text>
            {logs.map(log => (
                <View key={log.id} style={styles.logCard}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.logAction}>{formatActionName(log.action)}</Text>
                        <Text style={styles.logDate}>{new Date(log.createdAt).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.logAdmin}>Admin: {log.adminName}</Text>
                    <Text style={styles.logDetails}>{formatLogDetails(log.details)}</Text>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    tabContent: {
        padding: spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        marginTop: 20,
    },
    logCard: {
        backgroundColor: '#fff',
        padding: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.sm,
        ...shadow.small,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logAction: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary,
    },
    logDate: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    logAdmin: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
        marginTop: 4,
    },
    logDetails: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
});

export default AuditLogsList;
