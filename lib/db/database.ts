"use client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export interface Student {
  id: string
  name?: string
  student_id?: string
  grade?: string
  stream?: string
  section?: string
  parent_email?: string
  parent_phone?: string
  parent_name?: string
  existingParentId?: string
  gender?: string
  date_of_birth?: string
  first_name?: string
  last_name?: string
  roll_number?: string
  school_id?: string
  class_id?: string
  address?: string
  status?: string
}

export interface AttendanceRecord {
  id: string
  student_id: string
  attendance_date: string
  status: "present" | "late" | "absent" | "excused" | "Present" | "Late" | "Absent" | "Excused"
  remarks?: string
  note?: string
  created_at: string
  updated_at?: string
  school_id?: string
  date?: string
  class_id?: string
  session?: "morning" | "afternoon" | null
}

export interface TeacherAssignment {
  id: string
  teacher_id: string
  class_id?: string
  grade?: string
  section?: string
  stream?: string
  subject?: string
  school_id?: string
  teacher?: {
    id: string
    full_name: string
    email: string
  }
  class?: {
    id: string
    name: string
    grade: string
    section: string
  }
}

class Database {
  private currentSchoolId: string | null = null

  private setSchoolId(schoolId: string | number) {
    this.currentSchoolId = String(schoolId)
  }

  private getSchoolId(): string {
    if (!this.currentSchoolId) {
      const user = this.getCurrentUser()
      if (user?.schoolId || user?.school_id) {
        this.currentSchoolId = String(user.schoolId || user.school_id)
      } else {
        console.warn("[pg] No schoolId found in user session")
        return ""
      }
    }
    return this.currentSchoolId || ""
  }

