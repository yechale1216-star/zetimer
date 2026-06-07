'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const data = [
  { month: 'Jan', revenue: 4000, users: 2400, schools: 24 },
  { month: 'Feb', revenue: 3000, users: 1398, schools: 22 },
  { month: 'Mar', revenue: 2000, users: 9800, schools: 29 },
  { month: 'Apr', revenue: 2780, users: 3908, schools: 20 },
  { month: 'May', revenue: 1890, users: 4800, schools: 21 },
  { month: 'Jun', revenue: 2390, users: 3800, schools: 25 },
  { month: 'Jul', revenue: 3490, users: 4300, schools: 27 },
  { month: 'Aug', revenue: 4200, users: 5100, schools: 32 },
  { month: 'Sep', revenue: 5100, users: 6200, schools: 35 },
  { month: 'Oct', revenue: 6200, users: 7100, schools: 40 },
  { month: 'Nov', revenue: 7100, users: 8200, schools: 42 },
  { month: 'Dec', revenue: 8200, users: 9300, schools: 45 },
]

export function RevenueChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue & Growth Trends</CardTitle>
        <CardDescription>Monthly revenue, users, and school growth</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
              }}
              formatter={(value) => `${value.toLocaleString()} ETB`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              name="Revenue (ETB)"
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
              name="Active Users"
            />
            <Line
              type="monotone"
              dataKey="schools"
              stroke="var(--chart-3)"
              strokeWidth={2}
              dot={false}
              name="Schools"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
