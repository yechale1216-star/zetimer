'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, Edit, Trash2, Send } from 'lucide-react'

// Mock data
const mockAnnouncements = [
  {
    id: 1,
    title: 'System Maintenance Scheduled',
    description: 'Platform will undergo maintenance on May 20, 2024 from 2-4 AM EST',
    status: 'published',
    recipients: 45,
    readRate: 82,
    sentDate: '2024-05-10',
    targetAudience: 'All Schools',
  },
  {
    id: 2,
    title: 'New Feature: Advanced Analytics',
    description: 'Introducing enhanced analytics dashboard for better insights',
    status: 'published',
    recipients: 45,
    readRate: 76,
    sentDate: '2024-05-08',
    targetAudience: 'Premium Schools',
  },
  {
    id: 3,
    title: 'Q2 2024 Performance Report',
    description: 'Your Q2 performance metrics and key insights are ready',
    status: 'scheduled',
    recipients: 32,
    readRate: 0,
    sentDate: '2024-05-25',
    targetAudience: 'School Admins',
  },
  {
    id: 4,
    title: 'API Rate Limit Update',
    description: 'API rate limits have been updated for better performance',
    status: 'published',
    recipients: 45,
    readRate: 68,
    sentDate: '2024-05-05',
    targetAudience: 'All Schools',
  },
  {
    id: 5,
    title: 'Security Update Available',
    description: 'Critical security patches now available for all installations',
    status: 'draft',
    recipients: 0,
    readRate: 0,
    sentDate: '2024-05-15',
    targetAudience: 'All Schools',
  },
]

interface AnnouncementsListProps {
  searchQuery: string
}

export function AnnouncementsList({ searchQuery }: AnnouncementsListProps) {
  const filteredAnnouncements = mockAnnouncements.filter(
    (announcement) =>
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      published: 'bg-green-500/20 text-green-700 dark:text-green-400',
      scheduled: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
      draft: 'bg-gray-500/20 text-gray-700 dark:text-gray-400',
    }
    return colors[status] || 'bg-gray-500/20 text-gray-700'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Announcements</CardTitle>
        <CardDescription>Manage and track announcements sent to schools</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No announcements found</p>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="typography-label text-foreground">{announcement.title}</h3>
                    <Badge className={getStatusColor(announcement.status)}>
                      {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="typography-body text-muted-foreground mb-2">{announcement.description}</p>
                  <div className="typography-helper flex items-center gap-4 text-muted-foreground">
                    <span>Target: {announcement.targetAudience}</span>
                    <span>Recipients: {announcement.recipients}</span>
                    {announcement.status === 'published' && <span>Read Rate: {announcement.readRate}%</span>}
                    <span>{announcement.sentDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  {announcement.status === 'draft' && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Send">
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View">
                    <Eye className="w-4 h-4" />
                  </Button>
                  {announcement.status === 'draft' && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit">
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
