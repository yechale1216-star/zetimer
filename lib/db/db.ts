import { createBrowserClient } from "@supabase/ssr"

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Student functions
export async function getStudents(schoolId: string) {
  const { data, error } = await supabase.from("students").select("*").eq("school_id", schoolId)

  if (error) throw error
  return data
}

export async function addStudent(studentData: any) {
  const { data, error } = await supabase.from("students").insert([studentData]).select()

  if (error) throw error
  return data[0]
}

// Attendance functions
export async function recordAttendance(attendanceData: any) {
  const { data, error } = await supabase.from("attendance").insert([attendanceData]).select()

  if (error) throw error
  return data[0]
}

export async function getAttendance(schoolId: string, date?: string) {
  let query = supabase.from("attendance").select("*").eq("school_id", schoolId)

  if (date) {
    query = query.eq("attendance_date", date)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// Class functions
export async function getClasses(schoolId: string) {
  const { data, error } = await supabase.from("classes").select("*").eq("school_id", schoolId)

  if (error) throw error
  return data
}

export async function addClass(classData: any) {
  const { data, error } = await supabase.from("classes").insert([classData]).select()

  if (error) throw error
  return data[0]
}

// Report functions
export async function getAttendanceReport(schoolId: string, studentId?: string) {
  let query = supabase.from("attendance_reports").select("*").eq("school_id", schoolId)

  if (studentId) {
    query = query.eq("student_id", studentId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}
