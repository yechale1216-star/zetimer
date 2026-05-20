"use client"

import { useState, useEffect } from "react"
import { User, Mail, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authService } from "@/lib/auth/auth"
import { notifications } from "@/lib/utils/notifications"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"
import { db } from "@/lib/db/database"

export function UserProfile() {
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const currentUser = authService.getCurrentUser()
        if (currentUser) {
          // In localStorage mode, we already have the user from authService
          setUser(currentUser)
          setFormData(currentUser)

          if (currentUser.schoolId) {
            const schoolData = await db.getSettings()
            setSchool(schoolData)
          }
        }
      } catch (error) {
        console.error("[v0] Error loading profile:", error)
        notifications.error("Profile Error", "Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveProfile = async () => {
    try {
      if (!formData.full_name || formData.full_name.trim() === "") {
        notifications.error("Profile Update", "Full name cannot be empty")
        return
      }

      if (!formData.email || !formData.email.includes("@")) {
        notifications.error("Profile Update", "Please enter a valid email address")
        return
      }

      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          notifications.error("Profile Update", "Passwords do not match")
          return
        }
        if (formData.password.length < 6) {
          notifications.error("Profile Update", "Password must be at least 6 characters long")
          return
        }
      }

      const updatePayload: any = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
      }

      if (formData.password) {
        updatePayload.password_hash = formData.password
      }

      await db.updateTeacher(user.id, updatePayload)
      
      // Update local user session in localStorage so they remain authenticated with new credentials
      const updatedUser = { 
        ...user, 
        name: updatePayload.full_name,
        full_name: updatePayload.full_name,
        email: updatePayload.email
      }
      localStorage.setItem("attendance_current_user", JSON.stringify(updatedUser))
      setUser(updatedUser)
      setIsEditing(false)
      
      // Clear password inputs from form
      setFormData((prev: any) => ({
        ...prev,
        password: "",
        confirmPassword: ""
      }))

      notifications.success("Profile Update", "Profile updated successfully")
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error("[v0] Profile update error:", errorMsg)
      notifications.error("Profile Update", `Failed to update profile: ${errorMsg}`)
    }
  }
  
  const getGreeting = () => {
    const hour = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa', hour12: false, hour: 'numeric' }), 10)
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-primary via-indigo-600 to-indigo-700 text-white rounded-2xl p-8 mb-8 shadow-lg shadow-primary/20">
        <div className="flex items-center gap-6">
          {user?.profile_photo ? (
            <img
              src={user.profile_photo}
              alt={user.full_name || user.name}
              className="w-20 h-20 rounded-full object-cover shadow-lg ring-4 ring-white/30 ring-offset-2 ring-offset-indigo-600"
            />
          ) : (
            <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full p-4 shadow-inner">
              <User className="w-10 h-10" />
            </div>
          )}
          <div>
            <p className="text-indigo-100/80 text-sm font-medium mb-1">{getGreeting()}</p>
            <h1 className="text-3xl font-bold tracking-tight">{user?.full_name || user?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <p className="text-indigo-100/90 capitalize text-sm font-medium tracking-wide">{user?.role} Account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Personal Information */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-foreground flex items-center gap-2">
            <div className="w-1 h-5 bg-primary rounded-full" />
            Personal Information
          </h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={formData.full_name || ""}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-muted/50 disabled:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2.5 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-muted/50 disabled:text-muted-foreground"
              />
            </div>
            {isEditing && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-muted-foreground">New Password</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={formData.password || ""}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="w-full px-4 py-2.5 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-muted-foreground">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your new password"
                    value={formData.confirmPassword || ""}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="w-full px-4 py-2.5 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">Role</label>
              <input
                type="text"
                value={formData.role || ""}
                disabled
                className="w-full px-4 py-2.5 border border-input bg-muted/30 rounded-lg text-muted-foreground capitalize cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* School Information */}
        {school && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-foreground flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              School Information
            </h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">School Name</label>
                <input
                  type="text"
                  value={school.schoolName || school.name || ""}
                  disabled
                  className="w-full px-4 py-2.5 border border-input bg-muted/30 rounded-lg text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Phone</label>
                <input
                  type="text"
                  value={school.schoolPhone || school.phone || ""}
                  disabled
                  className="w-full px-4 py-2.5 border border-input bg-muted/30 rounded-lg text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="px-8 shadow-lg shadow-primary/20">
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setIsEditing(false)
                  setFormData(user)
                }}
                variant="outline"
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6 shadow-lg shadow-green-500/20"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


