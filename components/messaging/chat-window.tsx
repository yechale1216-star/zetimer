'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, Smile, MoreVertical, Phone, Video, ChevronLeft, 
  Check, CheckCheck, Reply, Forward, Trash2, Heart, Search, X, 
  Pin, Copy, FileText, FileJson, FileType, Music, Play, ExternalLink, 
  Download, Globe, FileArchive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/utils';
import { MessageWindowSkeleton } from './skeletons';
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
import { useLanguage } from '@/lib/context/language-context';

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
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
}

interface ChatWindowProps {
  activeConversation: any;
  messages: Message[];
  onSendMessage: (content: string, options?: { type: string; attachment?: any }) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  activeConversation,
  messages,
  onSendMessage,
  onBack,
  isLoading,
}) => {
  const { t } = useLanguage();
  const { initiateCall } = useCall();
  const [inputValue, setInputValue] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ file: File; type: 'IMAGE' | 'FILE'; preview: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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

    // Use signed URL for privacy (10 years expiration)
    const { data, error: signError } = await supabase.storage
      .from('communication-attachments')
      .createSignedUrl(filePath, 315360000); // 10 years

    if (signError || !data?.signedUrl) {
      // Fallback to public URL if signing fails
      const { data: { publicUrl } } = supabase.storage
        .from('communication-attachments')
        .getPublicUrl(filePath);
      return publicUrl;
    }

    return data.signedUrl;
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
        attachment: attachedFile ? {
          url: attachmentUrl,
          name: attachedFile.file.name,
          type: attachedFile.file.type,
          size: attachedFile.file.size
        } : undefined
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
        <h3 className="typography-page-title mb-1 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ZETIME</h3>
        <h4 className="typography-card-title mb-2 text-foreground">{t("communication")}</h4>
        <p className="typography-body text-muted-foreground max-w-xs">
          {t("start_messaging")}
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
            <AvatarFallback className="typography-label bg-primary/10 text-primary flex items-center justify-center h-full w-full">
              {activeConversation.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="typography-label text-[15px]">{activeConversation.name}</span>
            {activeConversation.isOnline ? (
              <span className="typography-label text-[11px] text-green-500">{t("online")}</span>
            ) : (
              <span className="text-[11px] text-muted-foreground">{t("last_seen")}</span>
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
              <DropdownMenuItem>{t("view_profile")}</DropdownMenuItem>
              <DropdownMenuItem>{t("mute_notifications")}</DropdownMenuItem>
              <DropdownMenuItem>{t("clear_chat")}</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">{t("delete_chat")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-hide">
        {isLoading ? (
          <MessageWindowSkeleton />
        ) : (
          <>
            <DateSeparator date={t("today")} />
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
                  t={t}
                />
              );
            })}
          </>
        )}
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
                <span className="typography-label">{selectedIds.length} {t("selected")}</span>
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
                  <p className="typography-label truncate">{attachedFile.file.name}</p>
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
                placeholder={t("write_message")}
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

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
            onClick={() => setPreviewImage(null)}
          >
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 text-white hover:bg-white/10"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-8 w-8" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <ImagePreviewListener onPreview={setPreviewImage} />
    </div>
  );
};

