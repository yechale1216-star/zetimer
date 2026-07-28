import { neon } from "@neondatabase/serverless"
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
    const key = searchParams.get("key")

    let query = "SELECT id, key, value, description, created_at, updated_at FROM system_settings WHERE 1=1"
    const params: any[] = []

    if (key) {
      query += ` AND key = $${params.length + 1}`
      params.push(key)
    }

    query += " ORDER BY key ASC"

    const settings = await (sql as any)(query, params)

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[v0] Error fetching settings:", error)
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
    const { key, value, description } = body

    if (!key) {
      return NextResponse.json({ error: "Setting key is required" }, { status: 400 })
    }

    // Check if setting already exists
    const existing = await sql`SELECT id FROM system_settings WHERE key = ${key}`

    let result
    if (existing.length > 0) {
      // Update existing
      result = await sql`
        UPDATE system_settings
        SET value = ${value || null}, description = ${description || null}, updated_at = now()
        WHERE key = ${key}
        RETURNING *
      `
    } else {
      // Create new
      result = await sql`
        INSERT INTO system_settings (key, value, description, created_at, updated_at)
        VALUES (${key}, ${value || null}, ${description || null}, now(), now())
        RETURNING *
      `
    }

    // Log the action
    await logAdminAction(
      superAdmin.id,
      existing.length > 0 ? 'UPDATE' : 'CREATE',
      'SETTING',
      result[0].id,
      { message: `${existing.length > 0 ? 'Updated' : 'Created'} setting: ${key}` }
    )

    return NextResponse.json(
      {
        message: existing.length > 0 ? "Setting updated" : "Setting created",
        setting: result[0],
      },
      { status: existing.length > 0 ? 200 : 201 }
    )
  } catch (error) {
    console.error("[v0] Error saving setting:", error)
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
    const key = searchParams.get("key")

    if (!key) {
      return NextResponse.json({ error: "Setting key is required" }, { status: 400 })
    }

    const oldResult = await sql`SELECT * FROM system_settings WHERE key = ${key}`

    await sql`DELETE FROM system_settings WHERE key = ${key}`

    // Log the action
    if (oldResult.length > 0) {
      await logAdminAction(superAdmin.id, 'DELETE', 'SETTING', oldResult[0].id, { message: `Deleted setting: ${key}` })
    }

    return NextResponse.json({ message: "Setting deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting setting:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}



