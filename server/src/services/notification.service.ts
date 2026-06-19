import * as admin from 'firebase-admin';

// Initialize firebase admin with env variables
// The user should provide FIREBASE_SERVICE_ACCOUNT as a JSON string in .env
if (process.env.FIREBASE_SERVICE_ACCOUNT && !admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[NotificationService] Firebase Admin initialized');
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
  if (!admin.apps.length) {
    console.warn('[NotificationService] Firebase Admin not initialized. Skipping push.');
    return;
  }
  
  const message: admin.messaging.Message = {
    notification: { title, body },
    data: { 
      ...data, 
      // This helps the mobile/PWA client handle the click
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
    const response = await admin.messaging().send(message);
    return response;
  } catch (error: any) {
    // If the token is invalid or expired, we should return null or handle it
    if (error.code === 'messaging/registration-token-not-registered') {
      console.warn('[NotificationService] Token is no longer valid');
      return 'EXPIRED_TOKEN';
    }
    console.error('[NotificationService] Error sending push notification:', error);
  }
}
