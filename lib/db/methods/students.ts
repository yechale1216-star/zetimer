"use client"

import { API_URL } from "@/lib/api-config"
import type { Student } from "../types"
import { apiFetch } from "@/lib/utils/fetch-with-timeout"

export async function getNextStudentId(headers: any): Promise<string> {
  const result = await apiFetch<{ success: boolean; data: string }>(
    `${API_URL}/api/students/auto/next-id`,
    {
      headers,
      cache: 'no-store'
    }
  )
  return result.data
}

export async function getStudents(headers: any, schoolId: string): Promise<Student[]> {
  if (!schoolId) return []
  const result = await apiFetch<{ success: boolean; data: any[] }>(
    `${API_URL}/api/students?_t=${Date.now()}`,
    { 
      headers,
      cache: 'no-store'
    }
  )
  return result.data.map((s: any) => ({
    ...s,
    schoolId: schoolId,
  }))
}

export async function addStudent(headers: any, schoolId: string, student: Partial<Student>): Promise<Student> {
  if (!schoolId) throw new Error("School ID not found")
  const result = await apiFetch<{ success: boolean; data: any }>(
    `${API_URL}/api/students`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(student),
    }
  )
  return {
    ...result.data,
    schoolId: schoolId,
  }
}

export async function updateStudent(headers: any, id: string, data: Partial<Student>): Promise<void> {
  await apiFetch(
    `${API_URL}/api/students/${id}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    }
  )
}

export async function deleteStudent(headers: any, id: string): Promise<void> {
  await apiFetch(
    `${API_URL}/api/students/${id}`,
    {
      method: "DELETE",
      headers,
    }
  )
}
