"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Lock } from "lucide-react"

const EMAIL_SETUP_PASSWORD = "@muluye56"

export function EmailPasswordDialog({
  open,
  onOpenChange,
  onPasswordCorrect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPasswordCorrect: () => void
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    setIsSubmitting(true)
    setError("")

    if (password === EMAIL_SETUP_PASSWORD) {
      onPasswordCorrect()
      setPassword("")
      onOpenChange(false)
    } else {
      setError("Incorrect password. Please try again.")
      setPassword("")
    }

    setIsSubmitting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Email Setup Access</DialogTitle>
          <DialogDescription>Enter the password to configure email settings</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <Lock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="typography-body text-amber-800">
              <p className="typography-label">Developer Only</p>
              <p>This is not allowed to users. It is for developer only.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-password">Password</Label>
            <Input
              id="email-password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {error && (
            <div className="typography-body flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setPassword("")
                setError("")
                onOpenChange(false)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !password}>
              {isSubmitting ? "Verifying..." : "Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
