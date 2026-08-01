import { API_URL } from "@/lib/api-config"
import type { TeacherAssignment } from "../types"
import { apiFetch } from "@/lib/utils/fetch-with-timeout"
import { queryCache } from "@/lib/utils/query-cache"

export async function getTeachers(headers: any, schoolId?: string): Promise<any[]> {
  const activeSchoolId = schoolId || headers["x-school-id"] || ""
  if (!activeSchoolId) return []
  return queryCache.fetch(
    `teachers_${activeSchoolId}`,
    async () => {
      const result = await apiFetch<{ success: boolean; data: any[] }>(
        `${API_URL}/api/users?role=teacher`,
        { headers }
      )
      return result.data.filter((u: any) => u.role === "teacher")
    },
    { staleTime: 60_000, persist: true }
  )
}

export async function getTeacherAssignments(headers: any, schoolId?: string, teacherId?: string): Promise<TeacherAssignment[]> {
  if (!schoolId) return []
  const cacheKey = `assignments_${schoolId}_${teacherId || "all"}`
  return queryCache.fetch(
    cacheKey,
    async () => {
      const params = teacherId ? `?teacherId=${teacherId}` : ""
      const result = await apiFetch<{ success: boolean; data: any[] }>(
        `${API_URL}/api/assignments${params}`,
        { headers }
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
    },
    { staleTime: 60_000 }
  )
}
