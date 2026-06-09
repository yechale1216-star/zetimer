"use client"

import { useRouter } from "next/navigation"
import { AdminSignupForm } from "@/components/auth/admin-signup-form"

export default function AdminSignupPage() {
  const router = useRouter()

  const handleSignupSuccess = () => {
    // After successful signup, redirect to the onboarding wizard
    router.push("/onboarding")
  }

  const handleBack = () => {
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AdminSignupForm
          onSignupSuccess={handleSignupSuccess}
          onBack={handleBack}
        />
      </div>
    </div>
  )
}
