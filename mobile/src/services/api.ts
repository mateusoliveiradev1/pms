import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { ENV } from '../config/env';
import { Logger } from '../utils/logger';

const API_URL = ENV.API_URL;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Apenas logar erro genérico se não for cancelamento
    if (axios.isCancel(error)) {
       return Promise.reject(error);
    }
    
    // Logs limpos - Apenas erros reais (não 401/403 que são tratados no AuthContext)
    if (error.response) {
        if (error.response.status !== 401 && error.response.status !== 403) {
            Logger.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response.status);
        }
    } else {
        Logger.error(`API Connection Error: ${error.message}`);
        Alert.alert(
            "Sem Conexão",
            "Não foi possível conectar ao servidor. Verifique sua internet."
        );
    }

    return Promise.reject(error);
  }
);

export default api;
