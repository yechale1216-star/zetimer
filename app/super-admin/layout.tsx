import React from 'react'
import SuperAdminClientLayout from '@/components/super-admin/client-layout'
import { createPageMetadata } from '@/lib/seo/metadata-constants'

export const metadata = createPageMetadata({
  title: 'Super Admin Dashboard',
  description: 'Global system administration, tenant management, subscription billing, and audit logs.',
  path: '/super-admin',
  noIndex: true,
})

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
