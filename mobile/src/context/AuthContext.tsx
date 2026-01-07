import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/PushNotificationService';

interface AuthContextData {
  signed: boolean;
  user: object | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      const storagedUser = await SecureStore.getItemAsync('user');
      const storagedToken = await SecureStore.getItemAsync('token');

      if (storagedUser && storagedToken) {
        api.defaults.headers['Authorization'] = `Bearer ${storagedToken}`;
        setUser(JSON.parse(storagedUser));
        // Refresh push token on app load if logged in
        registerForPushNotificationsAsync().catch(console.log);
      }
      setLoading(false);
    }

    loadStorageData();
  }, []);

  async function signIn(email: string, pass: string) {
    const response = await api.post('/auth/login', {
      email,
      password: pass,
    });

    const { token, user } = response.data;

    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(user));

    api.defaults.headers['Authorization'] = `Bearer ${token}`;
    setUser(user);
    
    // Register for push notifications
    registerForPushNotificationsAsync().catch(console.log);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
