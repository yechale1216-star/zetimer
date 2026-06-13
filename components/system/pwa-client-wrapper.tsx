"use client"

import dynamic from "next/dynamic"

const PWAInstall = dynamic(() => import("./pwa-install").then(mod => ({ default: mod.PWAInstall })), {
  ssr: false,
})

export function PWAClientWrapper() {
  return <PWAInstall />
}