const ImagePreviewListener = ({ onPreview }: { onPreview: (url: string) => void }) => {
  useEffect(() => {
    (window as any).showImagePreview = (url: string) => {
      const event = new CustomEvent('show-image-preview', { detail: url });
      window.dispatchEvent(event);
    };

    const handle = (e: any) => onPreview(e.detail);
    window.addEventListener('show-image-preview', handle);
    return () => {
      window.removeEventListener('show-image-preview', handle);
      delete (window as any).showImagePreview;
    };
  }, [onPreview]);
  return null;
};
const AttachmentRenderer = ({ file: rawFile, onImageClick, isCompact }: { file: any, onImageClick: (url: string) => void, isCompact?: boolean }) => {
  const file = rawFile.create ? rawFile.create : rawFile;
  const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.url);
  const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(file.url);
  const isAudio = file.type?.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(file.url);

  const getFileIcon = (url: string) => {
    if (url.endsWith('.pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (url.match(/\.(docx|doc|rtf)$/)) return <FileText className="h-6 w-6 text-blue-500" />;
    if (url.match(/\.(xlsx|xls|csv)$/)) return <FileType className="h-6 w-6 text-emerald-500" />;
    if (url.match(/\.(pptx|ppt)$/)) return <FileType className="h-6 w-6 text-orange-500" />;
    if (url.match(/\.(zip|rar|7z|tar|gz)$/)) return <FileArchive className="h-6 w-6 text-yellow-600" />;
    return <Paperclip className="h-6 w-6 text-primary" />;
  };

  if (isImage) {
    return (
      <div 
        className={cn(
          "overflow-hidden cursor-pointer hover:opacity-95 transition-opacity relative group",
          isCompact ? "rounded-lg" : "rounded-xl border border-border/10"
        )}
        onClick={() => onImageClick(file.url)}
      >
        <img 
          src={file.url} 
          alt={file.name || "Image"} 
          className="w-full h-auto max-h-[400px] object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Search className="text-white h-8 w-8" />
        </div>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className={cn(
        "overflow-hidden border border-border/10 bg-black relative",
        isCompact ? "rounded-lg" : "rounded-xl"
      )}>
        <video src={file.url} controls className="w-full h-auto max-h-[400px]" />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className={cn(
        "bg-background/40 dark:bg-slate-800/40 border border-border/10 flex items-center gap-3 backdrop-blur-sm",
        isCompact ? "rounded-lg p-2" : "rounded-xl p-3"
      )}>
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Music className="h-5 w-5 text-primary" />
        </div>
        <audio src={file.url} controls className="w-full h-8 custom-audio-player" />
      </div>
    );
  }

  return (
    <div className={cn(
        "bg-background/40 dark:bg-slate-800/40 border border-border/10 flex items-center gap-4 hover:bg-background/60 transition-all cursor-pointer group backdrop-blur-sm shadow-sm",
        isCompact ? "rounded-lg p-3" : "rounded-xl p-3"
      )}
         onClick={() => window.open(file.url, '_blank')}>
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        {getFileIcon(file.url)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="typography-label truncate group-hover:text-primary transition-colors">{file.name || "Document"}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="typography-label text-[10px] opacity-70 uppercase">
            {file.url.split('.').pop() || 'FILE'}
          </p>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <p className="text-[10px] opacity-70">
            {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Download'}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 rounded-full">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};

const LinkPreview = ({ url }: { url: string }) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const domain = new URL(url).hostname;
        if (isMounted) {
          setMetadata({
            title: domain,
            description: `Click to visit ${domain}`,
            url,
            domain,
            favicon: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
          });
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) setLoading(false);
      }
    };
    fetchMetadata();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return null;

  return (
    <div 
      className="mt-2 border-l-2 border-primary bg-primary/5 rounded-r-lg p-2 hover:bg-primary/10 transition-all cursor-pointer group max-w-sm"
      onClick={(e) => {
        e.stopPropagation();
        window.open(url, '_blank');
      }}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <div className="h-3 w-3 shrink-0">
          <img 
            src={metadata?.favicon} 
            alt="" 
            className="h-full w-full rounded-sm"
            onError={(e) => {
              (e.target as any).style.display = 'none';
              (e.target as any).parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe h-3 w-3 text-primary/70"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/></svg>';
            }}
          />
        </div>
        <span className="typography-label text-[10px] uppercase text-primary/70">{metadata?.domain}</span>
      </div>
      <h5 className="typography-label text-[13px] text-foreground group-hover:text-primary transition-colors line-clamp-1">{metadata?.title}</h5>
      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{metadata?.description}</p>
    </div>
  );
};

const MessageBubble = ({ 
  message, 
  isLastInGroup, 
  isSelectionMode, 
  isSelected, 
  onToggleSelect, 
  onEnterSelectionMode,
  t
}: { 
  message: Message, 
  isLastInGroup: boolean,
  isSelectionMode: boolean,
  isSelected: boolean,
  onToggleSelect: () => void,
  onEnterSelectionMode: () => void,
  t: any
}) => {
  const isMe = message.isMe;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const isMediaOnly = hasAttachments && 
    (!message.content || message.content === 'Image' || message.content === 'File');

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex flex-col group relative transition-all",
        isMe ? "ml-auto items-end" : "mr-auto items-start",
        isMediaOnly ? "max-w-[70%] md:max-w-[40%] w-full" : "max-w-[85%] md:max-w-[50%]",
        isLastInGroup && "mb-2",
        isSelectionMode && "cursor-pointer"
      )}
      onClick={() => isSelectionMode && onToggleSelect()}
    >
      <div className={cn(
        "relative transition-all shadow-sm overflow-hidden",
        isMediaOnly 
          ? "p-1 rounded-xl bg-white dark:bg-slate-900 border border-border/40" 
          : cn(
              "pl-3 pr-12 py-2 rounded-2xl text-[15px]",
              isMe 
                ? "bg-primary text-primary-foreground rounded-br-none" 
                : "bg-white dark:bg-slate-900 border border-border/50 text-foreground rounded-bl-none"
            ),
        !isLastInGroup && !isMediaOnly && (isMe ? "rounded-br-sm" : "rounded-bl-sm")
      )}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div className={cn(
              "select-text whitespace-pre-wrap break-words w-full relative",
              isMediaOnly ? "leading-[0]" : ""
            )}>
              {hasAttachments && (
                <div className={cn(
                  "flex flex-col gap-1",
                  isMediaOnly ? "-m-1" : "mb-1 -mx-2 -mt-1"
                )}>
                  {message.attachments!.map((file, idx) => (
                    <AttachmentRenderer 
                      key={idx} 
                      file={file} 
                      onImageClick={(url) => (window as any).showImagePreview?.(url)} 
                      isCompact={isMediaOnly}
                    />
                  ))}
                </div>
              )}
              {message.content && !isMediaOnly && message.content !== 'File' && (
                <div className={cn(
                  "pb-4",
                  hasAttachments ? "mt-2" : ""
                )}>
                  {(() => {
                    const urlRegex = /((https?:\/\/[^\s]+)|(www\.[^\s]+))/g;
                    const parts = message.content.split(urlRegex);
                    let firstLinkFound = false;
                    
                    const matches = Array.from(message.content.matchAll(urlRegex));
                    if (matches.length === 0) return message.content;

                    let lastIdx = 0;
                    const result = [];
                    matches.forEach((match, i) => {
                      if (match.index! > lastIdx) {
                        result.push(message.content.substring(lastIdx, match.index));
                      }
                      
                      const url = match[0];
                      const href = url.startsWith('http') ? url : `https://${url}`;
                      const showPreview = !firstLinkFound;
                      firstLinkFound = true;

                      result.push(
                        <React.Fragment key={`link-${i}`}>
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={cn(
                              "underline decoration-2 underline-offset-2 hover:opacity-80 transition-opacity font-bold break-all",
                              message.isMe ? "text-white" : "text-primary"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {url}
                          </a>
                          {showPreview && <LinkPreview url={href} />}
                        </React.Fragment>
                      );
                      lastIdx = match.index! + url.length;
                    });
                    
                    if (lastIdx < message.content.length) {
                      result.push(message.content.substring(lastIdx));
                    }
                    
                    return result;
                  })()}
                </div>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56">
             <ContextMenuItem onClick={handleCopy}>{t("copy_text")}</ContextMenuItem>
             <ContextMenuItem>{t("reply")}</ContextMenuItem>
             <ContextMenuItem>{t("forward")}</ContextMenuItem>
             <ContextMenuItem className="text-destructive">{t("delete")}</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <div className={cn(
          "absolute bottom-1 right-2 flex items-center gap-1 text-[10px]",
          isMediaOnly 
            ? "bg-black/30 backdrop-blur-md text-white px-2 py-0.5 rounded-full" 
            : (isMe ? "text-primary-foreground/70" : "text-muted-foreground")
        )}>
          <span>{message.timestamp}</span>
          {isMe && (
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
    <div className="typography-label bg-secondary/40 backdrop-blur-sm px-4 py-1 rounded-full text-[11px] text-muted-foreground uppercase shadow-sm">
      {date}
    </div>
  </div>
);
