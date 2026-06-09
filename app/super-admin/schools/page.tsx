'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Loader2, Users, BookOpen, ShieldCheck, ShieldOff, Eye } from 'lucide-react'
import Link from 'next/link'
import { getApiUrl } from '@/lib/auth/auth'
import { AddSchoolDialog } from '@/components/super-admin/add-school-dialog'

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const fetchSchools = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (query) params.set('q', query)
      const res = await fetch(`${getApiUrl()}/api/super-admin/schools?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('attendance_token')}` }
      })
      const json = await res.json()
      if (json.success) {
        setSchools(json.data.schools)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSchools() }, [page, query])

  const handleStatusToggle = async (school: any) => {
    const action = school.subscriptionStatus === 'suspended' ? 'activate' : 'suspend'
    setTogglingId(school.id)
    try {
      await fetch(`${getApiUrl()}/api/super-admin/schools/${school.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
        },
        body: JSON.stringify({ action })
      })
      fetchSchools()
    } finally {
      setTogglingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
    if (status === 'suspended') return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Suspended</Badge>
    if (status === 'trial') return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Trial</Badge>
    return <Badge variant="outline" className="text-muted-foreground">{status || 'No Plan'}</Badge>
  }

  const getOnboardingBadge = (status: string) => {
    if (status === 'SETUP_COMPLETE') return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Onboarded</Badge>
    if (status === 'ACTIVE') return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Onboarding</Badge>
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Schools Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all schools and their configurations</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">{total} schools total</Badge>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9">
            New School
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by school name or ID..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setQuery(search); setPage(1) } }}
              />
            </div>
            <Button onClick={() => { setQuery(search); setPage(1) }} className="shrink-0">Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Schools</CardTitle>
          <CardDescription>Click a school to view detailed configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : schools.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground italic">No schools found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">School</th>
                    <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Plan</th>
                    <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Status</th>
                    <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Onboarding</th>
                    <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Users</th>
                    <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Students</th>
                    <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider">Since</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map(s => (
                    <tr key={s.id} className="border-b border-border/60 hover:bg-secondary/20 transition-colors">
                      <td className="py-4 pr-4">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{s.schoolId}</p>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-sm">{s.plan}</td>
                      <td className="py-4 pr-4">{getStatusBadge(s.subscriptionStatus)}</td>
                      <td className="py-4 pr-4">{getOnboardingBadge(s.onboardingStatus)}</td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />{s.userCount}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <BookOpen className="w-3.5 h-3.5" />{s.studentCount}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-xs text-muted-foreground">{s.createdAt}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" asChild className="h-8 gap-1">
                            <Link href={`/super-admin/schools/${s.id}`}><Eye className="w-3.5 h-3.5" /></Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 gap-1 ${s.subscriptionStatus === 'suspended' ? 'text-green-600 hover:text-green-700' : 'text-red-500 hover:text-red-600'}`}
                            disabled={togglingId === s.id}
                            onClick={() => handleStatusToggle(s)}
                          >
                            {togglingId === s.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : s.subscriptionStatus === 'suspended'
                                ? <ShieldCheck className="w-3.5 h-3.5" />
                                : <ShieldOff className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > 20 && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total/20)}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p+1)} disabled={page*20 >= total}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <AddSchoolDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
        onSuccess={() => fetchSchools()}
      />
    </div>
  )
}
