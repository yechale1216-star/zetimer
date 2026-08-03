"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Capacitor } from "@capacitor/core"
import HomePage from "./home-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"
import { WebApplicationJsonLd } from "@/components/seo/json-ld"

export default function Page() {
  const router = useRouter()
  const [isNativeApp, setIsNativeApp] = useState<boolean | null>(null)

  useEffect(() => {
    const isNative =
      Capacitor.isNativePlatform() ||
      (typeof window !== "undefined" &&
        (window.location.protocol === "file:" ||
          !!(window as any).Capacitor?.isNativePlatform?.() ||
          !!(window as any).Capacitor?.isNative))

    if (isNative) {
      setIsNativeApp(true)
      const token = localStorage.getItem("attendance_token")
      const userStr = localStorage.getItem("attendance_current_user")
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr)
          if (user.role === "parent") {
            router.replace("/parent/notifications")
            return
          } else {
            router.replace("/login")
            return
          }
        } catch (e) {}
      }
      router.replace("/login")
    } else {
      setIsNativeApp(false)
    }
  }, [router])

  // Mobile / Android APK: Bypass landing page completely
  if (isNativeApp === true) {
    return (
      <div className="min-h-screen bg-[#070d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400">Opening Zetime...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <WebApplicationJsonLd />
      <HomePage />
    </>
  )
}

