import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import SplashScreen from '../screens/SplashScreen';

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

import SuppliersListScreen from '../screens/Suppliers/SuppliersListScreen';
import SupplierFormScreen from '../screens/Suppliers/SupplierFormScreen';
import ProductFormScreen from '../screens/Products/ProductFormScreen';
import ProductsListScreen from '../screens/Products/ProductsListScreen';
import ProductDetailsScreen from '../screens/Products/ProductDetailsScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  AppTabs: undefined;
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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Pedidos') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Fornecedores') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Notificações') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Relatórios') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Ajustes') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Pedidos" component={OrdersListScreen} />
      <Tab.Screen name="Fornecedores" component={SuppliersStack} />
      <Tab.Screen name="Notificações" component={NotificationsScreen} />
      <Tab.Screen name="Relatórios" component={ReportsScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const Routes = () => {
  const { signed, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {signed ? (
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
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Routes;
