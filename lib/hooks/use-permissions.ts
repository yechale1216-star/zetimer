'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/auth-context'
import { apiFetch } from '@/lib/utils/fetch-with-timeout'
import { API_URL } from '@/lib/api-config'

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, Record<string, boolean>>> = {
  registrar: {
    students:             { view: true,  create: true,  edit: true,  delete: false },
    teachers:             { view: true,  create: false, edit: false, delete: false },
    assignments:          { view: true,  assign: false, remove: false },
    promotion:            { view: true,  promote: false, reverse: false },
    attendance:           { view: true,  mark: false, export: false },
    attendance_analytics: { view: true,  export: false },
    discipline:           { view: false, create: false, resolve: false },
    calls:                { view: false, make: false },
    communication:        { view: true,  send: false },
    reports:              { view: true,  export: true },
    announcements:        { view: true,  create: false },
    settings:             { view: false, edit: false },
    subscription:         { view: false, manage: false },
    support:              { view: true,  create_ticket: true },
    profile:              { view: true,  edit: true },
    users:                { view: false, create_user: false, edit_user: false, delete_user: false, manage_roles: false },
  },
  discipline_officer: {
    students:             { view: true,  create: false, edit: false, delete: false },
    teachers:             { view: true,  create: false, edit: false, delete: false },
    assignments:          { view: false, assign: false, remove: false },
    promotion:            { view: false, promote: false, reverse: false },
    attendance:           { view: true,  mark: false, export: false },
    attendance_analytics: { view: false, export: false },
    discipline:           { view: true,  create: true,  resolve: true },
    calls:                { view: false, make: false },
    communication:        { view: true,  send: true },
    reports:              { view: true,  export: true },
    announcements:        { view: true,  create: false },
    settings:             { view: false, edit: false },
    subscription:         { view: false, manage: false },
    support:              { view: true,  create_ticket: true },
    profile:              { view: true,  edit: true },
    users:                { view: false, create_user: false, edit_user: false, delete_user: false, manage_roles: false },
  },
  call_center: {
    students:             { view: true,  create: false, edit: false, delete: false },
    teachers:             { view: false, create: false, edit: false, delete: false },
    assignments:          { view: false, assign: false, remove: false },
    promotion:            { view: false, promote: false, reverse: false },
    attendance:           { view: true,  mark: false, export: false },
    attendance_analytics: { view: false, export: false },
    discipline:           { view: false, create: false, resolve: false },
    calls:                { view: true,  make: true },
    communication:        { view: true,  send: true },
    reports:              { view: true,  export: false },
    announcements:        { view: true,  create: false },
    settings:             { view: false, edit: false },
    subscription:         { view: false, manage: false },
    support:              { view: true,  create_ticket: true },
    profile:              { view: true,  edit: true },
    users:                { view: false, create_user: false, edit_user: false, delete_user: false, manage_roles: false },
  },
  teacher: {
    students:             { view: true,  create: false, edit: false, delete: false },
    teachers:             { view: true,  create: false, edit: false, delete: false },
    assignments:          { view: true,  assign: false, remove: false },
    promotion:            { view: false, promote: false, reverse: false },
    attendance:           { view: true,  mark: true,  export: false },
    attendance_analytics: { view: true,  export: false },
    discipline:           { view: true,  create: true,  resolve: false },
    calls:                { view: false, make: false },
    communication:        { view: true,  send: true },
    reports:              { view: true,  export: false },
    announcements:        { view: true,  create: false },
    settings:             { view: false, edit: false },
    subscription:         { view: false, manage: false },
    support:              { view: true,  create_ticket: true },
    profile:              { view: true,  edit: true },
    users:                { view: false, create_user: false, edit_user: false, delete_user: false, manage_roles: false },
  },
}

export function usePermissions() {
  const { user } = useAuth()
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>> | null>(null)
  const [loading, setLoading] = useState(true)

  const roleKey = user?.role?.toLowerCase() || ''
  const isAdmin = ['admin', 'school_admin', 'super_admin'].includes(roleKey)

  useEffect(() => {
    if (!user || !roleKey) {
      setLoading(false)
      return
    }

    if (isAdmin) {
      setLoading(false)
      return
    }

    const fetchPermissions = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('attendance_token') : null
        const schoolId = typeof window !== 'undefined' ? localStorage.getItem('x-school-id') : null
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        if (schoolId) headers['x-school-id'] = schoolId

        const res = await apiFetch<{ success: boolean; data: any }>(`${API_URL}/api/roles/${roleKey}`, { headers })
        if (res.data?.permissions) {
          setRolePermissions(res.data.permissions)
        } else if (DEFAULT_ROLE_PERMISSIONS[roleKey]) {
          setRolePermissions(DEFAULT_ROLE_PERMISSIONS[roleKey])
        }
      } catch (err) {
        if (DEFAULT_ROLE_PERMISSIONS[roleKey]) {
          setRolePermissions(DEFAULT_ROLE_PERMISSIONS[roleKey])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [user, roleKey, isAdmin])

  const hasModulePermission = (moduleKey: string, action: string = 'view'): boolean => {
    if (isAdmin) return true
    if (moduleKey === 'dashboard' || moduleKey === 'profile') return true

    if (!rolePermissions) {
      const fallback = DEFAULT_ROLE_PERMISSIONS[roleKey]
      if (fallback && fallback[moduleKey]) {
        return !!fallback[moduleKey][action]
      }
      return false
    }

    return !!rolePermissions[moduleKey]?.[action]
  }

  return {
    isAdmin,
    rolePermissions,
    loading,
    hasModulePermission,
  }
}
