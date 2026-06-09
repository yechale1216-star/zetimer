import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Eye, Edit, Trash2, AlertCircle, UserCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getApiUrl } from '@/lib/auth/auth'

interface School {
  id: string
  schoolId: string
  name: string
  subscriptionStatus: string
  onboardingStatus: 'PENDING' | 'ACTIVE' | 'SETUP_COMPLETE'
  createdAt: string
  // We can add more fields if we fetch them
}

interface SchoolsListProps {
  searchQuery: string
}

export function SchoolsList({ searchQuery }: SchoolsListProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${getApiUrl()}/api/schools`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
          }
        });
        const result = await response.json();
        if (result.success) {
          setSchools(result.data);
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schools');
      } finally {
        setLoading(false)
      }
    }
    fetchSchools()
  }, [])

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (school.schoolId || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedSchools = filteredSchools.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const getTierColor = (tier: string) => {
    const t = tier.toLowerCase();
    if (t === 'premium') return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    if (t === 'standard') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
  }

  const getStatusColor = (status: string) => {
    if (status === 'SETUP_COMPLETE') return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    if (status === 'ACTIVE') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
  }

  if (loading) {
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
        <CardTitle className="typography-card-title">All Schools</CardTitle>
        <CardDescription>Total: {filteredSchools.length} schools</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile View - Card Layout */}
        <div className="md:hidden space-y-3">
          {paginatedSchools.map((school) => (
            <div key={school.id} className="p-4 border border-border rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="typography-label text-foreground">{school.name}</p>
                  <p className="typography-helper text-muted-foreground">{school.schoolId || 'N/A'}</p>
                </div>
                 <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                    <Link href={`/super-admin/schools/${school.id}`}>
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={`typography-label ${getTierColor(school.subscriptionStatus)} text-[10px] uppercase`}>
                  {school.subscriptionStatus}
                </Badge>
                <Badge variant="outline" className={`typography-label ${getStatusColor(school.onboardingStatus)} text-[10px] uppercase`}>
                  {school.onboardingStatus.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="typography-body w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">School Name</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Code</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Created At</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Tier</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Onboarding Status</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSchools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground italic">No schools found</td>
                </tr>
              ) : (
                paginatedSchools.map((school) => (
                  <tr key={school.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                    <td className="typography-label py-3 px-4 text-foreground">{school.name}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{school.schoolId || '---'}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(school.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`typography-label ${getTierColor(school.subscriptionStatus)} text-[10px] uppercase`}>
                        {school.subscriptionStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`typography-label ${getStatusColor(school.onboardingStatus)} text-[10px] uppercase`}>
                        {school.onboardingStatus.replace('_', ' ')}
                      </Badge>
                    </td>
                     <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View Details" asChild>
                          <Link href={`/super-admin/schools/${school.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-red-50" title="Delete School">
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

        {/* Pagination bar removed or simplified for brevity as per real data */}
      </CardContent>
    </Card>
  )
}
