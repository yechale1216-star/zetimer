"use client"

import { API_URL } from "@/lib/api-config"
import type { AttendanceRecord } from "../types"
import { apiFetch } from "@/lib/utils/fetch-with-timeout"

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
  if (!schoolId) return []
  const result = await apiFetch<{ success: boolean; data: any[] }>(
    `${API_URL}/api/attendance?_t=${Date.now()}`,
    { 
      headers,
      cache: 'no-store'
    }
  )
  return result.data.map((r: any) => mapAttendance(r, schoolId))
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

  await apiFetch(
    `${API_URL}/api/attendance/bulk`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ records: formattedRecords }),
    }
  )
}
