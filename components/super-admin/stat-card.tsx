import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

interface StatCardProps {
  title: string
  value: string
  change: string
  icon: LucideIcon
  trend: 'up' | 'down' | 'stable'
}

export function StatCard({ title, value, change, icon: Icon, trend }: StatCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500'
    if (trend === 'down') return 'text-red-500'
    return 'text-blue-500'
  }

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />
    return null
  }

  return (
    <Card className="relative overflow-hidden border-border/50 backdrop-blur supports-[backdrop-filter]:bg-background/95">
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 md:space-y-2">
          <div className="text-xl md:text-2xl font-bold text-foreground">{value}</div>
          <div className={cn('flex items-center gap-1 text-xs font-medium', getTrendColor())}>
            {getTrendIcon()}
            <span className="line-clamp-1">{change}</span>
          </div>
        </div>
      </CardContent>

      {/* Gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
    </Card>
  )
}


