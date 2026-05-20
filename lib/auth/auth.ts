"use client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export interface LoginCredentials {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  phone?: string
  name: string
  role: string
  schoolId: string
  schoolName: string
  schoolLogo?: string
  teacherId: string
  isSuperAdmin: boolean
  profile_photo?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: User
  error?: string
}

export interface SignupCredentials {
  email: string
  password: string
  confirmPassword: string
  role: "admin" | "teacher"
  name: string
  phone: string
  schoolId?: string
  schoolName?: string
}

class AuthService {
  private readonly CURRENT_USER_KEY = "attendance_current_user"

  private isClient(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined"
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log("[pg] Login attempt for:", credentials.email)

      // Verify password against PostgreSQL
      const verifyRes = await fetch(`${API_URL}/api/users/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyData.success || !verifyData.valid) {
        return { success: false, message: "Invalid credentials", error: "Invalid email or password" }
      }

      const dbUser = verifyData.data

      // Get school name
      let schoolName = "My School"
      if (dbUser.school_id) {
        try {
          const schoolRes = await fetch(`${API_URL}/api/schools/${dbUser.school_id}`)
          const schoolData = await schoolRes.json()
          if (schoolData.success && schoolData.data) schoolName = schoolData.data.name
        } catch { /* school lookup is non-fatal */ }
      }

      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        phone: dbUser.phone || "",
        name: dbUser.full_name,
        role: dbUser.role,
        schoolId: dbUser.school_id || "",
        schoolName,
        teacherId: dbUser.teacher_id || "",
        isSuperAdmin: dbUser.role === "super_admin",
        profile_photo: dbUser.profile_photo || "",
      }

      if (this.isClient()) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user))
        if (user.schoolId) {
          const { db } = await import("@/lib/db/database")
          db.initializeSchoolData(user.schoolId)
        }
      }

      return { success: true, message: "Login successful", user }
    } catch (error) {
      console.error("[pg] Login error:", error)
      return { success: false, message: "Login failed", error: "An error occurred during login" }
    }
  }

  // ─── PARENT LOGIN & SECURITY ───────────────────────────────────────────────
  async searchParentByPhone(phone: string): Promise<any> {
    try {
      const res = await fetch(`${API_URL}/api/parent/search?phone=${encodeURIComponent(phone)}`);
      return await res.json();
    } catch (error) {
      console.error("[pg] Parent search error:", error);
      return { success: false, message: "Network error during search" };
    }
  }

  async loginParent(phone: string, password: string): Promise<AuthResponse> {
    try {
      console.log("[pg] Parent login attempt for phone:", phone);
      
      const res = await fetch(`${API_URL}/api/parent/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || "Invalid credentials", error: "Login failed" };
      }

      const parentName = data.parentName || "Parent";
      const students = data.students || [];
      const schoolId = students[0]?.school_id || "";

      // Fetch school name
      let schoolName = "My School";
      if (schoolId) {
        try {
          const schoolRes = await fetch(`${API_URL}/api/schools/${schoolId}`);
          const schoolData = await schoolRes.json();
          if (schoolData.success && schoolData.data) schoolName = schoolData.data.name;
        } catch { /* school lookup is non-fatal */ }
      }

      const user: User = {
        id: `parent-${phone}`,
        email: `parent-${phone}@zetime.com`,
        phone: phone,
        name: parentName,
        role: "parent",
        schoolId: schoolId,
        schoolName,
        teacherId: "",
        isSuperAdmin: false,
        profile_photo: "",
      };

