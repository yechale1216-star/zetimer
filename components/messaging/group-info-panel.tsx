'use client';

import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Image as ImageIcon, 
  FileText, 
  Bell, 
  Shield, 
  MoreVertical, 
  UserPlus, 
  Trash2, 
  LogOut,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/utils';

interface GroupInfoPanelProps {
  group: any;
  onClose: () => void;
  currentUser: any;
  onUpdateRole: (userId: string, role: string) => void;
  onRemoveMember: (userId: string) => void;
}

export const GroupInfoPanel: React.FC<GroupInfoPanelProps> = ({
  group,
  onClose,
  currentUser,
  onUpdateRole,
  onRemoveMember
}) => {
  const [activeTab, setActiveTab] = useState('members');
  const members = group?.members || [];
  const myMember = members.find((m: any) => m.userId === currentUser?.id);
  const isAdminOrOwner = myMember?.role === 'OWNER' || myMember?.role === 'ADMIN';

  return (
    <div className="w-80 h-full border-l border-border bg-background flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/10">
        <h3 className="font-bold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Group Info
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* Profile Section */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
              <AvatarImage src={group?.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {group?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-2 border-4 border-background shadow-lg">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">{group?.name}</h2>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase">
                {group?.groupType || 'GROUP'}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">
                {members.length} Members
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-2xl w-full">
            {group?.description || 'No group description set.'}
          </p>
        </div>

        <div className="px-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 p-1 bg-secondary/50 rounded-2xl">
              <TabsTrigger value="members" className="rounded-xl font-bold text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Members
              </TabsTrigger>
              <TabsTrigger value="media" className="rounded-xl font-bold text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Shared Files
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="p-2 animate-in fade-in duration-300">
              <div className="space-y-1">
                {isAdminOrOwner && (
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-2xl text-primary hover:bg-primary/5 hover:text-primary font-bold transition-all mb-2">
                    <UserPlus className="h-5 w-5" />
                    Add Members
                  </Button>
                )}

                {members.map((m: any) => (
                  <div key={m.userId} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 group transition-colors">
                    <Avatar className="h-10 w-10 border border-border/50">
                      <AvatarImage src={m.user?.profile_photo} />
                      <AvatarFallback className="bg-secondary text-muted-foreground font-bold text-xs">
                        {m.user?.full_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold truncate">{m.user?.full_name}</span>
                        {m.role === 'OWNER' && <Shield className="h-3 w-3 text-amber-500 fill-amber-500" />}
                        {m.role === 'ADMIN' && <Shield className="h-3 w-3 text-blue-500 fill-blue-500" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{m.role || 'MEMBER'}</p>
                    </div>

                    {isAdminOrOwner && m.userId !== currentUser?.id && m.role !== 'OWNER' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-xl">
                          <DropdownMenuItem onClick={() => onUpdateRole(m.userId, m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')} className="rounded-xl gap-2 font-medium">
                            <Shield className="h-4 w-4" />
                            {m.role === 'ADMIN' ? 'Demote to Member' : 'Promote to Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onRemoveMember(m.userId)} className="rounded-xl gap-2 text-destructive focus:text-destructive font-medium">
                            <Trash2 className="h-4 w-4" />
                            Remove from Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="media" className="p-2 animate-in fade-in duration-300">
               <div className="py-10 text-center opacity-40">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm font-medium">No media or files shared yet.</p>
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border bg-secondary/10 space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3 h-11 rounded-xl font-bold transition-all">
          <Bell className="h-5 w-5" />
          Mute Notifications
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 h-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive font-bold transition-all">
          <LogOut className="h-5 w-5" />
          Leave Group
        </Button>
      </div>
    </div>
  );
};
