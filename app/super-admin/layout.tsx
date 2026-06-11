import React from 'react'
import SuperAdminClientLayout from '@/components/super-admin/client-layout'

export const metadata = {
  title: 'Super Admin Dashboard - Zetime',
  description: 'School management super admin dashboard',
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SuperAdminClientLayout>
      {children}
    </SuperAdminClientLayout>
  )
}
