'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

// Mock data
const mockSchools = [
  {
    id: 1,
    name: 'Springfield High School',
    code: 'SHS-001',
    region: 'North District',
    students: 1250,
    teachers: 85,
    status: 'active',
    tier: 'premium',
  },
  {
    id: 2,
    name: 'Central Academy',
    code: 'CA-002',
    region: 'Central District',
    students: 890,
    teachers: 62,
    status: 'active',
    tier: 'standard',
  },
  {
    id: 3,
    name: 'Lincoln Elementary',
    code: 'LE-003',
    region: 'South District',
    students: 450,
    teachers: 38,
    status: 'active',
    tier: 'starter',
  },
  {
    id: 4,
    name: 'Washington Middle School',
    code: 'WMS-004',
    region: 'West District',
    students: 720,
    teachers: 52,
    status: 'inactive',
    tier: 'standard',
  },
  {
    id: 5,
    name: 'Jefferson Technical High',
    code: 'JTH-005',
    region: 'East District',
    students: 980,
    teachers: 78,
    status: 'active',
    tier: 'premium',
  },
]

interface SchoolsListProps {
  searchQuery: string
}

export function SchoolsList({ searchQuery }: SchoolsListProps) {
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  const filteredSchools = mockSchools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.region.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedSchools = filteredSchools.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const getTierColor = (tier: string) => {
    if (tier === 'premium') return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    if (tier === 'standard') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
  }

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">All Schools</CardTitle>
        <CardDescription>Total: {filteredSchools.length} schools</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile View - Card Layout */}
        <div className="md:hidden space-y-3">
          {paginatedSchools.map((school) => (
            <div key={school.id} className="p-4 border border-border rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-foreground">{school.name}</p>
                  <p className="text-xs text-muted-foreground">{school.code}</p>
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
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Region</p>
                  <p className="text-foreground font-medium">{school.region}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Students/Teachers</p>
                  <p className="text-foreground font-medium">{school.students}/{school.teachers}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={`${getTierColor(school.tier)} text-[10px] font-semibold uppercase tracking-wider`}>
                  {school.tier}
                </Badge>
                <Badge variant="outline" className={`${getStatusColor(school.status)} text-[10px] font-semibold uppercase tracking-wider`}>
                  {school.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">School Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Code</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Region</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Students</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Teachers</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tier</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSchools.map((school) => (
                <tr key={school.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{school.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{school.code}</td>
                  <td className="py-3 px-4 text-muted-foreground">{school.region}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{school.students}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{school.teachers}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={`${getTierColor(school.tier)} text-[10px] font-semibold uppercase tracking-wider`}>
                      {school.tier}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={`${getStatusColor(school.status)} text-[10px] font-semibold uppercase tracking-wider`}>
                      {school.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                        <Link href={`/super-admin/schools/${school.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border text-sm">
          <p className="text-muted-foreground order-2 sm:order-1">
            Showing {Math.min((page - 1) * itemsPerPage + 1, filteredSchools.length)} to{' '}
            {Math.min(page * itemsPerPage, filteredSchools.length)} of {filteredSchools.length}
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
              disabled={page * itemsPerPage >= filteredSchools.length}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
