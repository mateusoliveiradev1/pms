import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/PushNotificationService';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextData {
  signed: boolean;
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storagedUser = await SecureStore.getItemAsync('user');
        const storagedToken = await SecureStore.getItemAsync('token');

        if (storagedUser && storagedToken) {
          try {
            const parsedUser = JSON.parse(storagedUser);
            if (parsedUser && parsedUser.id) {
                api.defaults.headers['Authorization'] = `Bearer ${storagedToken}`;
                setUser(parsedUser);
                // Refresh push token on app load if logged in
                registerForPushNotificationsAsync().catch(e => console.log('Push reg error (ignored):', e));
            } else {
                console.log('Invalid user data in storage, clearing...');
                await signOut();
            }
          } catch (parseError) {
             console.log('Error parsing stored user:', parseError);
             await signOut();
          }
        }
      } catch (e) {
        console.log('Error loading storage data:', e);
      } finally {
        setLoading(false);
      }
    }

    loadStorageData();
  }, []);

  async function signIn(email: string, pass: string) {
    const response = await api.post('/auth/login', {
      email,
      password: pass,
    });

    const { token, user } = response.data;

    if (token && user) {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));

        api.defaults.headers['Authorization'] = `Bearer ${token}`;
        setUser(user);
        
        // Register for push notifications
        registerForPushNotificationsAsync().catch(e => console.log('Push reg error:', e));
    } else {
        throw new Error('Invalid response from server');
    }
  }

  async function signUp(data: any) {
    const response = await api.post('/auth/register', data);
    const { token, user } = response.data;

    if (token && user) {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));

        api.defaults.headers['Authorization'] = `Bearer ${token}`;
        setUser(user);

        registerForPushNotificationsAsync().catch(e => console.log('Push reg error:', e));
    } else {
         // Se criou mas não retornou token (ex: pendente confirmação, embora eu tenha ativado auto-confirm)
         throw new Error('Cadastro realizado, mas falha no login automático. Tente entrar.');
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
