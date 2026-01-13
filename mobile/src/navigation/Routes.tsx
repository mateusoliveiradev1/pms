import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useAuthRole } from '../hooks/useAuthRole';
import { Ionicons } from '@expo/vector-icons';
import AppSplashScreen from '../screens/SplashScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';

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
  PendingApproval: undefined;
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
          } else if (route.name === 'Notificações') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'BI Financeiro') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
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
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Pedidos" component={OrdersListScreen} />
            <Tab.Screen name="Produtos" component={ProductsListScreen} />
            <Tab.Screen name="Perfil" component={SettingsScreen} />
        </>
      )}

      {/* 2. SUPPLIER_ADMIN */}
      {isSupplierAdmin && (
        <>
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Pedidos" component={OrdersListScreen} />
            <Tab.Screen name="Produtos" component={ProductsListScreen} />
            <Tab.Screen name="Financeiro" component={FinancialScreen} />
            <Tab.Screen name="Relatórios" component={ReportsScreen} />
            <Tab.Screen name="Perfil" component={SettingsScreen} />
        </>
      )}

      {/* 3. ACCOUNT_ADMIN */}
      {isAccountAdmin && (
        <>
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Pedidos" component={OrdersListScreen} />
            <Tab.Screen name="Produtos" component={ProductsListScreen} />
            <Tab.Screen name="Suppliers" component={SuppliersStack} />
            <Tab.Screen name="Financeiro" component={AdminFinancialScreen} />
            <Tab.Screen name="Relatórios" component={ReportsScreen} />
            <Tab.Screen name="Configurações" component={SettingsScreen} />
        </>
      )}

      {/* 4. SYSTEM_ADMIN - Reverted to Tabs as requested */}
      {isSystemAdmin && (
        <>
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Pedidos" component={OrdersListScreen} />
            <Tab.Screen name="Suppliers" component={SuppliersStack} />
            <Tab.Screen name="BI Financeiro" component={AdminBIFinancialScreen} />
            <Tab.Screen name="Saúde" component={HealthMonitorScreen} />
            <Tab.Screen name="Relatórios" component={ReportsScreen} />
            <Tab.Screen name="Configurações" component={SettingsScreen} />
        </>
      )}
      
      {/* Fallback for Normal Users (Matches Screenshot 2) */}
      {!isSupplierUser && !isSupplierAdmin && !isAccountAdmin && !isSystemAdmin && (
         <>
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Pedidos" component={OrdersListScreen} />
            <Tab.Screen name="Fornecedores" component={SuppliersStack} />
            <Tab.Screen name="Notificações" component={NotificationsScreen} />
            <Tab.Screen name="Relatórios" component={ReportsScreen} />
            <Tab.Screen name="Ajustes" component={SettingsScreen} />
         </>
      )}

    </Tab.Navigator>
  );
}

const Routes = () => {
  const { isAuthenticated, loading } = useAuth();
  const { requiresOnboarding, isSupplierPending } = useAuthRole();

  if (loading) {
    return <AppSplashScreen />;
  }

  // Handle Token Expiry/Logout State explicitly
  if (!isAuthenticated) {
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
              {/* Main App Tabs for Everyone */}
              <Stack.Screen name="AppTabs" component={AppTabs} />
              
              {/* Global Screens (Pushable from any Tab) */}
              <Stack.Screen name="ProductForm" component={ProductFormScreen} />
              <Stack.Screen name="ProductsList" component={ProductsListScreen} />
              <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
              <Stack.Screen name="OrderForm" component={OrderFormScreen} />
              <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
              
              {/* Screens that might be accessed from Dashboard Cards */}
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
