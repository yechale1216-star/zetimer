"use client"

import { BaseDatabase } from "./base"
import * as students from "./methods/students"
import * as attendance from "./methods/attendance"
import * as analytics from "./methods/analytics"
import * as teachers from "./methods/teachers"
import * as calls from "./methods/calls"
import * as settings from "./methods/settings"
import type { Student, AttendanceRecord, TeacherAssignment } from "./types"
import { API_URL } from "@/lib/api-config"

export type { Student, AttendanceRecord, TeacherAssignment }

class Database extends BaseDatabase {
  // ─── STUDENTS ─────────────────────────────────────────────────────────────
  async getNextStudentId(): Promise<string> {
    return students.getNextStudentId(this.getApiHeaders())
  }

  async getStudents(): Promise<Student[]> {
    return students.getStudents(this.getApiHeaders(), this.getSchoolId())
  }

  async addStudent(student: Partial<Student>): Promise<Student> {
    return students.addStudent(this.getApiHeaders(), this.getSchoolId(), student)
  }

  async bulkAddStudents(studentsData: Partial<Student>[]): Promise<any> {
    const schoolId = this.getSchoolId()
    if (!schoolId) throw new Error("School ID not found")
    const res = await fetch(`${API_URL}/api/students/bulk`, {
      method: "POST", headers: this.getApiHeaders(), body: JSON.stringify({ students: studentsData }),
    })
    if (!res.ok) await this.handleError(res);
    return await res.json()
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<void> {
    return students.updateStudent(this.getApiHeaders(), id, data)
  }

  async deleteStudent(id: string): Promise<void> {
    return students.deleteStudent(this.getApiHeaders(), id)
  }

  async checkParentsBatch(phones: string[]): Promise<boolean[]> {
    try {
      const res = await fetch(`${API_URL}/api/parent/check-batch`, {
        method: "POST",
        headers: this.getApiHeaders(),
        body: JSON.stringify({ phones }),
      })
      if (!res.ok) return phones.map(() => false)
      const result = await res.json()
      return result.data
    } catch (error) {
      console.error("[pg] checkParentsBatch error:", error)
      return phones.map(() => false)
    }
  }

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  async getAttendance(): Promise<AttendanceRecord[]> {
    return attendance.getAttendance(this.getApiHeaders(), this.getSchoolId())
  }

  async getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) return []
      const res = await fetch(`${API_URL}/api/attendance?date=${date}&_t=${Date.now()}`, { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      })
      if (!res.ok) throw new Error(res.statusText)
      const result = await res.json()
      return result.data.map((r: any) => attendance.mapAttendance(r, schoolId))
    } catch (error) {
      console.error("[pg] getAttendanceByDate error:", error)
      return []
    }
  }

  async getAttendanceByDateAndMode(date: string, session: "morning" | "afternoon" | null): Promise<AttendanceRecord[]> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) return []
      const sessionParam = session ? `&session=${session}` : `&session=none`
      const url = `${API_URL}/api/attendance?date=${date}${sessionParam}&_t=${Date.now()}`
      const res = await fetch(url, { headers: this.getApiHeaders(), cache: 'no-store' })
      if (!res.ok) throw new Error(res.statusText)
      const result = await res.json()
      return result.data.map((r: any) => attendance.mapAttendance(r, schoolId))
    } catch (error) {
      console.error("[pg] getAttendanceByDateAndMode error:", error)
      return []
    }
  }

  async getAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      const schoolId = this.getSchoolId()
      if (!schoolId) return []
      const res = await fetch(`${API_URL}/api/attendance?startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`, { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      })
      if (!res.ok) throw new Error(res.statusText)
      const result = await res.json()
      return result.data.map((r: any) => attendance.mapAttendance(r, schoolId))
    } catch (error) {
      console.error("[pg] getAttendanceByDateRange error:", error)
      return []
    }
  }

  async getAllAttendance(): Promise<AttendanceRecord[]> {
    return this.getAttendance()
  }

  async markAttendance(records: Partial<AttendanceRecord>[]): Promise<void> {
    return attendance.markAttendance(this.getApiHeaders(), this.getSchoolId(), records)
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
    if (!res.ok) await this.handleError(res);
    const result = await res.json()
    return attendance.mapAttendance(result.data, schoolId)
  }

  async getAttendanceByStudent(studentId: string, schoolId: string): Promise<AttendanceRecord[]> {
    try {
      const res = await fetch(`${API_URL}/api/attendance/student/${studentId}?_t=${Date.now()}`, {
        headers: this.getApiHeaders(),
        cache: 'no-store'
      })
      if (!res.ok) return []
      const result = await res.json()
      return result.data.map((r: any) => attendance.mapAttendance(r, schoolId))
    } catch (error) {
      console.error("[pg] getAttendanceByStudent error:", error)
      return []
    }
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  async getSettings(): Promise<any> {
    return settings.getSettings(this.getApiHeaders(), this.getSchoolId())
  }

  async updateSettings(settingsData: any): Promise<void> {
    const schoolId = this.getSchoolId()
    if (!schoolId) return
    await fetch(`${API_URL}/api/settings`, {
      method: "PUT",
      headers: this.getApiHeaders(),
      body: JSON.stringify({
        school_name: settingsData.schoolName,
        school_phone: settingsData.schoolPhone,
        school_address: settingsData.schoolAddress,
        academic_year: settingsData.academicYear,
        attendance_mode: settingsData.attendanceMode,
        attendance_ui_type: settingsData.attendanceUiType,
        attendance_threshold: settingsData.attendanceThreshold,
        allow_late_mark: settingsData.allowLateMark,
        email_notifications: settingsData.emailNotifications,
        sms_notifications: settingsData.smsNotifications,
        notification_time: settingsData.notificationTime,
        school_logo: settingsData.schoolLogo,
      }),
    })
  }

  async resetSettings(): Promise<void> {
    const schoolId = this.getSchoolId()
    if (!schoolId) return
    await fetch(`${API_URL}/api/settings`, {
      method: "PUT",
      headers: this.getApiHeaders(),
      body: JSON.stringify(settings.defaultSettings()),
    })
  }

  // ─── TEACHERS ─────────────────────────────────────────────────────────────
  async getTeachers(): Promise<any[]> {
    return teachers.getTeachers(this.getApiHeaders())
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
        schoolId: schoolId,
        is_active: true,
      }),
    })
    if (!res.ok) await this.handleError(res);
    return (await res.json()).data
  }

  async updateTeacher(teacherId: string, teacherData: any): Promise<void> {
    const res = await fetch(`${API_URL}/api/users/${teacherId}`, {
      method: "PUT",
      headers: this.getApiHeaders(),
      body: JSON.stringify(teacherData),
    })
    if (!res.ok) await this.handleError(res);
  }

  async deleteTeacher(teacherId: string): Promise<void> {
    await fetch(`${API_URL}/api/users/${teacherId}`, {
      method: "DELETE", headers: this.getApiHeaders(),
    })
  }

  // ─── TEACHER ASSIGNMENTS ──────────────────────────────────────────────────
  async getTeacherAssignments(schoolId?: string, teacherId?: string): Promise<TeacherAssignment[]> {
    return teachers.getTeacherAssignments(this.getApiHeaders(), schoolId || this.getSchoolId(), teacherId)
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
        body: JSON.stringify({ 
          teacher_id: teacherId, 
          gradeId: grade, 
          sectionId: section, 
          streamId: stream,
          subject 
        }),
      })
      if (!res.ok) await this.handleError(res);
      return (await res.json()).data
    } catch (error) {
      console.error("[pg] assignTeacherToClass error:", error)
      throw error
    }
  }

  async removeTeacherAssignment(assignmentId: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/assignments/${assignmentId}`, {
      method: "DELETE", headers: this.getApiHeaders(),
    })
    if (!res.ok) await this.handleError(res);
  }

  async updateTeacherAssignment(assignmentId: string, data: any): Promise<void> {
    const res = await fetch(`${API_URL}/api/assignments/${assignmentId}`, {
      method: "PUT",
      headers: this.getApiHeaders(),
      body: JSON.stringify({ 
        teacher_id: data.teacher_id, 
        gradeId: data.gradeId, 
        sectionId: data.sectionId, 
        streamId: data.streamId || null,
        subject: data.subject || null 
      }),
    })
    if (!res.ok) await this.handleError(res);
  }

  // ─── ACADEMIC ENTITIES ────────────────────────────────────────────────────
  async getGrades(): Promise<any[]> {
    try {
      const res = await fetch(`${API_URL}/api/schools/me/grades?_t=${Date.now()}`, { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      })
      if (!res.ok) return []
      return (await res.json()).data
    } catch { return [] }
  }

  async getSections(): Promise<any[]> {
    try {
      const res = await fetch(`${API_URL}/api/schools/me/sections?_t=${Date.now()}`, { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      })
      if (!res.ok) return []
      return (await res.json()).data
    } catch { return [] }
  }

  async getStreams(): Promise<any[]> {
    try {
      const res = await fetch(`${API_URL}/api/schools/me/streams?_t=${Date.now()}`, { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      })
      if (!res.ok) return []
      return (await res.json()).data
    } catch { return [] }
  }

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

  async initializeSchoolData(schoolId: string | number): Promise<void> {
    this.setSchoolId(schoolId)
    console.log("[pg] School session initialized for:", String(schoolId))
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
    const settingsData = await this.getSettings()
    return analytics.getAttendanceSummaryStats(this.getApiHeaders(), { ...filters, mode: settingsData.attendanceMode })
  }

  async getAttendanceGradeStats(filters: any = {}): Promise<any[]> {
    const settingsData = await this.getSettings()
    return analytics.getAttendanceGradeStats(this.getApiHeaders(), { ...filters, mode: settingsData.attendanceMode })
  }

  async getAttendanceTrendStats(filters: any = {}): Promise<any[]> {
    try {
      const settingsData = await this.getSettings()
      const query = new URLSearchParams({ 
        ...filters, 
        mode: settingsData.attendanceMode,
        _t: Date.now().toString() 
      }).toString()
      const res = await fetch(`${API_URL}/api/attendance-analytics/trends?${query}`, { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
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
      const settingsData = await this.getSettings()
      const query = new URLSearchParams({ 
        ...filters, 
        mode: settingsData.attendanceMode,
        _t: Date.now().toString() 
      }).toString()
      const res = await fetch(`${API_URL}/api/attendance-analytics/drill-down/${gradeId}?${query}`, { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
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
      const settingsData = await this.getSettings()
      const query = new URLSearchParams({ 
        ...filters, 
        mode: settingsData.attendanceMode,
        format: 'csv', 
        _t: Date.now().toString() 
      }).toString()
      const res = await fetch(`${API_URL}/api/attendance-analytics/export?${query}`, { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      })
      if (!res.ok) return null
      return await res.blob()
    } catch (error) {
      console.error("[pg] exportAttendanceReport error:", error)
      return null
    }
  }

  // ─── CALLS & CONTACTS ─────────────────────────────────────────────────────
  async getContacts(): Promise<any[]> {
    return calls.getContacts(this.getApiHeaders())
  }

  async logCall(data: { recipientId: string, type: 'VOICE' | 'VIDEO', status: string, duration?: number }): Promise<any> {
    return calls.logCall(this.getApiHeaders(), data)
  }

  async getCallHistoryApi(): Promise<any[]> {
    return calls.getCallHistoryApi(this.getApiHeaders())
  }
}

export const db = new Database()
export const database = db
