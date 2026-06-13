"use client"

import { API_URL } from "@/lib/api-config"

export async function getContacts(headers: any): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/api/users/contacts`, { 
      headers,
      cache: 'no-store'
    })
    if (!res.ok) return []
    const result = await res.json()
    return result.data
  } catch (error) {
    console.error("[pg] getContacts error:", error)
    return []
  }
}

export async function logCall(headers: any, data: { recipientId: string, type: 'VOICE' | 'VIDEO', status: string, duration?: number }): Promise<any> {
  try {
    const res = await fetch(`${API_URL}/api/calls/log`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    const result = await res.json()
    return result.data
  } catch (error) {
    console.error("[pg] logCall error:", error)
    return null
  }
}

export async function getCallHistoryApi(headers: any): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/api/calls/history`, { 
      headers,
      cache: 'no-store'
    })
    if (!res.ok) return []
    const result = await res.json()
    return result.data
  } catch (error) {
    console.error("[pg] getCallHistory error:", error)
    return []
  }
}
