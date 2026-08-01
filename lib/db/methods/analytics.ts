"use client"

import { API_URL } from "@/lib/api-config"
import { apiFetch } from "@/lib/utils/fetch-with-timeout"
import { queryCache } from "@/lib/utils/query-cache"

export async function getAttendanceSummaryStats(headers: any, filters: any = {}): Promise<any> {
  const schoolId = headers?.["x-school-id"] || "default"
  const queryString = new URLSearchParams(filters).toString()
  return queryCache.fetch(
    `analytics_summary_${schoolId}_${queryString}`,
    async () => {
      const result = await apiFetch<{ success: boolean; data: any }>(
        `${API_URL}/api/attendance-analytics/summary?${queryString}`,
        { headers }
      )
      return result.data
    },
    { staleTime: 30_000, persist: false }
  )
}

export async function getAttendanceGradeStats(headers: any, filters: any = {}): Promise<any[]> {
  const schoolId = headers?.["x-school-id"] || "default"
  const queryString = new URLSearchParams(filters).toString()
  return queryCache.fetch(
    `analytics_grade_${schoolId}_${queryString}`,
    async () => {
      const result = await apiFetch<{ success: boolean; data: any[] }>(
        `${API_URL}/api/attendance-analytics/grade-stats?${queryString}`,
        { headers }
      )
      return result.data
    },
    { staleTime: 30_000, persist: false }
  )
}
