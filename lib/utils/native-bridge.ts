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
  startRinging: (options: { callerName: string }) => Promise<void>;
  getPendingCall: () => Promise<{
    hasPending: boolean;
    action?: string;
    callId?: string;
    callerId?: string;
    callerName?: string;
    callType?: string;
  }>;
  addListener: (eventName: 'onCallAction', listenerFunc: (data: { action: string, callId?: string, conversationId?: string }) => void) => Promise<any>;
}

const CallPlugin = registerPlugin<CallPlugin>('CallPlugin');

export const NativeBridge = {
  isNative: () => Capacitor.isNativePlatform(),

  // Deep Link Handling
  initDeepLinks: (router: any) => {
    if (!Capacitor.isNativePlatform()) return;
    
    App.addListener('appUrlOpen', (event: any) => {
      // Example: https://zetime.app/parent/announcements -> /parent/announcements
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
      // "Back Online" is handled by the UI indicator instead of a toast
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
  initPush: async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive === 'granted') {
        await PushNotifications.register();
      }

      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
         console.error('Error on registration: ' + JSON.stringify(error));
      });
    } catch (e) {
      console.warn('Native Push Notification system could not be initialized:', e);
    }
  },

  // Filesystem Exports (CSV/Reports/PDFs)
  saveAndShareFile: async (fileName: string, data: string, mimeType: string, isBase64 = false) => {
    if (!Capacitor.isNativePlatform()) {
      // Browser fallback (standard download)
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

  endNativeCall: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CallPlugin.endCall();
      } catch (e) {
        console.warn('CallPlugin: endCall failed', e);
      }
    }
  },

  startNativeRinging: async (callerName: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await CallPlugin.startRinging({ callerName });
      } catch (e) {
        console.warn('CallPlugin: startRinging failed', e);
      }
    }
  },

  addCallActionListener: (callback: (action: string, callId: string) => void) => {
    if (Capacitor.isNativePlatform()) {
      return CallPlugin.addListener('onCallAction', (data: { action: string, callId?: string, conversationId?: string }) => {
        if (data.action === 'OPEN_CHAT' && data.conversationId && typeof window !== 'undefined') {
          // Route message notification taps directly via the DOM event bus
          window.dispatchEvent(new CustomEvent('zetime:open_conversation', {
            detail: { conversationId: data.conversationId },
          }));
        } else {
          callback(data.action, data.callId || '');
        }
      });
    }
    return null;
  }
};
