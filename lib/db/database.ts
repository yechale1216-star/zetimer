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
import { apiFetch } from "@/lib/utils/fetch-with-timeout"

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
    return await apiFetch<{ success: boolean; data: any }>(
      `${API_URL}/api/students/bulk`,
      {
        method: "POST",
        headers: this.getApiHeaders(),
        body: JSON.stringify({ students: studentsData }),
      }
    )
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<void> {
    return students.updateStudent(this.getApiHeaders(), id, data)
  }

  async deleteStudent(id: string): Promise<void> {
    return students.deleteStudent(this.getApiHeaders(), id)
  }

  async checkParentsBatch(phones: string[]): Promise<boolean[]> {
    const result = await apiFetch<{ success: boolean; data: boolean[] }>(
      `${API_URL}/api/parent/check-batch`,
      {
        method: "POST",
        headers: this.getApiHeaders(),
        body: JSON.stringify({ phones }),
      }
    )
    return result.data
  }

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  async getAttendance(): Promise<AttendanceRecord[]> {
    return attendance.getAttendance(this.getApiHeaders(), this.getSchoolId())
  }

  async getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
    const schoolId = this.getSchoolId()
    if (!schoolId) return []
    const result = await apiFetch<{ success: boolean; data: any[] }>(
      `${API_URL}/api/attendance?date=${date}&_t=${Date.now()}`,
      { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      }
    )
    return result.data.map((r: any) => attendance.mapAttendance(r, schoolId))
  }

  async getAttendanceByDateAndMode(date: string, session: "morning" | "afternoon" | null): Promise<AttendanceRecord[]> {
    const schoolId = this.getSchoolId()
    if (!schoolId) return []
    const sessionParam = session ? `&session=${session}` : `&session=none`
    const url = `${API_URL}/api/attendance?date=${date}${sessionParam}&_t=${Date.now()}`
    const result = await apiFetch<{ success: boolean; data: any[] }>(
      url, 
      { 
        headers: this.getApiHeaders(), 
        cache: 'no-store' 
      }
    )
    return result.data.map((r: any) => attendance.mapAttendance(r, schoolId))
  }

  async getAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const schoolId = this.getSchoolId()
    if (!schoolId) return []
    const result = await apiFetch<{ success: boolean; data: any[] }>(
      `${API_URL}/api/attendance?startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`,
      { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      }
    )
    return result.data.map((r: any) => attendance.mapAttendance(r, schoolId))
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
    const result = await apiFetch<{ success: boolean; data: any }>(
      `${API_URL}/api/attendance`,
      {
        method: "POST",
        headers: this.getApiHeaders(),
        body: JSON.stringify({
          studentId: record.student_id,
          status: record.status,
          session: record.session || null,
          remarks: record.remarks || record.note || "",
          date: recDate ? new Date(recDate).toISOString() : new Date().toISOString(),
        }),
      }
    )
    return attendance.mapAttendance(result.data, schoolId)
  }

  async getAttendanceByStudent(studentId: string, schoolId: string): Promise<AttendanceRecord[]> {
    const result = await apiFetch<{ success: boolean; data: any[] }>(
      `${API_URL}/api/attendance/student/${studentId}?_t=${Date.now()}`,
      {
        headers: this.getApiHeaders(),
        cache: 'no-store'
      }
    )
    return result.data.map((r: any) => attendance.mapAttendance(r, schoolId))
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  async getSettings(): Promise<any> {
    return settings.getSettings(this.getApiHeaders(), this.getSchoolId())
  }

  async updateSettings(settingsData: any): Promise<void> {
    const schoolId = this.getSchoolId()
    if (!schoolId) return
    await apiFetch(
      `${API_URL}/api/settings`,
      {
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
      }
    )
  }

  async resetSettings(): Promise<void> {
    const schoolId = this.getSchoolId()
    if (!schoolId) return
    await apiFetch(
      `${API_URL}/api/settings`,
      {
        method: "PUT",
        headers: this.getApiHeaders(),
        body: JSON.stringify(settings.defaultSettings()),
      }
    )
  }

  // ─── TEACHERS ─────────────────────────────────────────────────────────────
  async getTeachers(): Promise<any[]> {
    return teachers.getTeachers(this.getApiHeaders())
  }

  async createTeacher(teacherData: any): Promise<any> {
    const schoolId = this.getSchoolId()
    if (!schoolId) throw new Error("School ID not found")
    const result = await apiFetch<{ success: boolean; data: any }>(
      `${API_URL}/api/users`,
      {
        method: "POST",
        headers: this.getApiHeaders(),
        body: JSON.stringify({
          ...teacherData,
          role: "teacher",
          password_hash: teacherData.password || teacherData.password_hash || "demo123456",
          schoolId: schoolId,
          is_active: true,
        }),
      }
    )
    return result.data
  }

  async updateTeacher(teacherId: string, teacherData: any): Promise<void> {
    await apiFetch(
      `${API_URL}/api/users/${teacherId}`,
      {
        method: "PUT",
        headers: this.getApiHeaders(),
        body: JSON.stringify(teacherData),
      }
    )
  }

  async deleteTeacher(teacherId: string): Promise<void> {
    await apiFetch(
      `${API_URL}/api/users/${teacherId}`,
      {
        method: "DELETE",
        headers: this.getApiHeaders(),
      }
    )
  }

  // ─── TEACHER ASSIGNMENTS ──────────────────────────────────────────────────
  async getTeacherAssignments(schoolId?: string, teacherId?: string): Promise<TeacherAssignment[]> {
    return teachers.getTeacherAssignments(this.getApiHeaders(), schoolId || this.getSchoolId(), teacherId)
  }

  async assignTeacherToClass(
    teacherId: string, classId: string, subject?: string,
    grade?: string, section?: string, stream?: string,
  ): Promise<TeacherAssignment | null> {
    const schoolId = this.getSchoolId()
    if (!schoolId) throw new Error("School ID not found")
    const result = await apiFetch<{ success: boolean; data: any }>(
      `${API_URL}/api/assignments`,
      {
        method: "POST",
        headers: this.getApiHeaders(),
        body: JSON.stringify({ 
          teacher_id: teacherId, 
          gradeId: grade, 
          sectionId: section, 
          streamId: stream,
          subject 
        }),
      }
    )
    return result.data
  }

  async removeTeacherAssignment(assignmentId: string): Promise<void> {
    await apiFetch(
      `${API_URL}/api/assignments/${assignmentId}`,
      {
        method: "DELETE",
        headers: this.getApiHeaders(),
      }
    )
  }

  async updateTeacherAssignment(assignmentId: string, data: any): Promise<void> {
    await apiFetch(
      `${API_URL}/api/assignments/${assignmentId}`,
      {
        method: "PUT",
        headers: this.getApiHeaders(),
        body: JSON.stringify({ 
          teacher_id: data.teacher_id, 
          gradeId: data.gradeId, 
          sectionId: data.sectionId, 
          streamId: data.streamId || null,
          subject: data.subject || null 
        }),
      }
    )
  }

  // ─── ACADEMIC ENTITIES ────────────────────────────────────────────────────
  async getGrades(): Promise<any[]> {
    const result = await apiFetch<{ success: boolean; data: any[] }>(
      `${API_URL}/api/schools/me/grades?_t=${Date.now()}`,
      { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      }
    )
    return result.data
  }

  async getSections(): Promise<any[]> {
    const result = await apiFetch<{ success: boolean; data: any[] }>(
      `${API_URL}/api/schools/me/sections?_t=${Date.now()}`,
      { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      }
    )
    return result.data
  }

  async getStreams(): Promise<any[]> {
    const result = await apiFetch<{ success: boolean; data: any[] }>(
      `${API_URL}/api/schools/me/streams?_t=${Date.now()}`,
      { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      }
    )
    return result.data
  }

  async getUserByEmail(email: string): Promise<any> {
    const result = await apiFetch<{ success: boolean; data: any }>(
      `${API_URL}/api/users/by-email?email=${encodeURIComponent(email)}`
    )
    return result.data || null
  }

  async getSchoolById(schoolId: string): Promise<any> {
    const result = await apiFetch<{ success: boolean; data: any }>(
      `${API_URL}/api/schools/${schoolId}`
    )
    return result.data || null
  }

  async updateUserProfile(userId: string, profileData: any): Promise<void> {
    await apiFetch(
      `${API_URL}/api/users/${userId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: profileData.name }),
      }
    )
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    await apiFetch(
      `${API_URL}/api/users/${userId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_hash: newPassword }),
      }
    )
    return true
  }

  async initializeSchoolData(schoolId: string | number): Promise<void> {
    this.setSchoolId(schoolId)
    console.log("[pg] School session initialized for:", String(schoolId))
  }

  async addSchool(schoolData: any): Promise<string | null> {
    const result = await apiFetch<{ success: boolean; data: any }>(
      `${API_URL}/api/schools`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolData),
      }
    )
    return result.data?.id || null
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
    const settingsData = await this.getSettings()
    const query = new URLSearchParams({ 
      ...filters, 
      mode: settingsData.attendanceMode,
      _t: Date.now().toString() 
    }).toString()
    const result = await apiFetch<{ success: boolean; data: any[] }>(
      `${API_URL}/api/attendance-analytics/trends?${query}`,
      { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      }
    )
    return result.data
  }

  async getAttendanceDrillDownStats(gradeId: string, filters: any = {}): Promise<any[]> {
    const settingsData = await this.getSettings()
    const query = new URLSearchParams({ 
      ...filters, 
      mode: settingsData.attendanceMode,
      _t: Date.now().toString() 
    }).toString()
    const result = await apiFetch<{ success: boolean; data: any[] }>(
      `${API_URL}/api/attendance-analytics/drill-down/${gradeId}?${query}`,
      { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      }
    )
    return result.data
  }

  async exportAttendanceReport(filters: any = {}): Promise<Blob | null> {
    const settingsData = await this.getSettings()
    const query = new URLSearchParams({ 
      ...filters, 
      mode: settingsData.attendanceMode,
      format: 'csv', 
      _t: Date.now().toString() 
    }).toString()
    const response = await this.fetch(
      `${API_URL}/api/attendance-analytics/export?${query}`,
      { 
        headers: this.getApiHeaders(),
        cache: 'no-store'
      }
    )
    if (!response.ok) return null
    return await response.blob()
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

