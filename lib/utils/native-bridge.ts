import { Camera, CameraResultType } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const NativeBridge = {
  isNative: () => Capacitor.isNativePlatform(),

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

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive === 'granted') {
      await PushNotifications.register();
    }

    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Here you would typically send the token to your backend
    });

    PushNotifications.addListener('registrationError', (error: any) => {
       console.error('Error on registration: ' + JSON.stringify(error));
    });
  },

  // Filesystem Exports (CSV/Reports)
  saveAndShareFile: async (fileName: string, data: string, mimeType: string) => {
    if (!Capacitor.isNativePlatform()) {
      // Browser fallback (standard download)
      const blob = new Blob([data], { type: mimeType });
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
        encoding: 'utf8' as any
      });
      
      console.log('File written: ', result.uri);
      // You can add sharing logic here if needed
      return result.uri;
    } catch (e) {
      console.error('Error writing file', e);
    }
  }
};
