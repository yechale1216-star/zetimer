import { Camera, CameraResultType } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { notifications } from '@/lib/utils/notifications';
import { registerPlugin } from '@capacitor/core';

interface CallPlugin {
  endCall: () => Promise<void>;
  startRinging: (options: {
    callerName: string;
    callId?: string;
    callerId?: string;
    callType?: string;
    serverUrl?: string;
  }) => Promise<void>;
  showCallBanner: (options: {
    callerName: string;
    callId?: string;
    callerId?: string;
    callType?: string;
    serverUrl?: string;
  }) => Promise<void>;
  dismissCallBanner: () => Promise<void>;
  saveAuthToken: (options: { token: string }) => Promise<void>;
  getPendingCall: () => Promise<{
    hasPending: boolean;
    action?: string;
    type?: string;
    route?: string;
    conversationId?: string;
    studentId?: string;
    schoolId?: string;
    callId?: string;
    callerId?: string;
    callerName?: string;
    callType?: string;
  }>;
  addListener: (
    eventName: 'onCallAction' | 'onForegroundNotification',
    listenerFunc: (data: any) => void
  ) => Promise<any>;
  requestPermissions: (options?: { permissions: string[] }) => Promise<any>;
  checkPermissions: () => Promise<any>;
}

const CallPlugin = registerPlugin<CallPlugin>('CallPlugin');

