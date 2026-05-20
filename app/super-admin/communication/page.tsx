'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AnnouncementsList } from '@/components/super-admin/announcements-list'
import { Bell, Plus, Search } from 'lucide-react'

export default function CommunicationPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Communication Center</h1>
          <p className="text-muted-foreground mt-1">Send announcements and notifications to schools</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Announcement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Total Announcements</p>
            <p className="text-2xl font-bold text-foreground">24</p>
            <p className="text-xs text-muted-foreground mt-2">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">This Month</p>
            <p className="text-2xl font-bold text-foreground">8</p>
            <p className="text-xs text-muted-foreground mt-2">Announcements sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Average Read Rate</p>
            <p className="text-2xl font-bold text-foreground">78.5%</p>
            <p className="text-xs text-muted-foreground mt-2">Engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <AnnouncementsList searchQuery={searchQuery} />
    </div>
  )
}
