import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentSuperAdmin, logAdminAction, isSuperAdmin } from "@/lib/auth/super-admin-auth"

const sql = neon(process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost/dummy")

export async function GET(request: NextRequest) {
  try {
    const superAdmin = await getCurrentSuperAdmin()
    
    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    let query = `SELECT s.*, u.full_name as admin_name, u.email as admin_email, COUNT(st.id) as total_students, COUNT(t.id) as total_teachers
      FROM schools s
      LEFT JOIN users u ON s.admin_id = u.id
      LEFT JOIN students st ON s.id = st.school_id
      LEFT JOIN teachers t ON s.id = t.school_id`

    const params: any[] = []

    if (status) {
      query += ` WHERE s.status = $${params.length + 1}`
      params.push(status)
    }

    query += ` GROUP BY s.id, u.id`
    query += ` ORDER BY s.created_at DESC`
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, (page - 1) * limit)

    const schools = await (sql as any)(query, params)

    // Get total count
    let countQuery = "SELECT COUNT(*) as count FROM schools"
    if (status) {
      countQuery += ` WHERE status = '${status}'`
    }
    const countResult = await (sql as any)(countQuery)
    const total = countResult[0]?.count || 0

    return NextResponse.json({
      schools,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("[v0] Error fetching schools:", error)
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
    const { name, email, phone, address, adminId } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: "School name and email are required" },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO schools (name, email, phone, address, admin_id, status, created_at, updated_at)
      VALUES (${name}, ${email}, ${phone || null}, ${address || null}, ${adminId || null}, 'active', now(), now())
      RETURNING *
    `

    // Log the action
    await logAdminAction(superAdmin.id, 'CREATE', 'SCHOOL', result[0].id, { message: `Created school: ${name}` })

    return NextResponse.json(
      { message: "School created successfully", school: result[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error("[v0] Error creating school:", error)
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
    const { id, name, email, phone, address, status, adminId } = body

    if (!id) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 })
    }

    // Get old values for audit log
    const oldResult = await sql`SELECT * FROM schools WHERE id = ${id}`
    const oldValues = oldResult[0] || {}

    const result = await sql`
      UPDATE schools
      SET 
        name = COALESCE(${name || null}, name),
        email = COALESCE(${email || null}, email),
        phone = COALESCE(${phone || null}, phone),
        address = COALESCE(${address || null}, address),
        status = COALESCE(${status || null}, status),
        admin_id = COALESCE(${adminId || null}, admin_id),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }

    // Log the action
    await logAdminAction(superAdmin.id, 'UPDATE', 'SCHOOL', id, { message: `Updated school: ${name || 'unknown'}` })

    return NextResponse.json({
      message: "School updated successfully",
      school: result[0],
    })
  } catch (error) {
    console.error("[v0] Error updating school:", error)
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
      return NextResponse.json({ error: "School ID is required" }, { status: 400 })
    }

    const oldResult = await sql`SELECT * FROM schools WHERE id = ${id}`

    await sql`DELETE FROM schools WHERE id = ${id}`

    // Log the action
    if (oldResult.length > 0) {
      await logAdminAction(superAdmin.id, 'DELETE', 'SCHOOL', id, { message: `Deleted school: ${oldResult[0].name}` })
    }

    return NextResponse.json({ message: "School deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting school:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


