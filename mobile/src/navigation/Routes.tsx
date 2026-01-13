import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useAuthRole } from '../hooks/useAuthRole';
import { Ionicons } from '@expo/vector-icons';
import AppSplashScreen from '../screens/SplashScreen';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import OrdersListScreen from '../screens/Orders/OrdersListScreen';
import OrderFormScreen from '../screens/Orders/OrderFormScreen';
import OrderDetailsScreen from '../screens/Orders/OrderDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import FinancialScreen from '../screens/Financial/FinancialScreen';
import AdminFinancialScreen from '../screens/Financial/AdminFinancialScreen';
import AdminBIFinancialScreen from '../screens/Financial/AdminBIFinancialScreen';
import AdminIntegrationsScreen from '../screens/Integrations/AdminIntegrationsScreen';
import HealthMonitorScreen from '../screens/Monitor/HealthMonitorScreen';

import SuppliersListScreen from '../screens/Suppliers/SuppliersListScreen';
import SupplierFormScreen from '../screens/Suppliers/SupplierFormScreen';
import ProductFormScreen from '../screens/Products/ProductFormScreen';
import ProductsListScreen from '../screens/Products/ProductsListScreen';
import ProductDetailsScreen from '../screens/Products/ProductDetailsScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  AppTabs: undefined;
  SupplierOnboarding: { onboardingMode?: boolean } | undefined;
  Login: undefined;
  Register: undefined;
  ProductForm: { productId?: string } | undefined;
  ProductsList: { filter?: string } | undefined;
  ProductDetails: { productId: string };
  OrderForm: { orderId?: string } | undefined;
  OrderDetails: { orderId: string };
  Reports: undefined;
  Financial: undefined;
  AdminFinancial: undefined;
  AdminFinancialBI: undefined;
  AdminIntegrations: undefined;
  HealthMonitor: undefined;
  Receipt: { entry: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const SuppliersStackNav = createNativeStackNavigator();

function SuppliersStack() {
    return (
        <SuppliersStackNav.Navigator screenOptions={{ headerShown: false }}>
            <SuppliersStackNav.Screen name="SuppliersList" component={SuppliersListScreen} />
            <SuppliersStackNav.Screen name="SupplierForm" component={SupplierFormScreen} />
        </SuppliersStackNav.Navigator>
    );
}

function AppTabs() {
  const { 
    isSupplierUser, 
    isSupplierAdmin, 
    isAccountAdmin, 
    isSystemAdmin 
  } = useAuthRole();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          // Map Route Names to Icons
          if (route.name === 'Visão Global' || route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Pedidos') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Produtos') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Fornecedores' || route.name === 'Suppliers') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Financeiro' || route.name === 'Financeiro Global') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'Métricas' || route.name === 'Relatórios') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Ajustes' || route.name === 'Configurações' || route.name === 'Perfil') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else if (route.name === 'Sistema') {
            iconName = focused ? 'server' : 'server-outline';
          } else if (route.name === 'Saúde') {
            iconName = focused ? 'pulse' : 'pulse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      {/* 1. SUPPLIER_USER */}
      {isSupplierUser && (
        <>
            <Tab.Screen name="Pedidos" component={OrdersListScreen} />
            <Tab.Screen name="Produtos" component={ProductsListScreen} />
            <Tab.Screen name="Perfil" component={SettingsScreen} />
        </>
      )}

      {/* 2. SUPPLIER_ADMIN */}
      {isSupplierAdmin && (
        <>
            <Tab.Screen name="Pedidos" component={OrdersListScreen} />
            <Tab.Screen name="Produtos" component={ProductsListScreen} />
            <Tab.Screen name="Financeiro" component={FinancialScreen} />
            <Tab.Screen name="Métricas" component={ReportsScreen} />
            <Tab.Screen name="Perfil" component={SettingsScreen} />
        </>
      )}

      {/* 3. ACCOUNT_ADMIN */}
      {isAccountAdmin && (
        <>
            <Tab.Screen name="Pedidos" component={OrdersListScreen} />
            <Tab.Screen name="Suppliers" component={SuppliersStack} />
            <Tab.Screen name="Financeiro" component={AdminFinancialScreen} />
            <Tab.Screen name="Métricas" component={ReportsScreen} />
            <Tab.Screen name="Configurações" component={SettingsScreen} />
        </>
      )}

      {/* 4. SYSTEM_ADMIN */}
      {isSystemAdmin && (
        <>
            <Tab.Screen name="Visão Global" component={DashboardScreen} />
            {/* Using SuppliersStack for "Contas" placeholder or actual Suppliers list? 
                Prompt says: "Contas", "Suppliers".
                I will put SuppliersStack for "Suppliers".
                For "Contas", I don't have a screen. I will omit it to avoid broken nav, 
                or duplicate SuppliersStack if that's what was intended (unlikely). 
                I'll stick to what I have: Dashboard, Suppliers, AdminFinancial, Health/System. 
            */}
            <Tab.Screen name="Suppliers" component={SuppliersStack} />
            <Tab.Screen name="Financeiro Global" component={AdminFinancialScreen} />
            <Tab.Screen name="Sistema" component={HealthMonitorScreen} />
        </>
      )}
      
      {/* Fallback if no role matched (shouldn't happen if auth works, but good safety) */}
      {!isSupplierUser && !isSupplierAdmin && !isAccountAdmin && !isSystemAdmin && (
         <Tab.Screen name="Dashboard" component={DashboardScreen} />
      )}

    </Tab.Navigator>
  );
}

const Routes = () => {
  const { signed, loading } = useAuth();
  const { requiresOnboarding, isSupplierPending } = useAuthRole();

  if (loading) {
    return <AppSplashScreen />;
  }

  // Handle Token Expiry/Logout State explicitly
  if (!signed) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (isSupplierPending) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
          {requiresOnboarding ? (
            <Stack.Screen
              name="SupplierOnboarding"
              component={SupplierFormScreen}
              initialParams={{ onboardingMode: true }}
            />
          ) : (
            <>
              <Stack.Screen name="AppTabs" component={AppTabs} />
              <Stack.Screen name="ProductForm" component={ProductFormScreen} />
              <Stack.Screen name="ProductsList" component={ProductsListScreen} />
              <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
              <Stack.Screen name="OrderForm" component={OrderFormScreen} />
              <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
              <Stack.Screen name="Reports" component={ReportsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Financial" component={FinancialScreen} options={{ headerShown: false }} />
              <Stack.Screen name="AdminFinancial" component={AdminFinancialScreen} options={{ headerShown: false }} />
              <Stack.Screen name="AdminIntegrations" component={AdminIntegrationsScreen} options={{ title: 'Integrações' }} />
            </>
          )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Routes;
