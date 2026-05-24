'use client';

import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Clock, Search, MoreVertical, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/utils';
import { format } from 'date-fns';

// Mock data for call history
const mockCallHistory = [
  {
    id: '1',
    user: { name: 'John Doe', avatar: '', role: 'Parent' },
    type: 'VOICE',
    direction: 'INCOMING',
    status: 'COMPLETED',
    startTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    duration: 345, // seconds
  },
  {
    id: '2',
    user: { name: 'Jane Smith', avatar: '', role: 'Teacher' },
    type: 'VIDEO',
    direction: 'OUTGOING',
    status: 'COMPLETED',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    duration: 820,
  },
  {
    id: '3',
    user: { name: 'Robert Brown', avatar: '', role: 'Staff' },
    type: 'VOICE',
    direction: 'INCOMING',
    status: 'MISSED',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    duration: 0,
  },
  {
    id: '4',
    user: { name: 'Emily White', avatar: '', role: 'Parent' },
    type: 'VIDEO',
    direction: 'OUTGOING',
    status: 'REJECTED',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    duration: 0,
  },
];

export default function CallHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'MISSED'>('ALL');

  const filteredCalls = mockCallHistory.filter(call => {
    const matchesSearch = call.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || call.status === 'MISSED';
    return matchesSearch && matchesFilter;
  });

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getCallIcon = (direction: string, status: string) => {
    if (status === 'MISSED') return <PhoneMissed className="h-4 w-4 text-red-500" />;
    if (direction === 'INCOMING') return <PhoneIncoming className="h-4 w-4 text-green-500" />;
    return <PhoneOutgoing className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Call History</h1>
          <p className="text-muted-foreground">Manage and view your recent voice and video calls.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
            className="rounded-full px-6"
          >
            All Calls
          </Button>
          <Button
            variant={filter === 'MISSED' ? 'default' : 'outline'}
            onClick={() => setFilter('MISSED')}
            className="rounded-full px-6"
          >
            Missed
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-none ring-1 ring-border/50 focus-visible:ring-primary/50 rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Direction</th>
                  <th className="px-6 py-4 text-center">Duration</th>
                  <th className="px-6 py-4 text-right">Time</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredCalls.map((call) => (
                  <tr key={call.id} className="group hover:bg-primary/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border shadow-sm">
                          <AvatarImage src={call.user.avatar} />
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">
                            {call.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm tracking-tight">{call.user.name}</span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{call.user.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {call.type === 'VIDEO' ? (
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                            <Video className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Phone className="h-4 w-4" />
                          </div>
                        )}
                        <span className="text-xs font-bold capitalize">{call.type.toLowerCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getCallIcon(call.direction, call.status)}
                        <span className={cn(
                          "text-xs font-bold",
                          call.status === 'MISSED' ? "text-red-500" : "text-foreground"
                        )}>
                          {call.status === 'MISSED' ? 'Missed' : call.direction === 'INCOMING' ? 'Incoming' : 'Outgoing'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold">{format(new Date(call.startTime), 'HH:mm')}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(call.startTime), 'MMM d, yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCalls.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Phone className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold">No calls found</h3>
                <p className="text-muted-foreground max-w-xs">Your recent call history will appear here once you start communicating.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
