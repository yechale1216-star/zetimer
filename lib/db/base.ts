"use client"

import { API_URL } from "@/lib/api-config"

export class BaseDatabase {
  protected currentSchoolId: string | null = null

  protected setSchoolId(schoolId: string | number) {
    this.currentSchoolId = String(schoolId)
  }

  protected getSchoolId(): string {
    const user = this.getCurrentUser()
    if (user?.schoolId) {
      this.currentSchoolId = String(user.schoolId)
    }
    return this.currentSchoolId || ""
  }

  public getCurrentUser(): any {
    if (typeof window === "undefined") return null
    try {
      const data = localStorage.getItem("attendance_current_user")
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  protected getApiHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("attendance_token") : null
    const schoolId = this.getSchoolId()
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    if (schoolId) {
      headers["x-school-id"] = schoolId
    }
    
    return headers
  }

  protected async handleError(res: Response): Promise<never> {
    let message = `HTTP ${res.status}: ${res.statusText}`
    try {
      const data = await res.json()
      message = data.message || data.error || message
    } catch {
      try {
        const text = await res.text()
        if (text && text.length < 200) message = text
      } catch {}
    }
    throw new Error(message)
  }
}
