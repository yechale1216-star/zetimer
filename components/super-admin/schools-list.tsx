import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Trash2, ShieldBan, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api-config'
import { notifications } from '@/lib/utils/notifications'

interface School {
  id: string
  schoolId: string
  name: string
  subscriptionStatus: string
  onboardingStatus: 'PENDING' | 'ACTIVE' | 'SETUP_COMPLETE'
  createdAt: string
  suspendedAt?: string | null
  suspendReason?: string | null
}

interface SchoolsListProps {
  searchQuery: string
}

export function SchoolsList({ searchQuery }: SchoolsListProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const itemsPerPage = 10

  const fetchSchools = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/schools`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('attendance_token')}` }
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

  useEffect(() => { fetchSchools() }, [])

  const handleSuspendToggle = async (school: School, reason?: string) => {
    const isSuspended = school.subscriptionStatus === 'SUSPENDED'
    try {
      setSuspendingId(school.id)
      const res = await fetch(`${getApiUrl()}/api/schools/${school.id}/suspend`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suspend: !isSuspended, suspendReason: reason || undefined }),
      })
      const result = await res.json()
      if (result.success) {
        setSchools(prev => prev.map(s =>
          s.id === school.id
            ? { ...s, subscriptionStatus: !isSuspended ? 'SUSPENDED' : 'ACTIVE', suspendedAt: !isSuspended ? new Date().toISOString() : null, suspendReason: !isSuspended ? (reason || null) : null }
            : s
        ))
        notifications.success("Success", `School ${!isSuspended ? 'suspended' : 'unsuspended'} successfully`);
        setSuspendReason('')
      } else {
        notifications.error("Error", result.message || "Failed to update school status");
      }
    } catch (err: any) {
      console.error('Suspend toggle failed:', err);
      notifications.error("Connection Error", "Failed to reach server");
    } finally {
      setSuspendingId(null)
    }
  }

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (school.schoolId || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedSchools = filteredSchools.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const getTierColor = (tier: string) => {
    if (tier === 'SUSPENDED') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
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

  const SuspendButton = ({ school }: { school: School }) => {
    const isSuspended = school.subscriptionStatus === 'SUSPENDED'
    const isLoading = suspendingId === school.id
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm" variant="ghost"
            className={`h-8 w-8 p-0 ${isSuspended ? 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950' : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950'}`}
            title={isSuspended ? 'Unsuspend School' : 'Suspend School'}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
              isSuspended ? <ShieldCheck className="w-4 h-4" /> : <ShieldBan className="w-4 h-4" />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {isSuspended ? 'Unsuspend School?' : 'Suspend School?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSuspended
                ? `${school.name} will regain full access to write operations.`
                : `${school.name} users will be blocked from all write operations. Existing data will remain readable.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Reason input – only when suspending */}
          {!isSuspended && (
            <div className="px-1 pb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Reason <span className="text-muted-foreground font-normal normal-case">(optional)</span>
              </label>
              <textarea
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                rows={2}
                placeholder="e.g. Non-payment, policy violation…"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                maxLength={200}
              />
              {suspendReason && (
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">{suspendReason.length}/200</p>
              )}
              {school.suspendedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Previously suspended on {new Date(school.suspendedAt).toLocaleDateString()}
                  {school.suspendReason && ` · "${school.suspendReason}"`}
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSuspendReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSuspendToggle(school, suspendReason)}
              className={isSuspended ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              {isSuspended ? 'Yes, Unsuspend' : 'Yes, Suspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
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
        <CardTitle className="typography-card-title flex items-center justify-between">
          All Schools
          {schools.filter(s => s.subscriptionStatus === 'SUSPENDED').length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 flex items-center gap-1">
              <ShieldBan className="w-3 h-3" />
              {schools.filter(s => s.subscriptionStatus === 'SUSPENDED').length} Suspended
            </span>
          )}
        </CardTitle>
        <CardDescription>Total: {filteredSchools.length} schools</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {paginatedSchools.map((school) => (
            <div key={school.id} className={`p-4 border rounded-lg space-y-2 ${school.subscriptionStatus === 'SUSPENDED' ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="typography-label text-foreground">{school.name}</p>
                  <p className="typography-helper text-muted-foreground font-mono text-xs">{school.schoolId || 'N/A'}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                    <Link href={`/super-admin/schools/${school.id}`}><Eye className="w-4 h-4" /></Link>
                  </Button>
                  <SuspendButton school={school} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
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

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="typography-body w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">School Name</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Code</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Created At</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Status</th>
                <th className="typography-label text-left py-3 px-4 text-muted-foreground">Onboarding</th>
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
                  <tr key={school.id} className={`border-b border-border transition-colors ${school.subscriptionStatus === 'SUSPENDED' ? 'bg-red-50/40 dark:bg-red-950/10' : 'hover:bg-secondary/50'}`}>
                    <td className="typography-label py-3 px-4 text-foreground">{school.name}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{school.schoolId || '---'}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(school.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`typography-label ${getTierColor(school.subscriptionStatus)} text-[10px] uppercase`}>
                        {school.subscriptionStatus === 'SUSPENDED' && <ShieldBan className="w-3 h-3 mr-1" />}
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
                          <Link href={`/super-admin/schools/${school.id}`}><Eye className="w-4 h-4" /></Link>
                        </Button>
                        <SuspendButton school={school} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
