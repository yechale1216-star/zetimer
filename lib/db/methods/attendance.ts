"use client"

import { API_URL } from "@/lib/api-config"
import type { AttendanceRecord } from "../types"

export function mapAttendance(r: any, schoolId: string): AttendanceRecord {
  return {
    ...r,
    attendance_date: (r.date || r.attendance_date || "").split("T")[0],
    student_id: r.studentId || r.student_id,
    schoolId: schoolId,
    created_at: r.createdAt || r.created_at || new Date().toISOString(),
  }
}

export async function getAttendance(headers: any, schoolId: string): Promise<AttendanceRecord[]> {
  try {
    if (!schoolId) return []
    const res = await fetch(`${API_URL}/api/attendance?_t=${Date.now()}`, { 
      headers,
      cache: 'no-store'
    })
    if (!res.ok) {
      if (res.status === 401) {
        const { authService } = await import("@/lib/auth/auth");
        authService.handleUnauthorized();
      }
      throw new Error(res.statusText)
    }
    const result = await res.json()
    return result.data.map((r: any) => mapAttendance(r, schoolId))
  } catch (error) {
    console.error("[pg] getAttendance error:", error)
    return []
  }
}

export async function markAttendance(headers: any, schoolId: string, records: Partial<AttendanceRecord>[]): Promise<void> {
  if (!schoolId) throw new Error("School ID not found")
  
  const formattedRecords = records.map(record => {
    const recDate = record.attendance_date || record.date
    return {
      studentId: record.student_id,
      status: record.status,
      session: record.session || null,
      remarks: record.remarks || record.note || "",
      date: recDate ? new Date(recDate).toISOString() : new Date().toISOString(),
    }
  })

  const res = await fetch(`${API_URL}/api/attendance/bulk`, {
    method: "POST",
    headers,
    body: JSON.stringify({ records: formattedRecords }),
  })

  if (!res.ok) {
    if (res.status === 401) {
      const { authService } = await import("@/lib/auth/auth");
      authService.handleUnauthorized();
    }
    throw new Error("Failed to mark attendance")
  }
}
