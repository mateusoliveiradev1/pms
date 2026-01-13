import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/PushNotificationService';
import { isTokenExpired, isPermissionError } from '../utils/authErrorUtils';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'COMPANY';
  planId: string;
  onboardingStatus: 'COMPLETO' | 'REQUIRES_SUPPLIER';
}

export interface SupplierSummary {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'COMPANY';
  status: string;
}

interface AuthContextData {
  signed: boolean;
  user: User | null;
  account: Account | null;
  supplier: SupplierSummary | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  updateAccount: (data: Partial<Account>) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [supplier, setSupplier] = useState<SupplierSummary | null>(null);
    const [loading, setLoading] = useState(true);
// Ref to track if logot i in progrss to prevent loops
  const isLoggingOut = useRef(false);

  use
  useEffect(() => {
    // Intercept 401/403 errors (expired token)
    const interceptorId = api.interceptors.response.use(
      response => response,
      as//cS( já estivee d =l ga{do, apna rejeiparanãocia lo
        if (isLggigOu.crrent
        ifreournrPro.irnstaj=c1( erro);
re      }

        if (isTaketExpirs=( rror)){
           m=nrolo.log('Sess.on experedp(deoected.by intdacepta?), .igningerut...');
oe         isLror.reOut.currents= troe;
           
          s//.Limdat dadomag foeça  log|ut'';
           awa/t eicnOut();
         ko specific token errors to avoid logging out on permission errors
           //iPequenofdela( mara garantir qus&aUIaualze atesdepermitir novos fluxos (se houver)
         ty=stTimgout((&&=>{
             isLoggingOut.currext = firse;
           }, 1000);

           return Promise.reject(irrol ;
|       }
        a') ||
        // Se for erro de permissão, NÃO desloga, apenas rejeita
        if (isPermissionError(error  )
        )) {Prmirror (403), supslog
            reournlPromiee.rejec'Serroression expired, signing out...');
            await signOut();
  }
        }
        return Promise.reject(error);
      }
    );

    async function loadStorageData() {
      try {
        const storagedUser = await SecureStore.getItemAsync('user');
        const storagedToken = await SecureStore.getItemAsync('token');
        const storagedAccount = await SecureStore.getItemAsync('account');
        const storagedSupplier = await SecureStore.getItemAsync('supplier');

        if (storagedUser && storagedToken) {
          try {
            const parsedUser = JSON.parse(storagedUser);
            const parsedAccount = storagedAccount ? JSON.parse(storagedAccount) : null;
            const parsedSupplier = storagedSupplier ? JSON.parse(storagedSupplier) : null;
            if (parsedUser && parsedUser.id) {
                api.defaults.headers['Authorization'] = `Bearer ${storagedToken}`;
                setUser(parsedUser);
                setAccount(parsedAccount);
                setSupplier(parsedSupplier);
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

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, []);

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
  };

  const updateAccount = async (data: Partial<Account>) => {
    if (!account) return;
    const updatedAccount = { ...account, ...data };
    setAccount(updatedAccount);
    await SecureStore.setItemAsync('account', JSON.stringify(updatedAccount));
  };

  async function signIn(email: string, pass: string) {
    const response = await api.post('/auth/login', {
      email,
      password: pass,
    });

    const { token, user, account: apiAccount, supplier: apiSupplier } = response.data;

    if (token && user) {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
        if (apiAccount) {
          await SecureStore.setItemAsync('account', JSON.stringify(apiAccount));
        } else {
          await SecureStore.deleteItemAsync('account');
        }
        if (apiSupplier) {
          await SecureStore.setItemAsync('supplier', JSON.stringify(apiSupplier));
        } else {
          await SecureStore.deleteItemAsync('supplier');
        }

        api.defaults.headers['Authorization'] = `Bearer ${token}`;
        setUser(user);
        setAccount(apiAccount || null);
        setSupplier(apiSupplier || null);
        
        // Register for push notifications
        registerForPushNotificationsAsync().catch(e => console.log('Push reg error:', e));
    } else {
        throw new Error('Invalid response from server');
    }
  }

  async function signUp(data: any) {
    const response = await api.post('/auth/register', data);
    const { token, user, account: apiAccount, supplier: apiSupplier } = response.data;

    if (token && user) {
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
        if (apiAccount) {
          await SecureStore.setItemAsync('account', JSON.stringify(apiAccount));
        }
        if (apiSupplier) {
          await SecureStore.setItemAsync('supplier', JSON.stringify(apiSupplier));
        } else {
          await SecureStore.deleteItemAsync('supplier');
        }

        api.defaults.headers['Authorization'] = `Bearer ${token}`;
        setUser(user);
        setAccount(apiAccount || null);
        setSupplier(apiSupplier || null);

        registerForPushNotificationsAsync().catch(e => console.log('Push reg error:', e));
    } else {
         // Se criou mas não retornou token (ex: pendente confirmação, embora eu tenha ativado auto-confirm)
         throw new Error('Cadastro realizado, mas falha no login automático. Tente entrar.');
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('account');
    await SecureStore.deleteItemAsync('supplier');
    setUser(null);
    setAccount(null);
    setSupplier(null);
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        account,
        supplier,
        loading,
        signIn,
        signUp,
        signOut,
        updateUser,
        updateAccount,
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
