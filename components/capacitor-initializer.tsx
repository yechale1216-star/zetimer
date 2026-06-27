'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NativeBridge } from '@/lib/utils/native-bridge'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

export function CapacitorInitializer() {
  const router = useRouter()
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

      // Ensure splash screen hides
      SplashScreen.hide()
    }
  }, [router])

  return null
}
