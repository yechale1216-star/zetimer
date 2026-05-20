'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye } from 'lucide-react'

// Mock data
const mockLogs = [
  {
    id: 1,
    timestamp: '2024-05-13 10:30:45',
    user: 'John Doe',
    action: 'create',
    resource: 'School - Springfield High',
    ipAddress: '192.168.1.100',
    status: 'success',
  },
  {
    id: 2,
    timestamp: '2024-05-13 09:15:22',
    user: 'Sarah Johnson',
    action: 'update',
    resource: 'User - Michael Chen',
    ipAddress: '10.0.0.50',
    status: 'success',
  },
  {
    id: 3,
    timestamp: '2024-05-13 08:45:10',
    user: 'Admin System',
    action: 'login',
    resource: 'Super Admin Account',
    ipAddress: '172.16.0.1',
    status: 'success',
  },
  {
    id: 4,
    timestamp: '2024-05-12 16:20:33',
    user: 'Emily Williams',
    action: 'delete',
    resource: 'School - Closed Academy',
    ipAddress: '192.168.1.105',
    status: 'success',
  },
  {
    id: 5,
    timestamp: '2024-05-12 14:55:12',
    user: 'David Martinez',
    action: 'export',
    resource: 'Subscription Report',
    ipAddress: '10.0.0.75',
    status: 'success',
  },
  {
    id: 6,
    timestamp: '2024-05-12 13:10:00',
    user: 'Unknown User',
    action: 'login',
    resource: 'Super Admin Account',
    ipAddress: '203.0.113.42',
    status: 'failed',
  },
]

interface AuditLogsTableProps {
  searchQuery: string
  actionFilter: string
}

export function AuditLogsTable({ searchQuery, actionFilter }: AuditLogsTableProps) {
  const [page, setPage] = useState(1)
  const itemsPerPage = 15

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery)

    const matchesAction = actionFilter === 'all' || log.action === actionFilter

    return matchesSearch && matchesAction
  })

  const paginatedLogs = filteredLogs.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-500/20 text-green-700 dark:text-green-400',
      update: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
      delete: 'bg-red-500/20 text-red-700 dark:text-red-400',
      login: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
      export: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    }
    return colors[action] || 'bg-gray-500/20 text-gray-700 dark:text-gray-400'
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      login: 'Login',
      export: 'Export',
    }
    return labels[action] || action
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
        <CardDescription>Total: {filteredLogs.length} events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Resource</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">IP Address</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <td className="py-3 px-4 text-sm text-muted-foreground">{log.timestamp}</td>
                  <td className="py-3 px-4 text-sm font-medium text-foreground">{log.user}</td>
                  <td className="py-3 px-4">
                    <Badge className={getActionColor(log.action)}>{getActionLabel(log.action)}</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{log.resource}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground font-mono text-xs">{log.ipAddress}</td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        log.status === 'success'
                          ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                          : 'bg-red-500/20 text-red-700 dark:text-red-400'
                      }
                    >
                      {log.status === 'success' ? 'Success' : 'Failed'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * itemsPerPage + 1, filteredLogs.length)} to{' '}
            {Math.min(page * itemsPerPage, filteredLogs.length)} of {filteredLogs.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page * itemsPerPage >= filteredLogs.length}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
