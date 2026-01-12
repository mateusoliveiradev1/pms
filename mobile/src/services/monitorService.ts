import api from './api';

export interface HealthMetrics {
    status: 'OK' | 'ATTENTION' | 'CRITICAL';
    metrics: {
        webhooks: {
            processed: number;
            failed: number;
        };
        payments: {
            confirmed: number;
            rejected: number;
        };
        withdrawals: {
            pending: number;
        };
        anomalies: number;
    };
    lastCritical: {
        id: string;
        level: string;
        source: string;
        action: string;
        message?: string;
        createdAt: string;
        payload?: any;
    } | null;
}

export const MonitorService = {
    getHealth: async (): Promise<HealthMetrics> => {
        const response = await api.get('/admin/system/health');
        return response.data;
    }
};
