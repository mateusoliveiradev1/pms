import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import Routes from './src/navigation/Routes';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';
import { ENV } from './src/config/env';

// Manter a splash screen nativa visível enquanto carregamos recursos
SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <StripeProvider
      publishableKey={ENV.STRIPE_PUBLISHABLE_KEY}
    >
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Routes />
        </AuthProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
