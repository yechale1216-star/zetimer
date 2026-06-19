import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';

let app: App | undefined;

// Initialize firebase admin with env variables
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const existingApps = getApps();
    
    if (existingApps.length === 0) {
      app = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('[NotificationService] Firebase Admin initialized');
    } else {
      app = existingApps[0];
    }
  } catch (e) {
    console.error('[NotificationService] Failed to initialize Firebase Admin:', e);
  }
}

/**
 * Sends a push notification to a specific user device.
 * Used for new messages and incoming calls.
 */
export async function sendPushNotification(
  token: string, 
  title: string, 
  body: string, 
  data: Record<string, string> = {}
) {
  const activeApp = app || (getApps().length > 0 ? getApps()[0] : undefined);
  
  if (!activeApp) {
    console.warn('[NotificationService] Firebase Admin not initialized. Skipping push.');
    return;
  }
  
  const message: Message = {
    notification: { title, body },
    data: { 
      ...data, 
      click_action: 'FLUTTER_NOTIFICATION_CLICK', 
      type: data.type || 'message' 
    },
    token: token,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'calls'
      }
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
          sound: 'default'
        }
      }
    }
  };

  try {
    const messaging = getMessaging(activeApp);
    const response = await messaging.send(message);
    return response;
  } catch (error: any) {
    if (error.code === 'messaging/registration-token-not-registered') {
      console.warn('[NotificationService] Token is no longer valid');
      return 'EXPIRED_TOKEN';
    }
    console.error('[NotificationService] Error sending push notification:', error);
  }
}
