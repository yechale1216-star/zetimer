'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Eye, Edit, Trash2, Loader2 } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'

interface User {
  id: string
  name: string
  email: string
  role: string
  school: string
  status: string
  joinDate: string
}

interface UsersListProps {
  searchQuery: string
  roleFilter: string
}

export function UsersList({ searchQuery, roleFilter }: UsersListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          q: searchQuery,
          role: roleFilter,
          page: String(page),
          limit: String(itemsPerPage)
        })
        const response = await fetch(`${getApiUrl()}/api/super-admin/users?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
          }
        })
        const result = await response.json()
        if (result.success) {
          setUsers(result.data.users)
          setTotal(result.data.total)
        } else {
          throw new Error(result.error || 'Failed to fetch users')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, roleFilter, page])

  const getRoleColor = (role: string) => {
    const r = role.toLowerCase()
    if (r === 'super_admin' || r === 'super-admin') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    if (r === 'school_admin' || r === 'admin') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    if (r === 'teacher') return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  }

  const getRoleLabel = (role: string) => {
    const r = role.toLowerCase()
    if (r === 'super_admin' || r === 'super-admin' || r === 'platform-admin') return 'Super Admin'
    if (r === 'school_admin' || r === 'admin') return 'School Admin'
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      : 'bg-muted text-muted-foreground border-border'
  }

  if (loading && page === 1 && users.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-20 text-center text-destructive">
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="typography-card-title">All Users</CardTitle>
        <CardDescription>Total: {total} users</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile View - Card Layout */}
        <div className="md:hidden space-y-3">
          {users.map((user) => (
            <div key={user.id} className="p-4 border border-border rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="typography-label text-foreground">{user.name}</p>
                    <p className="typography-helper text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="typography-helper grid grid-cols-2 gap-2">
                <div>
                  <p className="typography-label text-muted-foreground">Role</p>
                  <Badge variant="outline" className={`typography-label ${getRoleColor(user.role)} text-[10px] uppercase mt-1`}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
                <div>
                  <p className="typography-label text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`typography-label ${getStatusColor(user.status)} text-[10px] uppercase mt-1`}>
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="typography-helper text-muted-foreground">
                <p>School: {user.school}</p>
                <p>Joined: {user.joinDate}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="typography-body w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">User</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Email</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Role</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">School</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Status</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Join Date</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loading ? (
                <tr>
                   <td colSpan={7} className="py-20 text-center text-muted-foreground italic">
                     No users found matching your search.
                   </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="typography-label text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`typography-label ${getRoleColor(user.role)} text-[10px] uppercase`}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.school}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`typography-label ${getStatusColor(user.status)} text-[10px] uppercase`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.joinDate}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="typography-body flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
          <p className="text-muted-foreground order-2 sm:order-1">
            Showing {Math.min((page - 1) * itemsPerPage + 1, total)} to{' '}
            {Math.min(page * itemsPerPage, total)} of {total}
          </p>
          <div className="flex gap-2 order-1 sm:order-2">
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
              disabled={page * itemsPerPage >= total}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
