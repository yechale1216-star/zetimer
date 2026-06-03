'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Eye, Edit, Trash2 } from 'lucide-react'

// Mock data
const mockUsers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@zetime.io',
    role: 'super_admin',
    school: 'Zetime Admin',
    status: 'active',
    joinDate: '2024-01-15',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    email: 'sarah@springfield.edu',
    role: 'school_admin',
    school: 'Springfield High School',
    status: 'active',
    joinDate: '2024-02-20',
  },
  {
    id: 3,
    name: 'Michael Chen',
    email: 'michael@central.edu',
    role: 'teacher',
    school: 'Central Academy',
    status: 'active',
    joinDate: '2024-03-10',
  },
  {
    id: 4,
    name: 'Emily Williams',
    email: 'emily@lincoln.edu',
    role: 'teacher',
    school: 'Lincoln Elementary',
    status: 'inactive',
    joinDate: '2024-01-05',
  },
  {
    id: 5,
    name: 'David Martinez',
    email: 'david@washington.edu',
    role: 'student',
    school: 'Washington Middle School',
    status: 'active',
    joinDate: '2024-04-01',
  },
  {
    id: 6,
    name: 'Jessica Lee',
    email: 'jessica@jefferson.edu',
    role: 'teacher',
    school: 'Jefferson Technical High',
    status: 'active',
    joinDate: '2024-02-14',
  },
]

interface UsersListProps {
  searchQuery: string
  roleFilter: string
}

export function UsersList({ searchQuery, roleFilter }: UsersListProps) {
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.school.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      school_admin: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      teacher: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
      student: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    }
    return colors[role] || 'bg-muted text-muted-foreground border-border'
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      school_admin: 'School Admin',
      teacher: 'Teacher',
      student: 'Student',
    }
    return labels[role] || role
  }

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      : 'bg-muted text-muted-foreground border-border'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="typography-card-title">All Users</CardTitle>
        <CardDescription>Total: {filteredUsers.length} users</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile View - Card Layout */}
        <div className="md:hidden space-y-3">
          {paginatedUsers.map((user) => (
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
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Edit className="w-4 h-4" />
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
              {paginatedUsers.map((user) => (
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
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="typography-body flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
          <p className="text-muted-foreground order-2 sm:order-1">
            Showing {Math.min((page - 1) * itemsPerPage + 1, filteredUsers.length)} to{' '}
            {Math.min(page * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
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
              disabled={page * itemsPerPage >= filteredUsers.length}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