  private getCurrentUser(): any {
    if (typeof window === "undefined") return null
    try {
      const data = localStorage.getItem("attendance_current_user")
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  private getApiHeaders(): Record<string, string> {
    const schoolId = this.getSchoolId()
    const user = this.getCurrentUser()
    return {
      "Content-Type": "application/json",
      "x-school-id": schoolId,
      "x-school-name": user?.schoolName || "",
    }
  }

  // ─── STUDENTS ─────────────────────────────────────────────────────────────
  async getStudents(): Promise<Student[]> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) return []
      console.log(`[pg] Fetching students from ${API_URL}/api/students with schoolId: ${schoolId}`)
      const res = await fetch(`${API_URL}/api/students`, { headers: this.getApiHeaders() })
      console.log(`[pg] getStudents response status: ${res.status} (${res.statusText})`)
      if (!res.ok) {
        const errorText = await res.text()
        console.error(`[pg] getStudents failed: ${res.status} ${res.statusText} - ${errorText}`)
        throw new Error(res.statusText)
      }
      const result = await res.json()
      return result.data.map((s: any) => ({
        ...s,
        name: s.name || s.fullName || "",
        student_id: s.student_id || "",
        grade: s.grade?.name || s.grade || "",
        section: s.section?.name || s.section || "",
        stream: s.stream?.name || s.stream || "",
        school_id: schoolId,
      }))
    } catch (error) {
      console.error("[pg] getStudents error:", error)
      return []
    }
  }

  async addStudent(student: Partial<Student>): Promise<Student> {
    const schoolId = this.getSchoolId()
    if (!schoolId) throw new Error("School ID not found")
    const res = await fetch(`${API_URL}/api/students`, {
      method: "POST", headers: this.getApiHeaders(), body: JSON.stringify(student),
    })
    if (!res.ok) throw new Error(await res.text())
    const result = await res.json()
    const s = result.data
    return {
      ...s,
      name: s.name || s.fullName || "",
      student_id: s.student_id || "",
      grade: s.grade?.name || s.grade || "",
      section: s.section?.name || s.section || "",
      stream: s.stream?.name || s.stream || "",
      school_id: schoolId,
    }
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<void> {
    const res = await fetch(`${API_URL}/api/students/${id}`, {
      method: "PUT", headers: this.getApiHeaders(), body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  async deleteStudent(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/students/${id}`, {
      method: "DELETE", headers: this.getApiHeaders(),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  async getAttendance(): Promise<AttendanceRecord[]> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) return []
      const res = await fetch(`${API_URL}/api/attendance`, { headers: this.getApiHeaders() })
      if (!res.ok) throw new Error(res.statusText)
      const result = await res.json()
      return result.data.map((r: any) => this.mapAttendance(r, schoolId))
    } catch (error) {
      console.error("[pg] getAttendance error:", error)
      return []
    }
  }

  async getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) return []
      const res = await fetch(`${API_URL}/api/attendance?date=${date}`, { headers: this.getApiHeaders() })
      if (!res.ok) throw new Error(res.statusText)
      const result = await res.json()
      return result.data.map((r: any) => this.mapAttendance(r, schoolId))
    } catch (error) {
      console.error("[pg] getAttendanceByDate error:", error)
      return []
    }
  }

  async getAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) return []
      const res = await fetch(`${API_URL}/api/attendance?startDate=${startDate}&endDate=${endDate}`, { 
        headers: this.getApiHeaders() 
      })
      if (!res.ok) throw new Error(res.statusText)
      const result = await res.json()
      return result.data.map((r: any) => this.mapAttendance(r, schoolId))
    } catch (error) {
      console.error("[pg] getAttendanceByDateRange error:", error)
      return []
    }
  }

  async getAllAttendance(): Promise<AttendanceRecord[]> {
    return this.getAttendance()
  }

  async markAttendance(records: Partial<AttendanceRecord>[]): Promise<void> {
    const schoolId = this.getSchoolId()
    if (!schoolId) throw new Error("School ID not found")
    for (const record of records) {
      const recDate = record.attendance_date || record.date
      const res = await fetch(`${API_URL}/api/attendance`, {
        method: "POST",
        headers: this.getApiHeaders(),
        body: JSON.stringify({
          studentId: record.student_id,
          status: record.status,
          session: record.session || null,
          remarks: record.remarks || record.note || "",
          date: recDate ? new Date(recDate).toISOString() : new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error(await res.text())
    }
  }

  async saveAttendance(record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    const schoolId = this.getSchoolId()
    if (!schoolId) throw new Error("School ID not found")
    const recDate = record.attendance_date || record.date
    const res = await fetch(`${API_URL}/api/attendance`, {
      method: "POST",
      headers: this.getApiHeaders(),
      body: JSON.stringify({
        studentId: record.student_id,
        status: record.status,
        session: record.session || null,
        remarks: record.remarks || record.note || "",
        date: recDate ? new Date(recDate).toISOString() : new Date().toISOString(),
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    const result = await res.json()
    return this.mapAttendance(result.data, schoolId)
  }

  private mapAttendance(r: any, schoolId: string): AttendanceRecord {
    return {
      ...r,
      attendance_date: (r.date || r.attendance_date || "").split("T")[0],
      student_id: r.studentId || r.student_id,
      school_id: schoolId,
      created_at: r.createdAt || r.created_at || new Date().toISOString(),
    }
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  async getSettings(): Promise<any> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) return this.defaultSettings()
      const res = await fetch(`${API_URL}/api/settings`, { headers: this.getApiHeaders() })
      if (!res.ok) return this.defaultSettings()
      const result = await res.json()
      const s = result.data
      return {
        schoolName: s.school_name || "Zetime School",
        schoolPhone: s.school_phone || "",
        schoolAddress: s.school_address || "",
        academicYear: s.academic_year || new Date().getFullYear().toString(),
        attendance_mode: s.attendance_mode || "daily",
        attendance_ui_type: s.attendance_ui_type || "card_based",
        attendanceThreshold: s.attendance_threshold ?? 75,
        allowLateMark: s.allow_late_mark ?? true,
        emailNotifications: s.email_notifications ?? true,
        smsNotifications: s.sms_notifications ?? false,
        notificationTime: s.notification_time || "16:00",
      }
    } catch (error) {
      console.error("[pg] getSettings error:", error)
      return this.defaultSettings()
    }
  }

  async updateSettings(settings: any): Promise<void> {
    const schoolId = this.getSchoolId()
    if (!schoolId) return
    await fetch(`${API_URL}/api/settings`, {
      method: "PUT",
      headers: this.getApiHeaders(),
      body: JSON.stringify({
        school_name: settings.schoolName,
        school_phone: settings.schoolPhone,
        school_address: settings.schoolAddress,
        academic_year: settings.academicYear,
        attendance_mode: settings.attendance_mode,
        attendance_ui_type: settings.attendance_ui_type,
        attendance_threshold: settings.attendanceThreshold,
        allow_late_mark: settings.allowLateMark,
        email_notifications: settings.emailNotifications,
        sms_notifications: settings.smsNotifications,
        notification_time: settings.notificationTime,
      }),
    })
  }

  async resetSettings(): Promise<void> {
    const schoolId = this.getSchoolId()
    if (!schoolId) return
    await fetch(`${API_URL}/api/settings`, {
      method: "PUT",
      headers: this.getApiHeaders(),
      body: JSON.stringify(this.defaultSettings()),
    })
  }

  private defaultSettings() {
    return {
      schoolName: "Zetime School",
      schoolPhone: "",
      schoolAddress: "",
      academicYear: new Date().getFullYear().toString(),
      attendance_mode: "daily",
      attendance_ui_type: "card_based",
      attendanceThreshold: 75,
      allowLateMark: true,
      emailNotifications: true,
      smsNotifications: false,
      notificationTime: "16:00",
    }
  }

  // ─── TEACHERS ─────────────────────────────────────────────────────────────
  async getTeachers(): Promise<any[]> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) return []
      const res = await fetch(`${API_URL}/api/users`, { headers: this.getApiHeaders() })
      if (!res.ok) return []
      const result = await res.json()
      return result.data.filter((u: any) => u.role === "teacher")
    } catch (error) {
      console.error("[pg] getTeachers error:", error)
      return []
    }
  }

  async createTeacher(teacherData: any): Promise<any> {
    const schoolId = this.getSchoolId()
    if (!schoolId) throw new Error("School ID not found")
    const res = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: this.getApiHeaders(),
      body: JSON.stringify({
        ...teacherData,
        role: "teacher",
        password_hash: teacherData.password || teacherData.password_hash || "demo123456",
        school_id: schoolId,
        is_active: true,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    return (await res.json()).data
  }

  async updateTeacher(teacherId: string, teacherData: any): Promise<void> {
    const res = await fetch(`${API_URL}/api/users/${teacherId}`, {
      method: "PUT",
      headers: this.getApiHeaders(),
      body: JSON.stringify(teacherData),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  async deleteTeacher(teacherId: string): Promise<void> {
    await fetch(`${API_URL}/api/users/${teacherId}`, {
      method: "DELETE", headers: this.getApiHeaders(),
    })
  }

  // ─── TEACHER ASSIGNMENTS ──────────────────────────────────────────────────
  async getTeacherAssignments(schoolId?: string, teacherId?: string): Promise<TeacherAssignment[]> {
    try {
      const sid = schoolId || this.getSchoolId()
      if (!sid) return []
      const params = teacherId ? `?teacherId=${teacherId}` : ""
      const res = await fetch(`${API_URL}/api/assignments${params}`, {
        headers: { ...this.getApiHeaders(), "x-school-id": sid },
      })
      if (!res.ok) return []
      const result = await res.json()
      return result.data.map((a: any) => ({
        id: a.id,
        teacher_id: a.teacher_id,
        school_id: a.school_id,
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
    } catch (error) {
      console.error("[pg] getTeacherAssignments error:", error)
      return []
    }
  }

  async assignTeacherToClass(
    teacherId: string, classId: string, subject?: string,
    grade?: string, section?: string, stream?: string,
  ): Promise<TeacherAssignment | null> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) throw new Error("School ID not found")
      const res = await fetch(`${API_URL}/api/assignments`, {
        method: "POST",
        headers: this.getApiHeaders(),
        body: JSON.stringify({ teacher_id: teacherId, grade, section, subject, stream }),
      })
      if (!res.ok) throw new Error(await res.text())
      return (await res.json()).data
    } catch (error) {
      console.error("[pg] assignTeacherToClass error:", error)
      throw error
    }
  }

  async removeTeacherAssignment(assignmentId: string): Promise<void> {
    await fetch(`${API_URL}/api/assignments/${assignmentId}`, {
      method: "DELETE", headers: this.getApiHeaders(),
    })
  }

  // ─── USERS / AUTH HELPERS ─────────────────────────────────────────────────
  async getUserByEmail(email: string): Promise<any> {
    try {
      const res = await fetch(`${API_URL}/api/users/by-email?email=${encodeURIComponent(email)}`)
      if (!res.ok) return null
      const result = await res.json()
      return result.data || null
    } catch { return null }
  }

  async getSchoolById(schoolId: string): Promise<any> {
    try {
      const res = await fetch(`${API_URL}/api/schools/${schoolId}`)
      if (!res.ok) return null
      return (await res.json()).data
    } catch { return null }
  }

  async updateUserProfile(userId: string, profileData: any): Promise<void> {
    await fetch(`${API_URL}/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: profileData.name }),
    })
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_hash: newPassword }),
      })
      return res.ok
    } catch { return false }
  }

  async storePasswordResetToken(_userId: string, _tokenHash: string, _expiresAt: Date): Promise<boolean> {
    return true // TODO: implement in PostgreSQL
  }

  async verifyResetToken(_email: string, _token: string): Promise<{ valid: boolean; userId?: string }> {
    return { valid: true } // TODO: implement in PostgreSQL
  }

  async getEmailSettings(): Promise<any> {
    return this.getSettings()
  }

  async updateEmailSettings(settings: any): Promise<any> {
    return this.updateSettings(settings)
  }

  async clearAllData(): Promise<void> {
    console.warn("[pg] clearAllData not supported in PostgreSQL mode")
  }

  async initializeSchoolData(schoolId: string | number): Promise<void> {
    this.setSchoolId(schoolId)
    console.log("[pg] School session initialized:", this.currentSchoolId)
  }

  async addSchool(schoolData: any): Promise<string | null> {
    try {
      const res = await fetch(`${API_URL}/api/schools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolData),
      })
      const result = await res.json()
      return result.data?.id || null
    } catch { return null }
  }

  // ─── ANALYTICS ────────────────────────────────────────────────────────────
  async getAttendanceSummaryStats(filters: any = {}): Promise<any> {
    try {
      const query = new URLSearchParams(filters).toString()
      const res = await fetch(`${API_URL}/api/attendance-analytics/summary?${query}`, { 
        headers: this.getApiHeaders() 
      })
      if (!res.ok) return null
      const result = await res.json()
      return result.data
    } catch (error) {
      console.error("[pg] getAttendanceSummaryStats error:", error)
      return null
    }
  }

  async getAttendanceGradeStats(filters: any = {}): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters).toString()
      const res = await fetch(`${API_URL}/api/attendance-analytics/grade-stats?${query}`, { 
        headers: this.getApiHeaders() 
      })
      if (!res.ok) return []
      const result = await res.json()
      return result.data
    } catch (error) {
      console.error("[pg] getAttendanceGradeStats error:", error)
      return []
    }
  }

  async getAttendanceTrendStats(filters: any = {}): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters).toString()
      const res = await fetch(`${API_URL}/api/attendance-analytics/trends?${query}`, { 
        headers: this.getApiHeaders() 
      })
      if (!res.ok) return []
      const result = await res.json()
      return result.data
    } catch (error) {
      console.error("[pg] getAttendanceTrendStats error:", error)
      return []
    }
  }

  async getAttendanceDrillDownStats(gradeId: string, filters: any = {}): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters).toString()
      const res = await fetch(`${API_URL}/api/attendance-analytics/drill-down/${gradeId}?${query}`, { 
        headers: this.getApiHeaders() 
      })
      if (!res.ok) return []
      const result = await res.json()
      return result.data
    } catch (error) {
      console.error("[pg] getAttendanceDrillDownStats error:", error)
      return []
    }
  }

  async exportAttendanceReport(filters: any = {}): Promise<Blob | null> {
    try {
      const query = new URLSearchParams({ ...filters, format: 'csv' }).toString()
      const res = await fetch(`${API_URL}/api/attendance-analytics/export?${query}`, { 
        headers: this.getApiHeaders() 
      })
      if (!res.ok) return null
      return await res.blob()
    } catch (error) {
      console.error("[pg] exportAttendanceReport error:", error)
      return null
    }
  }
}

export const db = new Database()
export const database = db
