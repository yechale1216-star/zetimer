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
      type: data.type || 'message',
      tag: data.tag || (data.type === 'call' ? 'incoming-call' : 'new-message')
    },
    token: token,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: data.type === 'call' ? 'calls' : 'messages',
        tag: data.tag || (data.type === 'call' ? 'incoming-call' : 'new-message')
      }
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
          sound: 'default',
          category: data.type === 'call' ? 'INCOMING_CALL' : undefined
        }
      }
    },
    webpush: {
      headers: {
        Urgency: 'high'
      },
      notification: {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || (data.type === 'call' ? 'incoming-call' : 'new-message'),
        renotify: true,
        requireInteraction: data.type === 'call'
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

/**
 * Sends a rich data-only FCM message for a new chat message.
 * Data-only ensures our Android native handler builds the notification
 * with full grouping, sound, preview, and chat-open action.
 */
export async function sendMessageNotification(
  token: string,
  payload: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    messagePreview: string;
    messageType: string;
  }
): Promise<string | undefined> {
  const activeApp = app || (getApps().length > 0 ? getApps()[0] : undefined);
  if (!activeApp) return;

  const preview = payload.messagePreview.length > 100
    ? payload.messagePreview.substring(0, 97) + '...'
    : payload.messagePreview;

  const message: Message = {
    data: {
      type: 'new_message',
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      senderName: payload.senderName,
      senderAvatar: payload.senderAvatar,
      messagePreview: preview,
      messageType: payload.messageType,
      tag: `chat-${payload.conversationId}`,
      timestamp: Date.now().toString(),
    },
    token,
    android: {
      priority: 'high',
      ttl: 86400000,
    },
    apns: {
      payload: {
        aps: { contentAvailable: true, sound: 'default', badge: 1 },
      },
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'background',
      },
    },
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        title: payload.senderName,
        body: preview,
        icon: payload.senderAvatar || '/icon-192.png',
        badge: '/icon-192.png',
        tag: `chat-${payload.conversationId}`,
        renotify: true,
      },
    },
  };

  try {
    const messaging = getMessaging(activeApp);
    const response = await messaging.send(message);
    return response;
  } catch (error: any) {
    if (error.code === 'messaging/registration-token-not-registered') {
      console.warn('[NotificationService] Message token expired');
      return 'EXPIRED_TOKEN';
    }
    console.error('[NotificationService] Error sending message notification:', error);
  }
}

/**
 * Sends a high-priority data-only notification to trigger a full-screen call UI.
 */
export async function sendCallNotification(
  token: string,
  data: {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    callType: 'VOICE' | 'VIDEO';
    serverUrl: string;
  }
) {
  const activeApp = app || (getApps().length > 0 ? getApps()[0] : undefined);
  if (!activeApp) return;

  const message: Message = {
    // SILENT DATA-ONLY MESSAGE
    data: {
      type: 'incoming_call',
      callId: data.callId,
      callerId: data.callerId,
      callerName: data.callerName,
      callerAvatar: data.callerAvatar || '',
      callType: data.callType,
      serverUrl: data.serverUrl,
    },
    token: token,
    android: {
      priority: 'high',
      ttl: 30000, 
    },
    // Required for some delivery contexts
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
          priority: 10,
        },
      },
    }
  };

  try {
    const messaging = getMessaging(activeApp);
    return await messaging.send(message);
  } catch (error) {
    console.error('[NotificationService] Error sending call notification:', error);
  }
}

/**
 * Sends a notification to cancel an ongoing call ring.
 */
export async function sendCallCancellation(token: string, callId: string) {
  const activeApp = app || (getApps().length > 0 ? getApps()[0] : undefined);
  if (!activeApp) return;

  const message: Message = {
    data: {
      type: 'cancel_call',
      callId,
    },
    token: token,
    android: {
      priority: 'high',
    }
  };

  try {
    const messaging = getMessaging(activeApp);
    return await messaging.send(message);
  } catch (error) {
    console.error('[NotificationService] Error sending call cancellation:', error);
  }
}

/**
 * Sends a structured, category-specific push notification to a user device.
 * Data-only payload ensures our Android native service handles channels, vibrate, and custom sound resources.
 */
export async function sendCategoryNotification(
  token: string,
  payload: {
    type: 'late_arrival' | 'absent_arrival' | 'excused_arrival' | 'new_announcement' | 'system_update' | 'account_security' | string;
    title: string;
    body: string;
    route?: string;
    studentId?: string;
    schoolId?: string;
    badge?: number;
    tag?: string;
  }
): Promise<string | undefined> {
  const activeApp = app || (getApps().length > 0 ? getApps()[0] : undefined);
  if (!activeApp) return;

  const dataPayload: Record<string, string> = {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    timestamp: Date.now().toString(),
  };

  if (payload.route) dataPayload.route = payload.route;
  if (payload.studentId) dataPayload.studentId = payload.studentId;
  if (payload.schoolId) dataPayload.schoolId = payload.schoolId;
  if (payload.badge !== undefined) dataPayload.badge = payload.badge.toString();
  if (payload.tag) dataPayload.tag = payload.tag;

  const message: Message = {
    data: dataPayload,
    token,
    android: {
      priority: 'high',
      ttl: 86400000,
    },
    apns: {
      payload: {
        aps: { 
          contentAvailable: true, 
          sound: 'default',
          badge: payload.badge 
        },
      },
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'background',
      },
    },
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.tag || payload.type,
        renotify: true,
      },
    },
  };

  try {
    const messaging = getMessaging(activeApp);
    const response = await messaging.send(message);
    return response;
  } catch (error: any) {
    if (error.code === 'messaging/registration-token-not-registered') {
      console.warn('[NotificationService] Category token expired');
      return 'EXPIRED_TOKEN';
    }
    console.error('[NotificationService] Error sending category notification:', error);
  }
}
