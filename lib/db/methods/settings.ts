"use client"

import { API_URL } from "@/lib/api-config"

export function defaultSettings() {
  return {
    schoolName: "Setup Required",
    schoolPhone: "",
    schoolAddress: "",
    academicYear: new Date().getFullYear().toString(),
    attendanceMode: "session_based",
    attendanceUiType: "card_based",
    attendanceThreshold: 75,
    allowLateMark: true,
    emailNotifications: true,
    smsNotifications: false,
    notificationTime: "16:00",
  }
}

export async function getSettings(headers: any, schoolId: string): Promise<any> {
  try {
    if (!schoolId) return defaultSettings()
    const res = await fetch(`${API_URL}/api/settings?_t=${Date.now()}`, { 
      headers,
      cache: 'no-store'
    })
    if (!res.ok) return defaultSettings()
    const result = await res.json()
    const s = result.data
    return {
      schoolName: s.school_name || "Zetime School",
      schoolPhone: s.school_phone || "",
      schoolAddress: s.school_address || "",
      academicYear: s.academic_year || new Date().getFullYear().toString(),
      attendanceMode: s.attendance_mode || "session_based",
      attendanceUiType: s.attendance_ui_type || "card_based",
      attendanceThreshold: s.attendance_threshold ?? 75,
      allowLateMark: s.allow_late_mark ?? true,
      emailNotifications: s.email_notifications ?? true,
      smsNotifications: s.sms_notifications ?? false,
      notificationTime: s.notification_time || "16:00",
      schoolLogo: s.school_logo || "",
    }
  } catch (error) {
    console.error("[pg] getSettings error:", error)
    return defaultSettings()
  }
}
