// Super Admin Authentication Utility
// This is a mock implementation for demo purposes
// In production, use proper authentication (Auth.js, Supabase, etc.)

export interface SuperAdmin {
  id: string
  email: string
  name: string
  role: 'admin' | 'super-admin'
  createdAt: string
}

// Mock super admin user
const mockSuperAdmin: SuperAdmin = {
  id: 'admin-1',
  email: 'admin@platform.com',
  name: 'Platform Admin',
  role: 'super-admin',
  createdAt: new Date().toISOString(),
}

export function getCurrentSuperAdmin(): SuperAdmin | null {
  // In production, get this from session/token
  return mockSuperAdmin
}

export function isSuperAdmin(admin: SuperAdmin | null): boolean {
  return admin?.role === 'super-admin'
}

export interface AdminAction {
  id: string
  adminId: string
  action: string
  entityType: string
  entityId: string
  changes?: Record<string, any>
  timestamp: string
}

// Mock audit log storage
const auditLogs: AdminAction[] = []

export function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes?: Record<string, any>
): AdminAction {
  const log: AdminAction = {
    id: `log-${Date.now()}`,
    adminId,
    action,
    entityType,
    entityId,
    changes,
    timestamp: new Date().toISOString(),
  }
  auditLogs.push(log)
  return log
}

export function getAuditLogs(limit: number = 50): AdminAction[] {
  return auditLogs.slice(-limit).reverse()
}
