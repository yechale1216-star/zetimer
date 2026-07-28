import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost/dummy")

async function verifySuperAdmin(userId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id FROM users WHERE id = ${userId} AND role = 'super_admin'
    `
    return result.length > 0
  } catch (error) {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const metricType = searchParams.get("metricType")

    if (!userId || !(await verifySuperAdmin(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    let analytics: any = {}

    // Overall system metrics
    if (!metricType || metricType === "overview") {
      const schoolsResult = await sql`SELECT COUNT(*) as count FROM schools WHERE status = 'active'`
      const usersResult = await sql`SELECT COUNT(*) as count FROM users WHERE is_active = true`
      const studentsResult = await sql`SELECT COUNT(*) as count FROM students WHERE is_active = true`
      const teachersResult = await sql`SELECT COUNT(*) as count FROM teachers WHERE is_active = true`

      analytics.overview = {
        totalSchools: schoolsResult[0]?.count || 0,
        totalUsers: usersResult[0]?.count || 0,
        totalStudents: studentsResult[0]?.count || 0,
        totalTeachers: teachersResult[0]?.count || 0,
      }
    }

    // School-wise breakdown
    if (!metricType || metricType === "schoolBreakdown") {
      const breakdown = await sql`
        SELECT 
          s.id, 
          s.name,
          COUNT(DISTINCT st.id) as student_count,
          COUNT(DISTINCT t.id) as teacher_count,
          COUNT(DISTINCT c.id) as class_count,
          AVG(CAST(ar.attendance_percentage AS DECIMAL)) as avg_attendance
        FROM schools s
        LEFT JOIN students st ON s.id = st.school_id AND st.is_active = true
        LEFT JOIN teachers t ON s.id = t.school_id AND t.is_active = true
        LEFT JOIN classes c ON s.id = c.school_id
        LEFT JOIN attendance_reports ar ON st.id = ar.student_id
        WHERE s.status = 'active'
        GROUP BY s.id, s.name
        ORDER BY student_count DESC
        LIMIT 10
      `
      analytics.schoolBreakdown = breakdown
    }

    // User role distribution
    if (!metricType || metricType === "userDistribution") {
      const distribution = await sql`
        SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role
      `
      analytics.userDistribution = distribution
    }

    // Recent activity
    if (!metricType || metricType === "recentActivity") {
      const activity = await sql`
        SELECT 
          al.id,
          al.action,
          al.entity_type,
          al.created_at,
          u.full_name,
          s.name as school_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN schools s ON al.entity_id = s.id AND al.entity_type = 'SCHOOL'
        ORDER BY al.created_at DESC
        LIMIT 20
      `
      analytics.recentActivity = activity
    }

    // Attendance trends
    if (!metricType || metricType === "attendanceTrends") {
      const trends = await sql`
        SELECT 
          EXTRACT(MONTH FROM ar.created_at) as month,
          EXTRACT(YEAR FROM ar.created_at) as year,
          AVG(CAST(ar.attendance_percentage AS DECIMAL)) as avg_attendance,
          COUNT(*) as total_records
        FROM attendance_reports ar
        WHERE ar.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY year, month
        ORDER BY year DESC, month DESC
        LIMIT 6
      `
      analytics.attendanceTrends = trends
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("[v0] Error fetching analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

