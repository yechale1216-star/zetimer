"use client"

import { useEffect } from "react"
import { useOnline } from "@/hooks/use-online"
import { syncQueue } from "@/lib/db/sync-queue"

export function SyncManager() {
  const { isOnline } = useOnline()

  useEffect(() => {
    if (isOnline && syncQueue) {
      // Process queued operations when coming back online
      syncQueue.process()
    }
  }, [isOnline])

  return null
}

