'use client'

import { useEffect } from 'react'
import { NativeBridge } from '@/lib/utils/native-bridge'
import { Capacitor } from '@capacitor/core'

export function CapacitorInitializer() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('Zetime: Native Platform Detected. Initializing Bridge...')
      
      // Initialize Push Notifications
      NativeBridge.initPush().catch(err => {
        console.error('Push Init Failed:', err)
      })

      // Set status bar behavior if needed
      // (This usually requires @capacitor/status-bar)
    }
  }, [])

  return null
}
