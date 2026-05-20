import { Suspense } from "react"
import ResetPasswordPageContent from "./reset-password-content"

export const metadata = {
  title: "Reset Password",
  description: "Reset your account password",
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}
