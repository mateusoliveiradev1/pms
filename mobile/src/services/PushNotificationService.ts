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
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    // console.log('Must use physical device for Push Notifications');
    // return null;
    // For Simulator testing, we might just return null or handle gracefully
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    // console.log('Failed to get push token for push notification!');
    return null;
  }

  // Learn more about projectId:
  // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  
  try {
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
