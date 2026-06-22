'use client'

import { useEffect } from 'react'
import { NativeBridge } from '@/lib/utils/native-bridge'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

export function CapacitorInitializer() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('Zetime: Native Platform Detected. Initializing Bridge...')
      
      // SKIP Push Notifications for now to prevent crash due to missing google-services.json
      /*
      NativeBridge.initPush().catch(err => {
        console.warn('Push initialization skipped (likely missing Firebase config):', err)
      }).finally(() => {
        // Hide splash screen after initialization attempts
        SplashScreen.hide()
      })
      */

      // Ensure splash screen hides
      SplashScreen.hide()
    }
  }, [])

  return null
}
