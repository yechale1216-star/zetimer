import type React from "react"
import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = localFont({
  src: "../public/fonts/inter.woff2",
  variable: "--font-geist-sans",
  display: "swap",
})

const jetbrainsMono = localFont({
  src: "../public/fonts/jetbrains-mono.woff2",
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Zetime - School Attendance Management",
  description: "Smart school attendance tracking and management system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zetime",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Zetime",
    title: "Zetime - School Attendance Management",
    description: "Smart school attendance tracking and management system",
  },
  twitter: {
    card: "summary",
    title: "Zetime - School Attendance Management",
    description: "Smart school attendance tracking and management system",
  },
  generator: "v0.app",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#2563eb",
}

import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/context/language-context"
import { SchoolProvider } from "@/lib/context/school-context"
import { AuthProvider } from "@/lib/context/auth-context"

import { Toaster as SonnerToaster } from "sonner"
import { PWAClientWrapper } from "@/components/system/pwa-client-wrapper"
import { FetchInterceptor } from "@/components/providers/fetch-interceptor"
import { CapacitorInitializer } from "@/components/capacitor-initializer"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ... head tags ... */}
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <FetchInterceptor>
            <LanguageProvider>
              <AuthProvider>
                <CapacitorInitializer />
                <SchoolProvider>
                  {children}
                  <Toaster />
                  <SonnerToaster position="top-right" richColors />
                  <PWAClientWrapper />
                </SchoolProvider>
              </AuthProvider>
            </LanguageProvider>
          </FetchInterceptor>
        </ThemeProvider>
      </body>
    </html>
  )
}
