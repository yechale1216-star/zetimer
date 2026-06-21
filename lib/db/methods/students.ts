"use client"

import { API_URL } from "@/lib/api-config"
import type { Student } from "../types"

export async function getNextStudentId(headers: any): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/students/auto/next-id`, {
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
    return result.data
  } catch (error) {
    console.error("[pg] getNextStudentId error:", error)
    return ""
  }
}

export async function getStudents(headers: any, schoolId: string): Promise<Student[]> {
  try {
    if (!schoolId) return []
    const res = await fetch(`${API_URL}/api/students?_t=${Date.now()}`, { 
      headers,
      cache: 'no-store'
    })
    if (!res.ok) {
      const errorText = await res.text().catch(() => "Could not read error text");
      console.error(`[pg] getStudents error response: ${res.status} ${res.statusText} - ${errorText}`);
      if (res.status === 401) {
        const { authService } = await import("@/lib/auth/auth");
        authService.handleUnauthorized();
      }
      throw new Error(`Failed to fetch students: ${errorText}`)
    }
    const result = await res.json()
    return result.data.map((s: any) => ({
      ...s,
      schoolId: schoolId,
    }))
  } catch (error) {
    console.error("[pg] getStudents error:", error)
    return []
  }
}

export async function addStudent(headers: any, schoolId: string, student: Partial<Student>): Promise<Student> {
  if (!schoolId) throw new Error("School ID not found")
  const res = await fetch(`${API_URL}/api/students`, {
    method: "POST",
    headers,
    body: JSON.stringify(student),
  })
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Could not read error text");
    console.error(`[pg] addStudent error response: ${res.status} ${res.statusText} - ${errorText}`);
    throw new Error(`Failed to add student: ${errorText}`)
  }
  const result = await res.json()
  return {
    ...result.data,
    schoolId: schoolId,
  }
}

export async function updateStudent(headers: any, id: string, data: Partial<Student>): Promise<void> {
  const res = await fetch(`${API_URL}/api/students/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update student")
}

export async function deleteStudent(headers: any, id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/students/${id}`, {
    method: "DELETE",
    headers,
  })
  if (!res.ok) throw new Error("Failed to delete student")
}
