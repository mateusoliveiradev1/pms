import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/PushNotificationService';
import { Logger } from '../utils/logger';

// Consolidated Auth State matching GET /me
export interface AuthState {
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  role: 'SYSTEM_ADMIN' | 'ACCOUNT_ADMIN' | 'SUPPLIER_ADMIN' | 'SUPPLIER_USER' | null;
  onboardingStatus: 'PENDING' | 'COMPLETED';
  activeAccountId: string | null;
  activeSupplierId: string | null;
  accountType: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextData extends AuthState {
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    role: null,
    onboardingStatus: 'PENDING',
    activeAccountId: null,
    activeSupplierId: null,
    accountType: null,
    isAuthenticated: false,
    loading: true,
  });

  const isLoggingOut = useRef(false);

  const fetchMe = async () => {
      try {
          const response = await api.get('/auth/me');
          const { id, email, name, role, onboardingStatus, activeAccountId, activeSupplierId, accountType } = response.data;
          
          setAuth({
              user: { id, email, name },
              role,
              onboardingStatus,
              activeAccountId,
              activeSupplierId,
              accountType,
              isAuthenticated: true,
              loading: false
          });

          return true;
      } catch (error: any) {
          Logger.warn('Failed to fetch /me:', error.message);
          return false;
      }
  };

  const signOut = async () => {
      if (isLoggingOut.current) return;
      isLoggingOut.current = true;
      
      try {
          await SecureStore.deleteItemAsync('token');
          // Clear legacy
          await SecureStore.deleteItemAsync('user');
          await SecureStore.deleteItemAsync('account');
          await SecureStore.deleteItemAsync('supplier');

          setAuth({
            user: null,
            role: null,
            onboardingStatus: 'PENDING',
            activeAccountId: null,
            activeSupplierId: null,
            accountType: null,
            isAuthenticated: false,
            loading: false,
          });
          
          delete api.defaults.headers.common['Authorization'];
      } catch (error) {
          Logger.error('SignOut Error:', error);
      } finally {
          isLoggingOut.current = false;
      }
  };

  useEffect(() => {
    // Interceptor for 401
    const interceptorId = api.interceptors.response.use(
      response => response,
      async (error) => {
        if (isLoggingOut.current) return Promise.reject(error);

        if (error.response?.status === 401) {
            Logger.warn('401 detected, signing out...');
            await signOut();
        }
        return Promise.reject(error);
      }
    );

    async function loadStorageData() {
      try {
        const token = await SecureStore.getItemAsync('token');
        
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const success = await fetchMe();
            if (!success) {
                await signOut();
            } else {
                 registerForPushNotificationsAsync().catch(e => Logger.error('Push reg error:', e));
            }
        } else {
            setAuth(prev => ({ ...prev, loading: false }));
        }
      } catch (e) {
        Logger.error('Error loading storage data:', e);
        setAuth(prev => ({ ...prev, loading: false }));
      }
    }

    loadStorageData();

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, []);

  async function signIn(email: string, pass: string) {
    try {
        const response = await api.post('/auth/login', { email, password: pass });
        const { token } = response.data;
        
        if (token) {
            await SecureStore.setItemAsync('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            const success = await fetchMe();
            if (!success) {
                throw new Error('Falha ao obter perfil do usuário');
            }
            
            registerForPushNotificationsAsync().catch(e => console.log('Push reg error:', e));
        } else {
            throw new Error('Token não recebido');
        }
    } catch (error) {
        throw error;
    }
  }

  async function signUp(data: any) {
    try {
        const response = await api.post('/auth/register', data);
        const { token } = response.data;

        if (token) {
            await SecureStore.setItemAsync('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const success = await fetchMe();
            if (!success) {
                throw new Error('Falha ao obter perfil após cadastro');
            }

            registerForPushNotificationsAsync().catch(e => Logger.error('Push reg error:', e));
        } else {
             throw new Error('Cadastro realizado, mas falha no login automático.');
        }
    } catch (error) {
        throw error;
    }
  }
  
  const refetchUser = async () => {
      await fetchMe();
  }

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        signIn,
        signUp,
        signOut,
        refetchUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
