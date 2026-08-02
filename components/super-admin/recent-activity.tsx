import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

interface RecentActivityProps {
  activities: {
    id: string | number
    type: 'success' | 'warning' | 'info'
    title: string
    description: string
    timestamp: string
    icon: any
  }[]
}

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and updates</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon
            const bgColor =
              activity.type === 'success'
                ? 'bg-green-500/10'
                : activity.type === 'warning'
                  ? 'bg-yellow-500/10'
                  : 'bg-blue-500/10'

            const iconColor =
              activity.type === 'success'
                ? 'text-green-500'
                : activity.type === 'warning'
                  ? 'text-yellow-500'
                  : 'text-blue-500'

            return (
              <div key={activity.id} className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className={cn('p-2 rounded-lg flex-shrink-0', bgColor)}>
                  <Icon className={cn('w-5 h-5', iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="typography-label text-foreground">{activity.title}</p>
                  <p className="typography-body text-muted-foreground truncate">{activity.description}</p>
                  <p className="typography-helper text-muted-foreground mt-1">{activity.timestamp}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}


