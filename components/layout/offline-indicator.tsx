"use client"

import { useOnline } from "@/hooks/use-online"
import { Wifi, WifiOff } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

/**
 * YouTube-style connectivity banner:
 * - Offline: persistent dark banner at top
 * - Back online: brief green banner that auto-dismisses after 3s (shown only once per reconnect)
 */
export function OfflineIndicator() {
  const { isOnline } = useOnline()
  const [showBackOnline, setShowBackOnline] = useState(false)
  const prevOnlineRef = useRef<boolean | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Skip the very first render (initial mount — we don't fire on page load)
    if (prevOnlineRef.current === null) {
      prevOnlineRef.current = isOnline
      return
    }

    const wasOffline = prevOnlineRef.current === false
    prevOnlineRef.current = isOnline

    if (isOnline && wasOffline) {
      // Show back-online banner once, then auto-dismiss
      setShowBackOnline(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setShowBackOnline(false), 3000)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isOnline])

  return (
    <AnimatePresence>
      {/* ── Back Online banner only (GlobalOfflineOverlay handles the offline wall) ── */}
      {showBackOnline && isOnline && (
        <motion.div
          key="back-online"
          initial={{ y: -44, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -44, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 bg-[#2e7d32] text-white text-[13px] font-medium h-11 px-4 shadow-lg"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Wifi className="h-4 w-4 shrink-0" />
          <span>Back online</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConnectionStatus() {
  const { isOnline } = useOnline()

  return (
    <div className="typography-body flex items-center gap-2">
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-muted-foreground">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-orange-600" />
          <span className="text-muted-foreground">Offline</span>
        </>
      )}
    </div>
  )
}
