"use client"

import { useOnline } from "@/hooks/use-online"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff, Wifi } from "lucide-react"
import { useEffect, useState } from "react"

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnline()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShow(true)
    } else {
      setShow(false)
    }
  }, [isOnline])

  if (!show) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-sm animate-in slide-in-from-top-2">
        {!isOnline && (
          <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800 shadow-lg rounded-lg">
            <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="typography-label text-orange-800 dark:text-orange-200">
              You're offline. Changes will sync when you're back online.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
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
