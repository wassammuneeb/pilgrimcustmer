import messaging from '@react-native-firebase/messaging';
import axiosInstance from '../axiosInstance';
import { Alert } from 'react-native';

export const requestAndSendFcmToken = async () => {
  try {
    const authStatus = await messaging().requestPermission();
    console.log('🔍 FCM authStatus:', authStatus);

    const enabled = 
      authStatus === messaging.AuthorizationStatus.AUTHORIZED || 
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('🚫 FCM Permission denied');
      return;
    }

    const fcmToken = await messaging().getToken();
    console.log('✅ FCM TOKEN:', fcmToken);

    await axiosInstance.post('fcm/token', { token: fcmToken });
    console.log('🚀 FCM token sent to backend!');
  } catch (err) {
    console.error('🔥 FCM Setup error:', err.message);
    Alert.alert('Notification Error', 'Could not setup push notifications');
  }
};
