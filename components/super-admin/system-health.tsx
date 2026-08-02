'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, Clock, Database, Globe, Zap, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

interface SystemHealthProps {
  overallStatus: 'healthy' | 'degraded' | 'down'
  services: {
    name: string
    status: string
    uptime: string
    latency: string
    icon: string
  }[]
}

export function SystemHealth({ overallStatus = 'degraded', services = [] }: SystemHealthProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="typography-card-title">System Health</CardTitle>
            <CardDescription>Real-time infrastructure status</CardDescription>
          </div>
          <Badge status={overallStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map((service) => {
          const iconMap: Record<string, any> = {
            Database: Database,
            Globe: Globe,
            Zap: Zap,
            Settings: Settings
          }
          const Icon = iconMap[service.icon] || Settings
          const isHealthy = service.status === 'healthy'
          
          return (
            <div key={service.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20 transition-all hover:bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-md",
                  isHealthy ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="typography-label text-foreground text-sm">{service.name}</p>
                  <p className="typography-helper text-muted-foreground text-xs">{service.uptime} uptime</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  {isHealthy ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                  )}
                  <span className={cn(
                    "typography-label text-xs uppercase",
                    isHealthy ? "text-green-500" : "text-yellow-500"
                  )}>
                    {service.status}
                  </span>
                </div>
                <p className="typography-helper text-muted-foreground text-[10px] mt-0.5">
                  {service.latency}
                </p>
              </div>
            </div>
          )
        })}
        
        <div className="pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Clock className="w-3 h-3" />
            Last checked: just now
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Badge({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      <span className="text-[10px] font-bold text-green-600 uppercase">Operational</span>
    </div>
  )
}
