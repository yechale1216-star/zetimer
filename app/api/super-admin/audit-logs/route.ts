import { neon } from "@neondatabase/serverless"
import { type NextRequest, NextResponse } from "next/server"
import { getCurrentSuperAdmin } from "@/lib/auth/super-admin-auth"

const sql = neon(process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost/dummy")

export async function GET(request: NextRequest) {
  try {
    const superAdmin = await getCurrentSuperAdmin()

    if (!superAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get("action")
    const entityType = searchParams.get("entityType")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    let query = `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.created_at,
        u.full_name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (action) {
      query += ` AND al.action = $${params.length + 1}`
      params.push(action)
    }

    if (entityType) {
      query += ` AND al.entity_type = $${params.length + 1}`
      params.push(entityType)
    }

    if (startDate) {
      query += ` AND al.created_at >= $${params.length + 1}`
      params.push(new Date(startDate))
    }

    if (endDate) {
      query += ` AND al.created_at <= $${params.length + 1}`
      params.push(new Date(endDate))
    }

    query += ` ORDER BY al.created_at DESC`
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, (page - 1) * limit)

    const logs = await (sql as any)(query, params)

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM audit_logs WHERE 1=1`
    const countParams: any[] = []

    if (action) {
      countQuery += ` AND action = $${countParams.length + 1}`
      countParams.push(action)
    }

    if (entityType) {
      countQuery += ` AND entity_type = $${countParams.length + 1}`
      countParams.push(entityType)
    }

    if (startDate) {
      countQuery += ` AND created_at >= $${countParams.length + 1}`
      countParams.push(new Date(startDate))
    }

    if (endDate) {
      countQuery += ` AND created_at <= $${countParams.length + 1}`
      countParams.push(new Date(endDate))
    }

    const countResult = await (sql as any)(countQuery, countParams)
    const total = countResult[0]?.count || 0

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("[v0] Error fetching audit logs:", error)
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
    const { action, entityType, entityId, oldValues, newValues } = body

    const result = await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, created_at)
      VALUES (${superAdmin.id}, ${action}, ${entityType}, ${entityId || null}, ${JSON.stringify(oldValues || {})}, ${JSON.stringify(newValues || {})}, now())
      RETURNING *
    `

    return NextResponse.json(
      { message: "Audit log created", log: result[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error("[v0] Error creating audit log:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


