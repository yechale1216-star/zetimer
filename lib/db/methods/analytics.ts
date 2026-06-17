"use client"

import { API_URL } from "@/lib/api-config"

export async function getAttendanceSummaryStats(headers: any, filters: any = {}): Promise<any> {
  try {
    const query = new URLSearchParams({ 
      ...filters, 
      _t: Date.now().toString() 
    }).toString()
    const res = await fetch(`${API_URL}/api/attendance-analytics/summary?${query}`, { 
      headers,
      cache: 'no-store'
    })
    if (!res.ok) {
      if (res.status === 401) {
        const { authService } = await import("@/lib/auth/auth");
        authService.handleUnauthorized();
      }
      return null
    }
    const result = await res.json()
    return result.data
  } catch (error) {
    console.error("[pg] getAttendanceSummaryStats error:", error)
    return null
  }
}

export async function getAttendanceGradeStats(headers: any, filters: any = {}): Promise<any[]> {
  try {
    const query = new URLSearchParams({ 
      ...filters, 
      _t: Date.now().toString() 
    }).toString()
    const res = await fetch(`${API_URL}/api/attendance-analytics/grade-stats?${query}`, { 
      headers,
      cache: 'no-store'
    })
    if (!res.ok) {
      if (res.status === 401) {
        const { authService } = await import("@/lib/auth/auth");
        authService.handleUnauthorized();
      }
      return []
    }
    const result = await res.json()
    return result.data
  } catch (error) {
    console.error("[pg] getAttendanceGradeStats error:", error)
    return []
  }
}
