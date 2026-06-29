'use client';

import React, { useState } from 'react';
import { Search, Pin, Plus, Users, User, Settings, MoreVertical, ChevronLeft, Bookmark } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import { ChatListSkeleton } from './skeletons';
import { useLanguage } from '@/lib/context/language-context';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  lastActive?: Date | string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onOpenSavedMessages?: () => void;
  isLoading?: boolean;
  currentUser?: { name?: string; profile_photo?: string; id?: string } | null;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = React.memo(({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenSavedMessages,
  isLoading,
  currentUser
}) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const filteredConversations = React.useMemo(() => {
    return conversations.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.replace(/\s+/g, '').includes(searchQuery.replace(/\s+/g, '')));

      if (activeTab === 'All') return matchesSearch;
      if (activeTab === 'Staff') return matchesSearch && (c.role?.toLowerCase() === 'teacher' || c.role?.toLowerCase() === 'admin' || c.role?.toLowerCase() === 'staff');
      if (activeTab === 'Parents') return matchesSearch && c.role?.toLowerCase() === 'parent';
      if (activeTab === 'Unread') return matchesSearch && (c.unreadCount ?? 0) > 0;
      if (activeTab === 'Groups') return matchesSearch && c.isGroup;

      return matchesSearch;
    });
  }, [conversations, searchQuery, activeTab]);



  return (
    <div className="flex flex-col h-full bg-background overflow-hidden border-r border-border pt-safe">
      {/* Telegram-style Compact Sidebar Header - Forced Notch Clearance */}
      <div className="h-[92px] pt-[32px] px-3 flex items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window as any).goBack?.() || window.history.back()}
            className="h-10 w-10 rounded-full transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </Button>
          <h1 className="text-[17px] font-bold tracking-tight text-foreground uppercase">{t("messages")}</h1>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window as any).openCreateGroup?.()}
            className="h-10 w-10 rounded-full text-primary/80 hover:bg-primary/5 transition-all active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground/80 hover:bg-secondary">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-2xl border-border/50">
              <DropdownMenuItem className="rounded-xl h-10 pointer-events-none opacity-50 gap-3">
                <Settings className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl h-10 gap-3" onClick={() => (window as any).openCreateGroup?.()}>
                <Users className="h-4 w-4" /> New Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Search Bar - Telegram Style */}
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={t("search_users")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-secondary/40 border-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          <FilterTab label={(t as any)("all")} active={activeTab === 'All'} onClick={() => setActiveTab('All')} />
          <FilterTab label="Groups" active={activeTab === 'Groups'} onClick={() => setActiveTab('Groups')} />
          <FilterTab label={(t as any)("staff")} active={activeTab === 'Staff'} onClick={() => setActiveTab('Staff')} />
          <FilterTab label={(t as any)("parents")} active={activeTab === 'Parents'} onClick={() => setActiveTab('Parents')} />
          <FilterTab label={(t as any)("unread")} active={activeTab === 'Unread'} onClick={() => setActiveTab('Unread')} count={conversations.filter(c => (c.unreadCount ?? 0) > 0).length} />
        </div>
      </div>



      {/* Conversations List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <ChatListSkeleton />
        ) : (
          <div className="px-2 py-3 space-y-1">

            {/* ── Pinned: Saved Messages ── */}
            <button
              onClick={onOpenSavedMessages}
              className={cn(
                "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-200 relative group",
                activeConversationId === 'saved-messages'
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "hover:bg-secondary/60 active:scale-[0.98]"
              )}
            >
              <div className="relative shrink-0">
                <div className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center border-2 transition-all",
                  activeConversationId === 'saved-messages'
                    ? "bg-white/20 border-white/30"
                    : "bg-emerald-600/10 border-emerald-500/30 group-hover:border-emerald-500/60"
                )}>
                  <Bookmark className={cn(
                    "h-6 w-6 transition-colors",
                    activeConversationId === 'saved-messages' ? "text-white" : "text-emerald-600"
                  )} />
                </div>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "font-bold text-[16px] truncate tracking-tight",
                    activeConversationId === 'saved-messages' ? "text-white" : "text-foreground/90"
                  )}>Saved Messages</span>
                  <Pin className={cn(
                    "h-3 w-3 shrink-0 ml-1",
                    activeConversationId === 'saved-messages' ? "text-white/50" : "text-muted-foreground/30"
                  )} />
                </div>
                <p className={cn(
                  "text-[13px] truncate",
                  activeConversationId === 'saved-messages' ? "text-primary-foreground/70" : "text-muted-foreground/60"
                )}>Forward messages here to save them</p>
              </div>
            </button>

            {/* ── Separator ── */}
            {filteredConversations.length > 0 && (
              <div className="h-px bg-border/40 mx-2 my-1" />
            )}

            {filteredConversations.length > 0 ? (
              filteredConversations.map((chat) => (
                <ConversationItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeConversationId === chat.id}
                  onSelect={onSelectConversation}
                  t={t}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in slide-in-from-bottom-4">
                <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t("no_conv_found")}</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Info Footer (Desktop Only) */}
      {!isMobile && currentUser && (
        <div className="p-4 bg-secondary/20 border-t border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={currentUser.profile_photo} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {currentUser.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{currentUser.name}</p>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Online</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-secondary">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

const ConversationItem = React.memo(({
  chat,
  isActive,
  onSelect,
  t
}: {
  chat: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  t: any
}) => {
  return (
    <button
      onClick={() => onSelect(chat.id)}
      className={cn(
        "w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-200 relative group",
        isActive
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[0.98] z-10"
          : "hover:bg-secondary/60 active:scale-[0.98]"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className={cn(
          "h-14 w-14 transition-all duration-300",
          isActive ? "scale-105" : "group-hover:scale-105 ring-1 ring-border/50 group-hover:ring-primary/20"
        )}>
          <AvatarImage src={chat.avatar || undefined} />
          <AvatarFallback className={cn(
            "text-lg font-bold transition-colors",
            isActive ? "bg-white/20 text-white" : "bg-primary/5 text-primary"
          )}>
            {chat.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {chat.isOnline && (
          <span className="absolute bottom-0.5 right-0.5 h-4 w-4 bg-green-500 border-3 border-background rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            "font-bold text-[16px] truncate tracking-tight transition-colors",
            isActive ? "text-white" : "text-foreground/90"
          )}>
            {chat.name}
          </span>
          <span className={cn(
            "text-[11px] font-medium transition-colors ml-2",
            isActive ? "text-primary-foreground/60" : "text-muted-foreground/70"
          )}>
            {chat.timestamp || chat.phone}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col flex-1 min-w-0">
            <p className={cn(
              "text-[13px] truncate leading-snug transition-colors",
              chat.unreadCount && !isActive ? "font-semibold text-foreground" : "opacity-70",
              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {chat.lastMessage || (chat.isNewContact ? (t as any)("start_conversation") : (t as any)("no_messages"))}
            </p>
            {!chat.isGroup && (
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors",
                isActive ? "text-white/40" : "text-muted-foreground/30"
              )}>
                {(t as any)(chat.role?.toLowerCase() as any)}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end shrink-0 gap-1.5">
            {chat.unreadCount ? (
              <div className={cn(
                "h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm transition-all animate-in zoom-in",
                isActive ? "bg-white text-primary" : "bg-primary text-white"
              )}>
                {chat.unreadCount}
              </div>
            ) : chat.isPinned ? (
              <Pin className="h-3.5 w-3.5 rotate-45 text-muted-foreground/40" />
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
});

const FilterTab = React.memo(({ label, active, count, onClick }: { label: string; active: boolean; count?: number, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
      active
        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
        : "bg-secondary text-muted-foreground hover:bg-secondary-foreground/10 active:scale-95"
    )}>
    {label}
    {count !== undefined && count > 0 && (
      <span className={cn(
        "min-w-[18px] h-4.5 px-1 flex items-center justify-center rounded-full text-[9px] font-black",
        active ? "bg-white text-primary" : "bg-primary text-white"
      )}>
        {count}
      </span>
    )}
  </button>
));

