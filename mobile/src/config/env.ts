import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const ENV = {
  API_URL: (extra.apiUrl as string) || 'http://192.168.3.118:3000/api',
  APP_ENV: (extra.env as 'development' | 'staging' | 'production') || 'development',
};
