import Constants from 'expo-constants';
import { Logger } from '../utils/logger';

const extra = Constants.expoConfig?.extra || {};

export const ENV = {
  API_URL: (extra.apiUrl as string) || process.env.EXPO_PUBLIC_API_URL || 'https://pms-backend-qalb.onrender.com/api',
  APP_ENV: (extra.env as 'development' | 'staging' | 'production') || process.env.EXPO_PUBLIC_APP_ENV || 'production',
  STRIPE_PUBLISHABLE_KEY: (extra.stripePublishableKey as string) || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RLGC3KtggvJaK6ZphzRGeO1n4fy1OtFWydT20Qnx4nDCuNzQqespU3qLOoAhX7qEaAYw6ThRtTpAsTL5o8W86Hd00SLxeFJmz',
};

// Security Check
if (ENV.APP_ENV === 'production' && ENV.API_URL) {
  if (ENV.API_URL.includes('localhost') || ENV.API_URL.includes('192.168.')) {
     Logger.error('SECURITY WARNING: Production environment is using a local API URL.', { url: ENV.API_URL });
  }
}
