"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export default function ResetPasswordPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-purple-700 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Reset Link</h1>
          <p className="text-gray-600 mb-6">No reset token provided. Please request a new password reset.</p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return <ResetPasswordForm token={token} onResetSuccess={() => router.push("/")} />
}
