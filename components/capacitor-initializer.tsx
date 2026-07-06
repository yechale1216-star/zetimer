'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NativeBridge } from '@/lib/utils/native-bridge'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

export function CapacitorInitializer() {
  const router = useRouter()

  useEffect(() => {
    const handleNavigateEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('[CapacitorInitializer] Received navigate event:', detail);
      if (detail && detail.route) {
        router.push(detail.route);
      } else if (detail && detail.type === 'new_message' && detail.conversationId) {
        router.push(`/parent/communication`);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('zetime:open_conversation', {
            detail: { conversationId: detail.conversationId }
          }));
        }, 300);
      }
    };

    window.addEventListener('zetime:navigate', handleNavigateEvent);
    return () => {
      window.removeEventListener('zetime:navigate', handleNavigateEvent);
    };
  }, [router]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('Zetime: Native Platform Detected. Initializing Bridge...')
      
      // Initialize Native Features
      NativeBridge.initPush().catch(err => {
        console.warn('Push initialization failed:', err)
      })

      // Deep Linking & Network Monitoring
      NativeBridge.initDeepLinks(router)
      NativeBridge.initNetworkListener()

      // Listen to foreground notifications from native push service
      let foregroundSub: any = null;
      try {
        foregroundSub = NativeBridge.addForegroundNotificationListener((data: any) => {
          console.log('[Native] Foreground notification received:', data);
          window.dispatchEvent(new CustomEvent('zetime:in_app_notification', {
            detail: {
              type: data.type,
              title: data.title || 'Zetime Notification',
              body: data.body || 'You have a new update',
              route: data.route,
              conversationId: data.conversationId,
              studentId: data.studentId,
              schoolId: data.schoolId,
              badge: data.badge
            }
          }));
        });
      } catch (err) {
        console.warn('Failed to listen to native foreground notifications:', err);
      }

      // Ensure splash screen hides
      SplashScreen.hide()

      return () => {
        if (foregroundSub) {
          foregroundSub.then((s: any) => s?.remove()).catch(() => {});
        }
      };
    }
  }, [router])

  return null
}
