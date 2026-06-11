'use client';

import React, { useState } from 'react';
import { Search, Pin, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatListSkeleton } from './skeletons';
import { useLanguage } from '@/lib/context/language-context';

interface Conversation {
  id: string;
  name: string;
  phone?: string;
  role?: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  isOnline?: boolean;
  avatar?: string;
  isPinned?: boolean;
  isMuted?: boolean;
  isNewContact?: boolean;
  isGroup?: boolean;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  isLoading?: boolean;
  currentUser?: { name?: string; profile_photo?: string } | null;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading,
  currentUser
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.replace(/\s+/g, '').includes(searchQuery.replace(/\s+/g, '')));
    
    if (activeTab === 'All') return matchesSearch;
    if (activeTab === 'Teacher') return matchesSearch && (c.role?.toLowerCase() === 'teacher' || c.role?.toLowerCase() === 'admin');
    if (activeTab === 'Parents') return matchesSearch && c.role?.toLowerCase() === 'parent';
    if (activeTab === 'Unread') return matchesSearch && (c.unreadCount ?? 0) > 0;
    if (activeTab === 'Groups') return matchesSearch && c.isGroup;
    
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sidebar Header & Search */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="typography-section-title">{t("communication")}</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => (window as any).openCreateGroup?.()}
              className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-90"
            >
              <Plus className="h-5 w-5" />
            </Button>
            {currentUser && (
              <Avatar className="h-8 w-8 cursor-pointer border border-border">
                <AvatarImage src={currentUser.profile_photo || ''} />
                <AvatarFallback className="typography-label bg-primary/10 text-primary">
                  {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <FilterTab label={t("all")} active={activeTab === 'All'} onClick={() => setActiveTab('All')} count={conversations.length} />
          <FilterTab label="Groups" active={activeTab === 'Groups'} onClick={() => setActiveTab('Groups')} count={conversations.filter(c => c.isGroup).length} />
          <FilterTab label={t("staff")} active={activeTab === 'Teacher'} onClick={() => setActiveTab('Teacher')} count={conversations.filter(c => !c.isGroup && (c.role?.toLowerCase() === 'teacher' || c.role?.toLowerCase() === 'admin')).length} />
          <FilterTab label={t("parents")} active={activeTab === 'Parents'} onClick={() => setActiveTab('Parents')} count={conversations.filter(c => !c.isGroup && c.role?.toLowerCase() === 'parent').length} />
          <FilterTab label={t("unread")} active={activeTab === 'Unread'} onClick={() => setActiveTab('Unread')} count={conversations.filter(c => (c.unreadCount ?? 0) > 0).length} />
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={t("search_users")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <ChatListSkeleton />
        ) : (
          <div className="px-2 pb-4 space-y-0.5">
            {filteredConversations.filter(c => !c.isNewContact).length > 0 && (
              <div className="typography-label px-3 pt-2 pb-1 text-[11px] text-muted-foreground/50 uppercase">
                {t("recent_chats")}
              </div>
            )}
            {filteredConversations.filter(c => !c.isNewContact).map((chat) => (
              <button
                 key={chat.id}
                 onClick={() => onSelectConversation(chat.id)}
                 className={cn(
                   "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 relative group",
                   activeConversationId === chat.id
                     ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[0.98]"
                     : "hover:bg-secondary/80 active:scale-[0.98]"
                 )}
               >
                 <div className="relative shrink-0">
                   <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-primary/20 transition-all">
                     <AvatarImage src={chat.avatar || undefined} />
                     <AvatarFallback className={cn(
                       "text-sm font-bold",
                       activeConversationId === chat.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                     )}>
                       {chat.name.slice(0, 2).toUpperCase()}
                     </AvatarFallback>
                   </Avatar>
                   {chat.isOnline && (
                     <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-background rounded-full" />
                   )}
                 </div>

                 <div className="flex-1 min-w-0 text-left">
                   <div className="flex items-center justify-between mb-0.5">
                     <div className="flex flex-col">
                       <span className="typography-label truncate text-[15px]">{chat.name}</span>
                       <span className="typography-label text-[10px] opacity-70 uppercase">
                         {chat.isGroup ? 'GROUP' : t(chat.role?.toLowerCase() as any)}
                       </span>
                     </div>
                     <span className={cn(
                       "text-[10px] whitespace-nowrap ml-2",
                       activeConversationId === chat.id ? "text-primary-foreground/70" : "text-muted-foreground"
                     )}>
                       {chat.timestamp || chat.phone}
                     </span>
                   </div>
                   <p className={cn(
                     "text-sm truncate pr-4",
                     activeConversationId === chat.id ? "text-primary-foreground/80" : "text-muted-foreground"
                   )}>
                     {chat.lastMessage || t("no_messages")}
                   </p>
                 </div>

                 <div className="flex flex-col items-end gap-1.5 shrink-0">
                   {chat.unreadCount ? (
                     <span className={cn(
                       "min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                       activeConversationId === chat.id ? "bg-white text-primary" : "bg-primary text-white"
                     )}>
                       {chat.unreadCount}
                     </span>
                   ) : chat.isPinned ? (
                     <Pin className="h-3.5 w-3.5 rotate-45 text-muted-foreground" />
                   ) : null}
                 </div>
              </button>
            ))}

            {filteredConversations.filter(c => !c.isNewContact).length > 0 &&
             filteredConversations.filter(c => c.isNewContact).length > 0 && (
              <div className="mx-3 my-2 border-t border-border/30" />
            )}
            {filteredConversations.filter(c => c.isNewContact).map((chat) => (
               <button
                 key={chat.id}
                 onClick={() => onSelectConversation(chat.id)}
                 className={cn(
                   "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 relative group",
                   activeConversationId === chat.id
                     ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[0.98]"
                     : "hover:bg-secondary/80 active:scale-[0.98]"
                 )}
               >
                 <div className="relative shrink-0">
                   <Avatar className="h-10 w-10 border border-transparent group-hover:border-primary/20 transition-all opacity-80 group-hover:opacity-100">
                     <AvatarImage src={chat.avatar || undefined} />
                     <AvatarFallback className="typography-label bg-secondary text-muted-foreground">
                       {chat.name.slice(0, 2).toUpperCase()}
                     </AvatarFallback>
                   </Avatar>
                   {chat.isOnline && (
                     <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                   )}
                 </div>

                 <div className="flex-1 min-w-0 text-left">
                   <span className="typography-label text-[14px]">{chat.name}</span>
                   <p className="typography-label text-[10px] text-muted-foreground uppercase">{t(chat.role?.toLowerCase() as any)}</p>
                 </div>
                 
                 <div className="p-2 rounded-lg bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-all">
                    <Plus className="w-4 h-4" />
                 </div>
               </button>
            ))}

            {filteredConversations.length === 0 && (
              <div className="p-8 text-center">
                <p className="typography-body text-muted-foreground">{t("no_conv_found")}</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

const FilterTab = ({ label, active, count, onClick }: { label: string; active: boolean; count?: number, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
    active ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
  )}>
    {label}
    {count !== undefined && count > 0 && (
      <span className={cn(
        "min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px]",
        active ? "bg-white text-primary" : "bg-primary text-white"
      )}>
        {count}
      </span>
    )}
  </button>
);
