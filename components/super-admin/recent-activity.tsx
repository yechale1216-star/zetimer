import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

const activities = [
  {
    id: 1,
    type: 'success',
    title: 'New school registered',
    description: 'Springfield High School just joined the platform',
    timestamp: '2 hours ago',
    icon: CheckCircle,
  },
  {
    id: 2,
    type: 'warning',
    title: 'High API usage detected',
    description: 'Central District School is using 85% of their quota',
    timestamp: '4 hours ago',
    icon: AlertCircle,
  },
  {
    id: 3,
    type: 'info',
    title: 'Subscription tier upgraded',
    description: 'Lincoln Academy upgraded to Premium plan',
    timestamp: '6 hours ago',
    icon: Info,
  },
  {
    id: 4,
    type: 'success',
    title: 'System maintenance completed',
    description: 'Database optimization finished successfully',
    timestamp: '8 hours ago',
    icon: CheckCircle,
  },
  {
    id: 5,
    type: 'warning',
    title: 'Payment failed',
    description: 'Payment processing failed for 2 schools',
    timestamp: '12 hours ago',
    icon: AlertCircle,
  },
]

export function RecentActivity() {
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
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}


