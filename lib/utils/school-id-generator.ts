/**
 * Generate a unique school ID based on school name
 * Format: First 2 letters of school name + 4 random alphanumeric characters
 * Example: HU0429, DU1984, etc.
 */
export function generateSchoolId(schoolName: string): string {
  const prefix = schoolName
    .trim()
    .substring(0, 2)
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .padEnd(2, "S") // Default to 'S' if name doesn't have 2 letters

  // Generate 4 random alphanumeric characters
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, "0")

  return `${prefix}${randomPart}`
}

/**
 * Validate school ID format (3-10 characters, alphanumeric)
 */
export function isValidSchoolId(schoolId: string): boolean {
  if (!schoolId) return false
  const trimmed = schoolId.trim()
  return trimmed.length >= 3 && trimmed.length <= 10 && /^[A-Z0-9]+$/i.test(trimmed)
}