export const NativeBridge = {
  isNative: () => Capacitor.isNativePlatform(),

  // Saves JWT token to native SharedPreferences
  saveAuthToken: async (token: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CallPlugin.saveAuthToken({ token });
      } catch (e) {
        console.warn('[NativeBridge] saveAuthToken failed', e);
      }
    }
  },

  // Deep Link Handling
  initDeepLinks: (router: any) => {
    if (!Capacitor.isNativePlatform()) return;
    
    App.addListener('appUrlOpen', (event: any) => {
      const slug = event.url.split('.app').pop() || event.url.split('.com').pop();
      if (slug) {
        router.push(slug);
      }
    });
  },

  // Network Sensitivity
  initNetworkListener: () => {
    if (!Capacitor.isNativePlatform()) return;
    
    Network.addListener('networkStatusChange', status => {
      if (!status.connected) {
        notifications.warning("Offline Mode", "You are currently offline. Some features may be limited.");
      }
    });
  },

  // Haptics (Vibrational Feedback)
  vibrate: async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (e) {
        console.warn('Haptics not available');
      }
    }
  },

  // Camera Integration
  takePhoto: async () => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Camera only available on native device');
    }
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri
    });
    return image.webPath;
  },

  // Push Notifications Setup
  // CRITICAL: This registers for FCM and SAVES the token to the backend.
  // Without saving the token, the server has no way to send targeted push notifications.
  initPush: async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive !== 'granted') {
        console.warn('[NativeBridge] Push permission denied by user');
        return;
      }

      await PushNotifications.register();

      // ── Token Handler ────────────────────────────────────────────────────
      // Called on first launch and whenever FCM refreshes the token.
      // We MUST send this to the backend or no server-side push will ever work.
      PushNotifications.addListener('registration', async (token) => {
        console.log('[NativeBridge] FCM token received:', token.value);
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://zetime-backend.onrender.com';
          const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('attendance_token') : null;
          
          if (authToken) {
            // Also sync the token to Java so background FCM receiver can use it on refresh
            await NativeBridge.saveAuthToken(authToken);
          }
          
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }
          
          const res = await fetch(`${API_URL}/api/auth/push-token`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ token: token.value }),
          });
          if (res.ok) {
            console.log('[NativeBridge] ✅ FCM token saved to server');
          } else {
            const text = await res.text().catch(() => '');
            console.warn('[NativeBridge] Server rejected FCM token:', res.status, text);
          }
        } catch (e) {
          console.error('[NativeBridge] Failed to POST FCM token to server:', e);
        }
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('[NativeBridge] FCM registration error:', JSON.stringify(error));
      });

      // ── Foreground Push (Capacitor fallback) ─────────────────────────────
      // When the app is open, Capacitor intercepts the push before Android shows it.
      // We fire the in-app banner manually here.
      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('[NativeBridge] Push received in foreground:', notification);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zetime:in_app_notification', {
            detail: {
              type: notification.data?.type || 'general',
              title: notification.title || 'Zetime',
              body: notification.body || '',
              route: notification.data?.route,
              conversationId: notification.data?.conversationId,
              studentId: notification.data?.studentId,
              schoolId: notification.data?.schoolId,
            }
          }));
        }
      });

      // ── Notification Tap (background → app open) ──────────────────────
      PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
        console.log('[NativeBridge] Notification tapped:', action);
        const data = action.notification?.data;
        if (data && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zetime:navigate', {
            detail: {
              type: data.type,
              route: data.route,
              conversationId: data.conversationId,
              studentId: data.studentId,
              schoolId: data.schoolId,
            }
          }));
        }
      });

    } catch (e) {
      console.warn('[NativeBridge] Push notification system could not be initialized:', e);
    }
  },

  // Filesystem Exports (CSV/Reports/PDFs)
  saveAndShareFile: async (fileName: string, data: string, mimeType: string, isBase64 = false) => {
    if (!Capacitor.isNativePlatform()) {
      const blob = isBase64 
        ? await (await fetch(`data:${mimeType};base64,${data}`)).blob()
        : new Blob([data], { type: mimeType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      return;
    }

    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: data,
        directory: Directory.Documents,
        encoding: isBase64 ? undefined : 'utf8' as any
      });
      console.log('File written: ', result.uri);
      return result.uri;
    } catch (e) {
      console.error('Error writing file', e);
    }
  },

  // Call System Integrations
  getPendingCall: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        return await CallPlugin.getPendingCall();
      } catch (e) {
        console.warn('CallPlugin: getPendingCall failed', e);
      }
    }
    return { hasPending: false };
  },

  requestPermissions: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('[NativeBridge] Requesting permissions for call...');
        const res = await CallPlugin.requestPermissions({ permissions: ['camera', 'microphone'] });
        console.log('[NativeBridge] Permissions result:', res);
        return res;
      } catch (e) {
        console.warn('CallPlugin: requestPermissions failed', e);
      }
    }
    return null;
  },

  endNativeCall: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CallPlugin.endCall();
      } catch (e) {
        console.warn('CallPlugin: endCall failed', e);
      }
    }
  },

  startNativeRinging: async (callerName: string, callId?: string, callerId?: string, callType?: string, serverUrl?: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CallPlugin.startRinging({ callerName, callId, callerId, callType, serverUrl });
      } catch (e) {
        console.warn('CallPlugin: startRinging failed', e);
      }
    }
  },

  showCallBanner: async (callerName: string, callId?: string, callerId?: string, callType?: string, serverUrl?: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CallPlugin.showCallBanner({ callerName, callId, callerId, callType, serverUrl });
      } catch (e) {
        console.warn('CallPlugin: showCallBanner failed', e);
      }
    }
  },

  dismissCallBanner: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CallPlugin.dismissCallBanner();
      } catch (e) {
        console.warn('CallPlugin: dismissCallBanner failed', e);
      }
    }
  },

  addCallActionListener: (callback: (data: any) => void) => {
    if (Capacitor.isNativePlatform()) {
      return CallPlugin.addListener('onCallAction', (data: any) => {
        if (data.action === 'NAVIGATE') {
          window.dispatchEvent(new CustomEvent('zetime:navigate', {
            detail: {
              type: data.type,
              route: data.route,
              conversationId: data.conversationId,
              studentId: data.studentId,
              schoolId: data.schoolId
            }
          }));
        } else {
          callback(data);
        }
      });
    }
    return null;
  },

  addForegroundNotificationListener: (callback: (data: any) => void) => {
    if (Capacitor.isNativePlatform()) {
      return CallPlugin.addListener('onForegroundNotification', (data: any) => {
        callback(data);
      });
    }
    return null;
  }
};
