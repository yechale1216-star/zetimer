import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { requestPushNotificationPermission as requestWebToken } from '../firebase-client';

export async function registerPushNotifications() {
  if (!Capacitor.isNativePlatform()) {
    return await requestWebToken();
  }

  return new Promise<string | null>((resolve) => {
    // Request permission to use push notifications
    // iOS will prompt, Android 13+ will prompt
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        PushNotifications.register();
      } else {
        console.warn('[Push] Permission denied');
        resolve(null);
      }
    });

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token) => {
      console.log('[Push] Registered token:', token.value);
      resolve(token.value);
    });

    // Some error occurred
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[Push] Registration error:', error);
      resolve(null);
    });
  });
}
