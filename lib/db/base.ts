"use client"

import { API_URL } from "@/lib/api-config"

export class BaseDatabase {
  // NOTE: No cached schoolId — always read fresh to prevent cross-school data leaks
  // after logout/login transitions in the same browser session.

  protected setSchoolId(schoolId: string | number) {
    // Deprecated: schoolId is now always derived fresh from the current user in localStorage.
    // This method is kept for backward compatibility but has no effect.
    console.warn("[BaseDatabase] setSchoolId() is deprecated. SchoolId is derived from current user.")
  }

  protected getSchoolId(): string {
    // Always read fresh — NEVER rely on a cached instance variable.
    // The db object is a module-level singleton, so a cached value would persist
    // across logout/login transitions and expose one school's data to another.
    if (typeof window === "undefined") return ""

    const user = this.getCurrentUser()
    if (user?.schoolId) {
      return String(user.schoolId)
    }

    return localStorage.getItem("x-school-id") || ""
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
    if (res.status === 401) {
      console.warn("[BaseDatabase] Unauthorized response (401) - triggering session cleanup");
      // Use dynamic import to avoid potential circular dependencies if auth needs db
      const { authService } = await import("@/lib/auth/auth");
      authService.handleUnauthorized();
    }
    
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
