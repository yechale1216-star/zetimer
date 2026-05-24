'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, ChevronLeft, Check, CheckCheck, Reply, Forward, Trash2, Heart, Search, X, Pin, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { useCall } from '@/components/providers/call-provider';
import { authService } from '@/lib/auth/auth';
import { supabase } from '@/lib/utils/supabase';
import { toast } from 'sonner';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'read';
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'CALL_VOICE' | 'CALL_VIDEO' | 'CALL_MISSED_VOICE' | 'CALL_MISSED_VIDEO';
  isMe: boolean;
  attachments?: {
    id: string;
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
}

interface ChatWindowProps {
  activeConversation: any;
  messages: Message[];
  onSendMessage: (content: string, options?: { type: string; attachmentUrl?: string }) => void;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  activeConversation,
  messages,
  onSendMessage,
  onBack,
}) => {
  const { initiateCall } = useCall();
  const [inputValue, setInputValue] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ file: File; type: 'IMAGE' | 'FILE'; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = () => {
    // Logic to delete selected messages
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const isStudent = currentUser?.role === 'student';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : '';

    setAttachedFile({
      file,
      type: isImage ? 'IMAGE' : 'FILE',
      preview
    });
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
    const filePath = `chat-attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('communication-attachments')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('communication-attachments')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !attachedFile) return;

    setUploading(true);
    try {
      let attachmentUrl = '';
      if (attachedFile) {
        attachmentUrl = await uploadFile(attachedFile.file);
      }

      onSendMessage(inputValue || (attachedFile?.type === 'IMAGE' ? 'Image' : 'File'), {
        type: attachedFile?.type || 'TEXT',
        attachmentUrl
      });
      
      setInputValue('');
      setAttachedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send file');
    } finally {
      setUploading(false);
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8 text-center">
        <div className="relative w-20 h-20 mb-4">
          <img src="/zetime-logo.png" alt="Zetime Logo" className="w-full h-full object-contain" />
        </div>
        <h3 className="text-2xl font-black tracking-tight mb-1 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ZETIME</h3>
        <h4 className="text-base font-bold mb-2 text-foreground">Communication</h4>
        <p className="text-muted-foreground max-w-xs text-sm">
          Select a conversation to start messaging or create a new group.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] dark:bg-slate-950 relative overflow-hidden">
      {/* Telegram-style Background Pattern */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08] pointer-events-none" 
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/curls-run-wild.png")' }} 
      />

      {/* Chat Header */}
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 z-40 sticky top-0 font-sans">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 border border-border overflow-hidden rounded-full">
            <AvatarImage src={activeConversation?.avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary flex items-center justify-center font-bold h-full w-full">
              {activeConversation.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] leading-tight">{activeConversation.name}</span>
            {activeConversation.isOnline ? (
              <span className="text-[11px] text-green-500 font-medium">online</span>
            ) : (
              <span className="text-[11px] text-muted-foreground">last seen recently</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Search className="h-4 w-4" />
          </Button>
          {!isStudent && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary transition-all active:scale-95"
                onClick={() => initiateCall(activeConversation.id, 'VOICE', activeConversation)}
                title="Voice Call"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary transition-all active:scale-95"
                onClick={() => initiateCall(activeConversation.id, 'VIDEO', activeConversation)}
                title="Video Call"
              >
                <Video className="h-4 w-4" />
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              <DropdownMenuItem>Clear Chat</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-hide">
        <DateSeparator date="Today" />
        
        {messages.map((message, index) => {
          const isNextSameSender = messages[index + 1]?.senderId === message.senderId;
          return (
            <MessageBubble 
              key={message.id} 
              message={message} 
              isLastInGroup={!isNextSameSender}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.includes(message.id)}
              onToggleSelect={() => toggleSelect(message.id)}
              onEnterSelectionMode={() => setIsSelectionMode(true)}
            />
          );
        })}
      </div>

      {/* Floating Selection Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-background/90 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }}>
                  <X className="h-5 w-5" />
                </Button>
                <span className="font-bold">{selectedIds.length} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-primary">
                  <Forward className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={deleteSelected}>
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border z-40 sticky bottom-0">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* File Preview Area */}
          <AnimatePresence>
            {attachedFile && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-secondary/30 rounded-xl p-2 flex items-center gap-3 border border-border/50 mb-2"
              >
                {attachedFile.type === 'IMAGE' ? (
                  <div className="h-12 w-12 rounded-lg overflow-hidden border border-border">
                    <img src={attachedFile.preview} alt="Attachment preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Paperclip className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{attachedFile.file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(attachedFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setAttachedFile(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2">
            <div className="bg-secondary/50 rounded-2xl flex-1 flex items-end p-1.5 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary shrink-0">
                <Smile className="h-5 w-5" />
              </Button>
              <textarea
                placeholder="Write a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none py-2 px-3 text-[15px] resize-none max-h-32 scrollbar-hide"
                style={{ height: 'auto' }}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </div>
            <Button 
              onClick={handleSend} 
              disabled={(!inputValue.trim() && !attachedFile) || uploading}
              className={cn(
                "rounded-full h-11 w-11 shrink-0 shadow-lg transition-all active:scale-95",
                inputValue.trim() ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({ 
  message, 
  isLastInGroup, 
  isSelectionMode, 
  isSelected, 
  onToggleSelect, 
  onEnterSelectionMode 
}: { 
  message: Message, 
  isLastInGroup: boolean,
  isSelectionMode: boolean,
  isSelected: boolean,
  onToggleSelect: () => void,
  onEnterSelectionMode: () => void
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex flex-col max-w-[85%] md:max-w-[50%] group relative transition-all",
        message.isMe ? "ml-auto items-end" : "mr-auto items-start",
        isLastInGroup && "mb-2",
        isSelectionMode && "cursor-pointer"
      )}
      onClick={() => isSelectionMode && onToggleSelect()}
    >
      <div className={cn(
        "relative pl-3 pr-12 py-2 rounded-2xl shadow-sm text-[15px] transition-all min-w-0 w-full",
        message.isMe 
          ? "bg-primary text-primary-foreground rounded-br-none" 
          : "bg-white dark:bg-slate-900 border border-border/50 text-foreground rounded-bl-none",
        !isLastInGroup && (message.isMe ? "rounded-br-sm" : "rounded-bl-sm")
      )}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div className="select-text whitespace-pre-wrap break-words overflow-hidden w-full">
              {message.type === 'IMAGE' && message.attachments?.[0] && (
                <div className="mb-1 -ml-1 -mr-1 rounded-lg overflow-hidden border border-border/10">
                  <img src={message.attachments[0].url} alt="Shared image" className="w-full h-auto max-h-[300px] object-cover" />
                </div>
              )}
              {message.content}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56">
             <ContextMenuItem onClick={handleCopy}>Copy Text</ContextMenuItem>
             <ContextMenuItem>Reply</ContextMenuItem>
             <ContextMenuItem>Forward</ContextMenuItem>
             <ContextMenuItem className="text-destructive">Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <div className={cn(
          "absolute bottom-1 right-2 flex items-center gap-1 text-[10px]",
          message.isMe ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span>{message.timestamp}</span>
          {message.isMe && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>

        {/* Telegram-style Corner Tail */}
        {isLastInGroup && (
          <div className={cn(
            "absolute bottom-0 w-3 h-3 overflow-hidden",
            message.isMe ? "-right-2" : "-left-2"
          )}>
            <div className={cn(
              "w-full h-full rotate-45 transform origin-bottom-left",
              message.isMe ? "bg-primary" : "bg-white dark:bg-slate-900 border-l border-b border-border/50"
            )} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

const DateSeparator = ({ date }: { date: string }) => (
  <div className="flex justify-center my-6">
    <div className="bg-secondary/40 backdrop-blur-sm px-4 py-1 rounded-full text-[11px] font-bold text-muted-foreground uppercase tracking-widest shadow-sm">
      {date}
    </div>
  </div>
);
