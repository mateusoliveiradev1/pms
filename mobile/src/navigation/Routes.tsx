import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import SplashScreen from '../screens/SplashScreen';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderFormScreen from '../screens/Orders/OrderFormScreen';
import OrderDetailsScreen from '../screens/Orders/OrderDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

import SuppliersListScreen from '../screens/Suppliers/SuppliersListScreen';
import SupplierFormScreen from '../screens/Suppliers/SupplierFormScreen';
import ProductFormScreen from '../screens/Products/ProductFormScreen';
import ProductsListScreen from '../screens/Products/ProductsListScreen';

const Stack = createNativeStackNavigator();
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
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Pedidos" component={OrdersScreen} />
      <Tab.Screen name="Fornecedores" component={SuppliersStack} />
      <Tab.Screen name="Notificações" component={NotificationsScreen} />
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
            <Stack.Screen name="OrderForm" component={OrderFormScreen} />
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Routes;
