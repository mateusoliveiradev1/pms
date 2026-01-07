import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (error) {
      // Ignore error in Expo Go
      console.log('Error setting notification channel (likely Expo Go limitation):', error);
    }
  }

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  
  try {
    // Check if running in Expo Go to avoid "functionality removed" error
    if (Constants.appOwnership === 'expo') {
        console.log('Skipping Push Notification registration in Expo Go.');
        return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId, 
    });
    const token = tokenData.data;
    
    // Send to backend
    await api.post('/auth/push-token', { token });
    
    return token;
  } catch (error: any) {
    // Suppress specific errors that are expected during development in Expo Go
    if (error?.message?.includes('No "projectId" found') || error?.message?.includes('removed from Expo Go')) {
        console.log('Push Notifications are skipped (Expo Go / No Project ID). This is expected in development.');
        return null;
    }
    console.log('Error getting push token', error);
    return null;
  }
}
