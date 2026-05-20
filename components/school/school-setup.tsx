"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { generateSchoolId } from "@/lib/utils/school-id-generator"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { useToast } from "@/hooks/use-toast"
import { Lock } from "lucide-react"

interface SchoolSetupProps {
  onSetupComplete: () => void
}

export function SchoolSetup({ onSetupComplete }: SchoolSetupProps) {
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: "",
    academicYear: "",
    schoolPhone: "",
    schoolAddress: "",
  })
  const [schoolCode, setSchoolCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const user = authService.getCurrentUser()

  const handleSchoolNameChange = (name: string) => {
    setSchoolInfo({ ...schoolInfo, schoolName: name })
    if (name.trim()) {
      const newCode = generateSchoolId(name)
      setSchoolCode(newCode)
    } else {
      setSchoolCode("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!schoolInfo.schoolName.trim()) {
      toast({
        title: "Error",
        description: "School name is required",
        variant: "destructive",
      })
      return
    }

    if (!schoolCode.trim()) {
      toast({
        title: "Error",
        description: "Please generate a school code",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.updateSchoolInfo(schoolInfo.schoolName, schoolCode, schoolInfo.schoolPhone)

      if (result.success) {
        notifications.success("School Setup Complete", "Your school information has been saved!")
        toast({
          title: "Success",
          description: "School information has been saved. Redirecting to dashboard...",
        })

        // Small delay to allow user to see the message
        setTimeout(() => {
          onSetupComplete()
        }, 1000)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save school information",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-primary">Welcome to Attendance Tracker</CardTitle>
          <CardDescription className="text-base">Let's set up your school information to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-primary">
                <strong>Hello {user?.name}!</strong> Please complete your school setup to access the dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolName" className="text-foreground">
                School Name
              </Label>
              <Input
                id="schoolName"
                type="text"
                placeholder="Enter your school name"
                value={schoolInfo.schoolName}
                onChange={(e) => handleSchoolNameChange(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolCode" className="text-foreground flex items-center gap-2">
                School ID (Code)
                <Lock className="w-4 h-4 text-muted-foreground" />
              </Label>
              <div className="flex gap-2">
                <Input
                  id="schoolCode"
                  type="text"
                  value={schoolCode}
                  disabled={true}
                  className="bg-muted cursor-not-allowed text-muted-foreground font-semibold h-12"
                  placeholder="Auto-generated from school name"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your unique School ID has been generated automatically. Teachers will use this code to join.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolPhone" className="text-foreground">
                School Phone Number (Optional)
              </Label>
              <Input
                id="schoolPhone"
                type="tel"
                placeholder="Enter school phone number"
                value={schoolInfo.schoolPhone}
                onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolPhone: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolAddress" className="text-foreground">
                School Address (Optional)
              </Label>
              <Textarea
                id="schoolAddress"
                placeholder="Enter complete school address"
                value={schoolInfo.schoolAddress}
                onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolAddress: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="academicYear" className="text-foreground">
                Academic Year (Optional)
              </Label>
              <Input
                id="academicYear"
                type="text"
                placeholder="e.g., 2024-2025"
                value={schoolInfo.academicYear}
                onChange={(e) => setSchoolInfo({ ...schoolInfo, academicYear: e.target.value })}
                className="h-12"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? "Setting up your school..." : "Complete Setup"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">You can modify these details later in Settings</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


