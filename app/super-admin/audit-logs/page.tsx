'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Clock, User, Shield, Info } from 'lucide-react'
import { getApiUrl } from '@/lib/api-config'

// Mock Audit Logs
const mockLogs = [
  {
    id: '1',
    action: 'SCHOOL_SUSPENDED',
    actor: 'Super Admin',
    target: 'Highland Academy',
    details: 'Reason: Non-payment of subscription',
    timestamp: '2024-06-07 10:15 AM',
    severity: 'high'
  },
  {
    id: '2',
    action: 'PRICING_UPDATED',
    actor: 'Super Admin',
    target: 'Standard Tier',
    details: 'Base rate changed from 200 to 250 ETB',
    timestamp: '2024-06-07 09:30 AM',
    severity: 'medium'
  },
  {
    id: '3',
    action: 'BACKUP_STARTED',
    actor: 'System (Auto)',
    target: 'Database Cluster',
    details: 'Full automated snapshot',
    timestamp: '2024-06-07 00:00 AM',
    severity: 'low'
  },
  {
    id: '4',
    action: 'SCHOOL_ACTIVATED',
    actor: 'Super Admin',
    target: 'Riverside Primary',
    details: 'Manual activation after renewal',
    timestamp: '2024-06-06 04:45 PM',
    severity: 'medium'
  },
  {
    id: '5',
    action: 'USER_DELETED',
    actor: 'Super Admin',
    target: 'john.smith@deprecated.io',
    details: 'Account purged per GDPR request',
    timestamp: '2024-06-06 02:10 PM',
    severity: 'high'
  }
]

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: String(page),
          limit: '20'
        })
        const res = await fetch(`${getApiUrl()}/api/super-admin/audit-logs?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('attendance_token')}`
          }
        })
        const json = await res.json()
        if (json.success) {
          setLogs(json.data.logs)
          setTotal(json.data.total)
        }
      } catch (err) {
        console.error("Error fetching audit logs:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [page])

  const getSeverityColor = (action: string) => {
    const a = action.toUpperCase()
    if (a.includes('DELETE') || a.includes('SUSPEND') || a.includes('STOP')) return 'bg-red-500/10 text-red-600 border-red-500/20'
    if (a.includes('UPDATE') || a.includes('CREATE')) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  }

  const getSeverityLabel = (action: string) => {
    const a = action.toUpperCase()
    if (a.includes('DELETE') || a.includes('SUSPEND')) return 'high'
    if (a.includes('UPDATE') || a.includes('CREATE')) return 'medium'
    return 'low'
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            History of all sensitive operations on the platform
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search logs by actor, action or target..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>

          <div className="space-y-4">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-border/60 hover:bg-secondary/20 transition-all group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2.5 rounded-lg border ${getSeverityColor(log.action)}`}>
                    {getSeverityLabel(log.action) === 'high' ? <Shield className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                       <span className="font-semibold text-foreground uppercase tracking-tight">
                         {log.action.replace(/_/g, ' ')}
                       </span>
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold ${getSeverityColor(log.action)}`}>
                        {getSeverityLabel(log.action)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      <span>{log.actor || log.user}</span>
                      <span className="mx-1">•</span>
                      <span>School: {log.school}</span>
                    </div>
                    {log.details && (
                      <p className="text-sm text-muted-foreground/80 flex items-start gap-1.5 pt-1">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {logs.length === 0 && !loading && (
              <div className="py-20 text-center text-muted-foreground italic">
                No activity logs found.
              </div>
            )}
          </div>

          {total > logs.length && (
            <div className="mt-8 pt-4 border-t border-border flex justify-center">
              <Button 
                variant="ghost" 
                className="text-muted-foreground text-sm"
                onClick={() => setPage(p => p + 1)}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load more logs'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
