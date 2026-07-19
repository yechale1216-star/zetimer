import { neon } from "@neondatabase/serverless"
import { hash } from "bcryptjs"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentSuperAdmin, logAdminAction } from "@/lib/auth/super-admin-auth"

export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost/dummy")

export async function GET(request: NextRequest) {
  try {
    const superAdmin = await getCurrentSuperAdmin()

    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get("role")
    const schoolId = searchParams.get("schoolId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    let query = `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at`
    const params: any[] = []

    if (role === "admin") {
      query += `, s.id as school_id, s.name as school_name FROM users u
        LEFT JOIN schools s ON u.id = s.admin_id
        WHERE u.role = 'admin'`
    } else if (role === "teacher") {
      query += `, t.school_id, s.name as school_name FROM users u
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN schools s ON t.school_id = s.id
        WHERE u.role = 'teacher'`
      if (schoolId) {
        query += ` AND t.school_id = $${params.length + 1}`
        params.push(schoolId)
      }
    } else {
      query += ` FROM users`
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, (page - 1) * limit)

    const users = await (sql as any)(query, params)

    let countQuery = "SELECT COUNT(*) as count FROM users WHERE 1=1"
    if (role) {
      countQuery += ` AND role = '${role}'`
    }
    const countResult = await (sql as any)(countQuery)
    const total = countResult[0]?.count || 0

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("[v0] Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const superAdmin = await getCurrentSuperAdmin()

    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, fullName, role, password } = body

    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: "Email, name, and role are required" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await hash(password || "TempPassword123!", 10)

    const result = await sql`
      INSERT INTO users (email, full_name, password_hash, role, is_active, created_at, updated_at)
      VALUES (${email}, ${fullName}, ${passwordHash}, ${role}, true, now(), now())
      RETURNING id, email, full_name, role, created_at
    `

    // Log the action
    await logAdminAction(superAdmin.id, 'CREATE', 'USER', result[0].id, { message: `Created user: ${email}` })

    return NextResponse.json(
      { message: "User created successfully", user: result[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error("[v0] Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const superAdmin = await getCurrentSuperAdmin()

    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, fullName, email, role, isActive, password } = body

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get old values
    const oldResult = await sql`SELECT * FROM users WHERE id = ${id}`
    const oldValues = oldResult[0] || {}

    let updateQuery = `UPDATE users SET updated_at = now()`
    const params: any[] = []

    if (fullName) {
      updateQuery += `, full_name = $${params.length + 1}`
      params.push(fullName)
    }
    if (email) {
      updateQuery += `, email = $${params.length + 1}`
      params.push(email)
    }
    if (role) {
      updateQuery += `, role = $${params.length + 1}`
      params.push(role)
    }
    if (isActive !== undefined) {
      updateQuery += `, is_active = $${params.length + 1}`
      params.push(isActive)
    }
    if (password) {
      const passwordHash = await hash(password, 10)
      updateQuery += `, password_hash = $${params.length + 1}`
      params.push(passwordHash)
    }

    updateQuery += ` WHERE id = $${params.length + 1} RETURNING *`
    params.push(id)

    const result = await (sql as any)(updateQuery, params)

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Log the action
    await logAdminAction(superAdmin.id, 'UPDATE', 'USER', id, { message: `Updated user: ${email || result[0].email}` })

    return NextResponse.json({
      message: "User updated successfully",
      user: result[0],
    })
  } catch (error) {
    console.error("[v0] Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const superAdmin = await getCurrentSuperAdmin()

    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Prevent deleting super admins
    const user = await sql`SELECT role FROM users WHERE id = ${id}`
    if (user[0]?.role === "super_admin") {
      return NextResponse.json(
        { error: "Cannot delete super admin users" },
        { status: 400 }
      )
    }

    const oldResult = await sql`SELECT * FROM users WHERE id = ${id}`

    await sql`DELETE FROM users WHERE id = ${id}`

    // Log the action
    if (oldResult.length > 0) {
      await logAdminAction(superAdmin.id, 'DELETE', 'USER', id, { message: `Deleted user: ${oldResult[0].email}` })
    }

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}



