import { createBrowserClient } from "@supabase/ssr"
import { hash, compare } from "bcryptjs"
import { createServerSupabaseClient } from "@/lib/utils/supabase-server"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key',
)

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash)
}

export async function loginUser(email: string, password: string) {
  try {
    const serverSupabase = await createServerSupabaseClient()

    // Get user from database
    const { data: user, error: userError } = await serverSupabase
      .from("users")
      .select("id, email, full_name, role, school_id, password_hash, is_active")
      .eq("email", email)
      .single()

    if (userError || !user) {
      return { success: false, error: "Invalid email or password" }
    }

    if (!user.is_active) {
      return { success: false, error: "This account has been deactivated" }
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.password_hash)
    if (!passwordMatch) {
      return { success: false, error: "Invalid email or password" }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        school_id: user.school_id,
      },
    }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, error: "Login failed" }
  }
}

export async function registerUser(email: string, password: string, fullName: string, schoolId: string, role: string) {
  try {
    const serverSupabase = await createServerSupabaseClient()

    // Check if user already exists
    const { data: existingUser } = await serverSupabase.from("users").select("id").eq("email", email).single()

    if (existingUser) {
      return { success: false, error: "Email already registered" }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const { data: newUser, error: createError } = await serverSupabase
      .from("users")
      .insert({
        email,
        full_name: fullName,
        password_hash: passwordHash,
        school_id: schoolId,
        role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error("Create user error:", createError)
      return { success: false, error: "Failed to create account" }
    }

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        school_id: newUser.school_id,
      },
    }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, error: "Registration failed" }
  }
}

export async function getUserSession() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error("Session error:", error)
    return null
  }
}

export async function logoutUser() {
  try {
    await supabase.auth.signOut()
    return { success: true }
  } catch (error) {
    console.error("Logout error:", error)
    return { success: false, error: "Logout failed" }
  }
}
