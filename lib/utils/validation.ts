export class ValidationService {
  static validateName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: "Name is required" }
    }
    if (name.trim().length < 2) {
      return { isValid: false, error: "Name must be at least 2 characters" }
    }
    return { isValid: true }
  }

  static validateStudentId(
    studentId: string,
    existingIds: string[],
    currentId?: string,
  ): { isValid: boolean; error?: string } {
    if (!studentId || studentId.trim().length === 0) {
      return { isValid: false, error: "Student ID is required" }
    }
    if (studentId.trim().length < 2) {
      return { isValid: false, error: "Student ID must be at least 2 characters" }
    }
    if (existingIds.includes(studentId) && studentId !== currentId) {
      return { isValid: false, error: `Student ID '${studentId}' already exists` }
    }
    return { isValid: true }
  }

  static validateRequired(value: string, field: string): { isValid: boolean; error?: string } {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: `${field} is required` }
    }
    return { isValid: true }
  }

  static validateEmail(email: string, optional: boolean = false): { isValid: boolean; error?: string } {
    if (!email || email.trim().length === 0) {
      if (optional) return { isValid: true };
      return { isValid: false, error: "Email is required" }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { isValid: false, error: "Invalid email format" }
    }
    return { isValid: true }
  }

  static validatePhone(phone: string): { isValid: boolean; error?: string } {
    if (!phone || phone.trim().length === 0) {
      return { isValid: false, error: "Phone number is required" }
    }
    // Strict Ethiopian +251 format check
    const cleaned = phone.trim()
    if (!/^\+251[179]\d{8}$/.test(cleaned)) {
      return { isValid: false, error: "Invalid Ethiopian phone format. Must be +251 followed by 9 digits (e.g., +251911223344)" }
    }
    return { isValid: true }
  }

  static validateCSVFile(file: File): { isValid: boolean; error?: string } {
    if (!file) {
      return { isValid: false, error: "Please select a file" }
    }
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      return { isValid: false, error: "Please upload a CSV file" }
    }
    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, error: "File size must be less than 5MB" }
    }
    return { isValid: true }
  }

  static validateDateRange(startDate: string, endDate: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!startDate) {
      errors.push("Start date is required")
    }
    if (!endDate) {
      errors.push("End date is required")
    }

    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (start > end) {
        errors.push("Start date must be before end date")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static combineValidationResults(...results: { isValid: boolean; error?: string }[]): {
    isValid: boolean
    errors: string[]
  } {
    const errors = results.filter((r) => !r.isValid).map((r) => r.error || "Validation error")
    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}