      if (this.isClient()) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
        localStorage.setItem("parent_students", JSON.stringify(students));
        if (user.schoolId) {
          const { db } = await import("@/lib/db/database");
          db.initializeSchoolData(user.schoolId);
        }
      }

      return { success: true, message: "Login successful", user };
    } catch (error) {
      console.error("[pg] Parent login error:", error);
      return { success: false, message: "Login failed", error: "An error occurred during parent login" };
    }
  }

  async updateParentPassword(phone: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const res = await fetch(`${API_URL}/api/parent/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || "Failed to update password", error: "Update failed" };
      }
      return { success: true, message: data.message || "Password updated successfully" };
    } catch (error) {
      return { success: false, message: "Server connection failed", error: "Connection error" };
    }
  }

  // ─── SIGNUP ───────────────────────────────────────────────────────────────
  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      console.log("[pg] Signup attempt for:", credentials.email)

      if (!this.isValidEthiopianPhone(credentials.phone)) {
        return {
          success: false,
          message: "Invalid Phone Number",
          error: "Please enter a valid Ethiopian phone number starting with +251.",
        }
      }

      // Check if user already exists in PostgreSQL
      const checkRes = await fetch(`${API_URL}/api/users/by-email?email=${encodeURIComponent(credentials.email)}`)
      const checkData = await checkRes.json()
      if (checkData.success && checkData.data) {
        return { success: false, message: "Account exists", error: "Email already registered" }
      }

      let schoolId = ""
      let schoolName = credentials.schoolName || "My School"

      // Create school in PostgreSQL first (admin only)
      if (credentials.role === "admin" && credentials.schoolName) {
        const schoolRes = await fetch(`${API_URL}/api/schools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: credentials.schoolName }),
        })
        const schoolData = await schoolRes.json()
        if (!schoolData.success) throw new Error("Failed to create school")
        schoolId = schoolData.data.id
        schoolName = schoolData.data.name
        console.log("[pg] School created in PostgreSQL:", schoolId)
      }

      // Create user in PostgreSQL
      const userRes = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: credentials.email,
          password_hash: credentials.password,
          full_name: credentials.name,
          role: credentials.role,
          phone: credentials.phone,
          school_id: schoolId || null,
          is_active: true,
        }),
      })
      const userData = await userRes.json()
      if (!userData.success) throw new Error(userData.message || "Failed to create user")
      const newUser = userData.data

      const user: User = {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone || "",
        name: newUser.full_name,
        role: newUser.role,
        schoolId: newUser.school_id || "",
        schoolName,
        teacherId: "",
        isSuperAdmin: false,
        profile_photo: newUser.profile_photo || "",
      }

      if (this.isClient()) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user))
        if (user.schoolId) {
          const { db } = await import("@/lib/db/database")
          db.initializeSchoolData(user.schoolId)
        }
      }

      return { success: true, message: "Account created successfully", user }
    } catch (error) {
      console.error("[pg] Signup error:", error)
      return { success: false, message: "Signup failed", error: "An error occurred during registration" }
    }
  }

  // ─── UPDATE SCHOOL INFO ───────────────────────────────────────────────────
  async updateSchoolInfo(name: string, _code: string, _phone?: string, _logo?: string): Promise<AuthResponse> {
    try {
      const user = this.getCurrentUser()
      if (!user) throw new Error("No user logged in")

      let schoolId = user.schoolId

      if (schoolId) {
        // Update existing school name in PostgreSQL
        await fetch(`${API_URL}/api/schools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: schoolId, name }),
        })
      } else {
        // Create new school
        const res = await fetch(`${API_URL}/api/schools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
        const data = await res.json()
        if (!data.success) throw new Error("Failed to create school")
        schoolId = data.data.id

        // Link user to new school
        await fetch(`${API_URL}/api/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ school_id: schoolId }),
        })
      }

      const updatedUser: User = { ...user, schoolId, schoolName: name }
      if (this.isClient()) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(updatedUser))
      }

      return { success: true, message: "School setup complete", user: updatedUser }
    } catch (error) {
      console.error("[pg] updateSchoolInfo error:", error)
      return { success: false, message: "Failed to setup school", error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  isValidEthiopianPhone(phone: string): boolean {
    return /^\+251[179]\d{8}$/.test(phone.trim())
  }

  logout(): void {
    if (this.isClient()) {
      localStorage.removeItem(this.CURRENT_USER_KEY)
    }
    console.log("[pg] User logged out")
  }

  getCurrentUser(): User | null {
    if (!this.isClient()) return null
    try {
      const userStr = localStorage.getItem(this.CURRENT_USER_KEY)
      return userStr ? JSON.parse(userStr) : null
    } catch {
      return null
    }
  }
  
  // ─── PASSWORD RESET (MOCK) ────────────────────────────────────────────────
  async requestPasswordReset(email: string): Promise<AuthResponse> {
    console.log("[pg] Mock password reset request for:", email)
    return new Promise((resolve) => setTimeout(() => resolve({ success: true, message: "Reset link sent if account exists" }), 800))
  }
  
  async verifyResetToken(token: string): Promise<{ success: boolean; valid: boolean; email?: string }> {
    console.log("[pg] Mock verify reset token:", token)
    return { success: true, valid: true, email: "demo@user.com" }
  }
  
  async resetPassword(token: string, password: string): Promise<AuthResponse> {
    console.log("[pg] Mock reset password with token:", token, "and password:", password)
    return { success: true, message: "Password updated successfully" }
  }

  isAuthenticated(): boolean { return this.getCurrentUser() !== null }
  isSuperAdmin(): boolean { return this.getCurrentUser()?.role === "super_admin" || false }
  isAdmin(): boolean { return this.getCurrentUser()?.role === "admin" || false }
  isTeacher(): boolean { return this.getCurrentUser()?.role === "teacher" || false }
}

export const authService = new AuthService()
