'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, MessageSquare, AlertCircle, CheckCircle2, Clock, MoreHorizontal } from 'lucide-react'

const mockTickets = [
  {
    id: 'TICK-1024',
    school: 'Ethiopia International School',
    subject: 'Billing issue - Double charge',
    status: 'urgent',
    category: 'Billing',
    lastUpdate: '20m ago',
    assignee: 'Admin A'
  },
  {
    id: 'TICK-1025',
    school: 'Highland Academy',
    subject: 'Feature request: Custom exam reports',
    status: 'open',
    category: 'Feature Request',
    lastUpdate: '2h ago',
    assignee: 'Unassigned'
  },
  {
    id: 'TICK-1026',
    school: 'Abyssinia Primary',
    subject: 'Login failure for multiple teachers',
    status: 'urgent',
    category: 'Technical',
    lastUpdate: '5h ago',
    assignee: 'Admin B'
  },
  {
    id: 'TICK-1027',
    school: 'St. Mary School',
    subject: 'Staff training request',
    status: 'closed',
    category: 'Support',
    lastUpdate: '1d ago',
    assignee: 'Admin A'
  }
]

export default function SupportTicketsPage() {
  const [activeTab, setActiveTab] = useState('all')

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'urgent': return 'bg-red-500/10 text-red-600 border-red-500/20 font-bold'
      case 'open': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'closed': return 'bg-green-500/10 text-green-600 border-green-500/20'
      default: return 'bg-secondary text-muted-foreground'
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Support Center</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage and resolve help desk tickets from across all school tenants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="w-4 h-4" />
            SLA Report
          </Button>
          <Button size="sm" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Global Broadcast
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setActiveTab('urgent')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Urgent</p>
              <p className="text-2xl font-bold text-red-600">3</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setActiveTab('open')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Open</p>
              <p className="text-2xl font-bold text-blue-600">12</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setActiveTab('closed')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Resolved</p>
              <p className="text-2xl font-bold text-green-600">145</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Avg Time</p>
              <p className="text-2xl font-bold">4.2h</p>
            </div>
            <div className="p-2 bg-secondary rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Help Desk Queue</CardTitle>
            <CardDescription>Live incoming requests from school admins</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search tickets..." className="pl-9 h-9 w-[200px]" />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Ticket</th>
                  <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">School</th>
                  <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Subject</th>
                  <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Category</th>
                  <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Status</th>
                  <th className="py-2 pr-4 font-medium uppercase text-[10px] tracking-wider">Assignee</th>
                  <th className="py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {mockTickets.map((t) => (
                  <tr key={t.id} className="border-b border-border/70 hover:bg-secondary/20 transition-colors group">
                    <td className="py-4 pr-4 font-mono text-xs text-muted-foreground">{t.id}</td>
                    <td className="py-4 pr-4 font-medium">{t.school}</td>
                    <td className="py-4 pr-4 text-foreground leading-relaxed">{t.subject}</td>
                    <td className="py-4 pr-4">
                      <Badge variant="outline" className="text-[10px] font-normal">{t.category}</Badge>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant="outline" className={`text-[10px] uppercase ${getStatusStyle(t.status)}`}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">{t.assignee}</td>
                    <td className="py-4 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
