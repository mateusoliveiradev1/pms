import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

// Use seu IP local se estiver testando em dispositivo físico ou emulador Android (10.0.2.2)
// Exemplo: 'http://192.168.1.10:3000/api'
const API_URL = 'http://192.168.3.118:3000/api'; 

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
    if (error.response) {
        console.log(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response.status, error.response.data);
    } else {
        console.log(`API Connection Error: ${error.message}`);
    }

    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear storage to force re-login logic on next app load or via context if possible
      SecureStore.deleteItemAsync('token').catch(console.log);
      SecureStore.deleteItemAsync('user').catch(console.log);
      
      Alert.alert(
        'Sessão Expirada',
        'Sua sessão expirou ou você não tem permissão. Por favor, faça login novamente.'
      );
    }
    return Promise.reject(error);
  }
);

export default api;
