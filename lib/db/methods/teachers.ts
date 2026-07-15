"use client"

import { API_URL } from "@/lib/api-config"
import type { TeacherAssignment } from "../types"
import { apiFetch } from "@/lib/utils/fetch-with-timeout"

export async function getTeachers(headers: any): Promise<any[]> {
  const result = await apiFetch<{ success: boolean; data: any[] }>(
    `${API_URL}/api/users?_t=${Date.now()}`,
    { 
      headers,
      cache: 'no-store'
    }
  )
  return result.data.filter((u: any) => u.role === "teacher")
}

export async function getTeacherAssignments(headers: any, schoolId?: string, teacherId?: string): Promise<TeacherAssignment[]> {
  if (!schoolId) return []
  const params = teacherId ? `?teacherId=${teacherId}` : ""
  const separator = params ? '&' : '?'
  
  const result = await apiFetch<{ success: boolean; data: any[] }>(
    `${API_URL}/api/assignments${params}${separator}_t=${Date.now()}`,
    {
      headers,
      cache: 'no-store'
    }
  )

  return result.data.map((a: any) => ({
    id: a.id,
    teacher_id: a.teacher_id,
    schoolId: a.schoolId,
    grade: a.grade,
    section: a.section,
    subject: a.subject,
    stream: a.stream,
    class_id: a.id,
    teacher: a.teacher ? {
      id: a.teacher.id,
      full_name: a.teacher.full_name || a.teacher.name,
      email: a.teacher.email,
      profile_photo: a.teacher.profile_photo,
    } : undefined,
  }))
}
