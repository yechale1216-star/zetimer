"use client"

import { API_URL } from "@/lib/api-config"
import { apiFetch } from "@/lib/utils/fetch-with-timeout"
import { queryCache } from "@/lib/utils/query-cache"

export async function getContacts(headers: any): Promise<any[]> {
  const schoolId = headers?.["x-school-id"] || "default"
  return queryCache.fetch(
    `contacts_${schoolId}`,
    async () => {
      const result = await apiFetch<{ success: boolean; data: any[] }>(
        `${API_URL}/api/users/contacts`,
        { headers }
      )
      return result.data
    },
    { staleTime: 60_000 }
  )
}

export async function logCall(
  headers: any,
  data: { recipientId: string; type: 'VOICE' | 'VIDEO'; status: string; duration?: number }
): Promise<any> {
  const result = await apiFetch<{ success: boolean; data: any }>(
    `${API_URL}/api/calls/log`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    }
  )
  return result.data
}

export async function getCallHistoryApi(headers: any): Promise<any[]> {
  const result = await apiFetch<{ success: boolean; data: any[] }>(
    `${API_URL}/api/calls/history`,
    { 
      headers,
      cache: 'no-store'
    }
  )
  return result.data
}
