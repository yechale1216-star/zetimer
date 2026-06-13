'use client';

import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Clock, Search, MoreVertical, Calendar, UserPlus, Users, History, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/utils';
import { format } from 'date-fns';
import { db } from '@/lib/db/database';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CallPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'HISTORY' | 'CONTACTS'>('CONTACTS');
  const [filter, setFilter] = useState<'ALL' | 'MISSED'>('ALL');
  const [history, setHistory] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Call confirmation state
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(db.getCurrentUser());
    fetchData();
  }, [view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (view === 'HISTORY') {
        const data = await db.getCallHistoryApi();
        setHistory(data);
      } else {
        const data = await db.getContacts();
        setContacts(data);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (call: any) => {
    if (!call.callSession?.participants) return call.user; // Fallback
    const other = call.callSession.participants.find((p: any) => p.userId !== currentUser?.id);
    return other?.user || call.user;
  };

  const filteredHistory = history.filter(call => {
    const other = getOtherParticipant(call);
    const matchesSearch = other?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || call.status === 'MISSED';
    return matchesSearch && matchesFilter;
  });

  const filteredContacts = contacts.filter(contact => 
    contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getCallIcon = (status: string) => {
    if (status === 'MISSED') return <PhoneMissed className="h-4 w-4 text-red-500" />;
    return <PhoneOutgoing className="h-4 w-4 text-blue-500" />;
  };

  const validatePhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 7;
  };

  const initiateCall = (contact: any) => {
    if (!contact.phone) {
      toast.error('This contact has no phone number listed.');
      return;
    }
    if (!validatePhoneNumber(contact.phone)) {
      toast.error('Invalid phone number format.');
      return;
    }
    setSelectedContact(contact);
    setShowConfirm(true);
  };

  const handleConfirmCall = async () => {
    if (!selectedContact) return;
    await db.logCall({
      recipientId: selectedContact.id,
      type: 'VOICE',
      status: 'OUTGOING',
    });
    window.location.href = `tel:${selectedContact.phone.replace(/\s+/g, '')}`;
    setShowConfirm(false);
    toast.success(`Calling ${selectedContact.full_name}...`);
    if (view === 'HISTORY') fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground">Call your contacts or view recent call history.</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl">
          <Button
            variant={view === 'HISTORY' ? 'default' : 'ghost'}
            onClick={() => setView('HISTORY')}
            className={cn("rounded-lg px-4 gap-2", view === 'HISTORY' && "shadow-sm")}
          >
            <History className="h-4 w-4" />
            History
          </Button>
          <Button
            variant={view === 'CONTACTS' ? 'default' : 'ghost'}
            onClick={() => setView('CONTACTS')}
            className={cn("rounded-lg px-4 gap-2", view === 'CONTACTS' && "shadow-sm")}
          >
            <Users className="h-4 w-4" />
            Contacts
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search by name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-background/50 border-none ring-1 ring-border/50 focus-visible:ring-primary/50 rounded-xl"
              />
            </div>
            {view === 'HISTORY' && (
              <div className="flex items-center gap-2">
                <Button variant={filter === 'ALL' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('ALL')} className="rounded-full px-4 text-xs font-semibold">All</Button>
                <Button variant={filter === 'MISSED' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('MISSED')} className="rounded-full px-4 text-xs font-semibold">Missed</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : view === 'HISTORY' ? (
              <HistoryView 
                calls={filteredHistory} 
                formatDuration={formatDuration} 
                getCallIcon={getCallIcon} 
                getOtherParticipant={getOtherParticipant}
              />
            ) : (
              <ContactsView 
                contacts={filteredContacts} 
                initiateCall={initiateCall} 
              />
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
              <Phone className="h-8 w-8 text-blue-500 animate-pulse" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold">Initiate Phone Call?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              You are about to call <span className="font-bold text-foreground">{selectedContact?.full_name}</span> ({selectedContact?.phone}). 
              Standard call rates apply.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <AlertDialogCancel className="rounded-xl border-none bg-muted hover:bg-muted/80 mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCall} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 border-none transition-all hover:scale-[1.02] active:scale-[0.98]">Call Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function HistoryView({ calls, formatDuration, getCallIcon, getOtherParticipant }: any) {
  if (calls.length === 0) return <EmptyState icon={<History />} title="No call history" subtitle="Your recent calls will appear here. To start a call, go to the Contacts tab." />;
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-border/50 text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30">
          <th className="px-6 py-4">User</th>
          <th className="px-6 py-4">Status</th>
          <th className="px-6 py-4 text-center">Duration</th>
          <th className="px-6 py-4 text-right">Time</th>
          <th className="px-6 py-4"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/30">
        {calls.map((call: any) => {
          const otherUser = getOtherParticipant(call);
          return (
            <tr key={call.id} className="group hover:bg-primary/[0.02] transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border shadow-sm">
                    <AvatarImage src={otherUser?.profile_photo} />
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">
                      {otherUser?.full_name?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm tracking-tight">{otherUser?.full_name}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{otherUser?.role}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {getCallIcon(call.status)}
                  <span className={cn("text-xs font-bold", call.status === 'MISSED' ? "text-red-500" : "text-foreground")}>
                    {call.status === 'MISSED' ? 'Missed' : 'Outgoing'}
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
                  <span className="text-xs font-bold">{format(new Date(call.createdAt), 'HH:mm')}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(call.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ContactsView({ contacts, initiateCall }: any) {
  if (contacts.length === 0) return <EmptyState icon={<Users />} title="No contacts found" subtitle="Try searching for a different name or role." />;
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-border/50 text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30">
          <th className="px-6 py-4">Name</th>
          <th className="px-6 py-4">Role</th>
          <th className="px-6 py-4">Phone Number</th>
          <th className="px-6 py-4 text-right">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/30">
        {contacts.map((contact: any) => (
          <tr key={contact.id} className="group hover:bg-primary/[0.02] transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border shadow-sm">
                  <AvatarImage src={contact.profile_photo} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">
                    {contact.full_name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-bold text-sm tracking-tight">{contact.full_name}</span>
              </div>
            </td>
            <td className="px-6 py-4">
              <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-wider px-2 py-0.5 border-primary/20 bg-primary/5 text-primary">
                {contact.role}
              </Badge>
            </td>
            <td className="px-6 py-4">
              <span className="text-sm font-medium text-muted-foreground">{contact.phone || 'No phone listed'}</span>
            </td>
            <td className="px-6 py-4 text-right">
                <Button
                  size="sm"
                  onClick={() => initiateCall(contact)}
                  disabled={!contact.phone}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState({ icon, title, subtitle }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
        {React.cloneElement(icon, { className: 'h-8 w-8' })}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-muted-foreground max-w-xs">{subtitle}</p>
    </div>
  );
}
