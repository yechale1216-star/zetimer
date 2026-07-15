"use client"

import { API_URL } from "@/lib/api-config"
import { apiFetch } from "@/lib/utils/fetch-with-timeout"

export async function getAttendanceSummaryStats(headers: any, filters: any = {}): Promise<any> {
  const query = new URLSearchParams({ 
    ...filters, 
    _t: Date.now().toString() 
  }).toString()
  
  const result = await apiFetch<{ success: boolean; data: any }>(
    `${API_URL}/api/attendance-analytics/summary?${query}`,
    { 
      headers,
      cache: 'no-store'
    }
  )
  return result.data
}

export async function getAttendanceGradeStats(headers: any, filters: any = {}): Promise<any[]> {
  const query = new URLSearchParams({ 
    ...filters, 
    _t: Date.now().toString() 
  }).toString()
  
  const result = await apiFetch<{ success: boolean; data: any[] }>(
    `${API_URL}/api/attendance-analytics/grade-stats?${query}`,
    { 
      headers,
      cache: 'no-store'
    }
  )
  return result.data
}
