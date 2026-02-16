import * as FileSystem from 'expo-file-system';
import { useCallback } from 'react';
import { Logger } from '../utils/logger';

const CACHE_FILE_URI = `${(FileSystem as any).documentDirectory}dashboard_cache.json`;

export interface DashboardCacheData {
  stats: any;
  chartData: number[];
  chartLabels: string[];
  products: any[];
  selectedSupplier: any | null;
  lastUpdated: number;
}

export const useDashboardCache = () => {
  const saveDashboardData = useCallback(async (data: Omit<DashboardCacheData, 'lastUpdated'>) => {
    try {
      const cacheData: DashboardCacheData = {
        ...data,
        lastUpdated: Date.now(),
      };
      await FileSystem.writeAsStringAsync(CACHE_FILE_URI, JSON.stringify(cacheData));
    } catch (error) {
      Logger.error('Failed to save dashboard cache', error);
    }
  }, []);

  const loadDashboardData = useCallback(async (): Promise<DashboardCacheData | null> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(CACHE_FILE_URI);
      if (!fileInfo.exists) {
        return null;
      }

      const content = await FileSystem.readAsStringAsync(CACHE_FILE_URI);
      return JSON.parse(content) as DashboardCacheData;
    } catch (error) {
      Logger.error('Failed to load dashboard cache', error);
      return null;
    }
  }, []);

  return {
    saveDashboardData,
    loadDashboardData,
  };
};
