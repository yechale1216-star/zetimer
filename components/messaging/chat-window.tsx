'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, Smile, MoreVertical, Phone, Video, ChevronLeft, 
  Check, CheckCheck, Reply, Forward, Trash2, Heart, Search, X, Clock,
  Pin, Copy, FileText, FileJson, FileType, Music, Play, ExternalLink, 
  Download, Globe, FileArchive, Mic, MicOff, StopCircle, ImageIcon, File as FileIcon,
  Info, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/utils';
// MessageWindowSkeleton removed — replaced with Telegram-style thin progress bar
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { Logo } from '@/components/logo';
import { useCall } from '@/components/providers/call-provider';
import { authService } from '@/lib/auth/auth';
import { supabase } from '@/lib/utils/supabase';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/context/language-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'read';
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VIDEO_MESSAGE' | 'CALL_VOICE' | 'CALL_VIDEO' | 'CALL_MISSED_VOICE' | 'CALL_MISSED_VIDEO';
  isMe: boolean;
  attachments?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
  isDeleted?: boolean;
  editedAt?: Date | string | null;
}

interface ChatWindowProps {
  activeConversation: any;
  messages: Message[];
  typingStatus?: string;
  onSendMessage: (content: string, options?: {
    type?: string;
    attachment?: any;
    replyToId?: string;
    isOptimistic?: boolean;
    tempId?: string;
    replaceTempId?: string;
  }) => void;
  onBack?: () => void;
  onToggleInfo?: () => void;
  onAction?: (action: string, data: any) => void;
  isLoading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = React.memo(({
  activeConversation,
  messages,
  typingStatus,
  onSendMessage,
  onBack,
  onToggleInfo,
  onAction,
  isLoading,
}) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { initiateCall } = useCall();

  const [inputValue, setInputValue] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ file: File; type: 'IMAGE' | 'VIDEO' | 'FILE'; preview: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  // Recording
  const [recordMode, setRecordMode] = useState<'audio' | 'video'>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatLastSeen = (date: string | Date | null) => {
    if (!date) return t("last_seen_a_long_time_ago");
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return t("last_seen_just_now");
    if (minutes < 60) return t("last_seen_minutes_ago", { n: minutes });
    
    if (days === 0 && now.getDate() === d.getDate()) {
      return t("last_seen_today_at", { t: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) });
    }
    
    if (days === 1 || (days === 0 && now.getDate() !== d.getDate())) {
      return t("last_seen_yesterday_at", { t: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) });
    }
    
    if (days < 7) {
      return t("last_seen_on", { d: d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) });
    }
    
    return t("last_seen_on", { d: d.toLocaleDateString() });
  };

  const deleteSelected = () => {
    // Logic to delete selected messages
    setSelectedIds([]);
    setIsSelectionMode(false);
  };

  const isStudent = currentUser?.role === 'student';
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isNearBottomRef = useRef(true);

  // Track whether the user is near the bottom of the scroll container
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom < 120;
    setShowScrollBtn(distFromBottom > 200);

    const currentScrollY = el.scrollTop;
    const lastScroll = parseInt(el.dataset.lastScroll || '0', 10);
    const diff = currentScrollY - lastScroll;
    
    if (Math.abs(diff) > 5) {
      window.dispatchEvent(new CustomEvent('chat-scroll', { 
        detail: { direction: diff > 0 ? 'down' : 'up' } 
      }));
    }
    el.dataset.lastScroll = currentScrollY.toString();
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  // When messages change: scroll smoothly only if already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  // When the conversation changes: instant jump to bottom
  const activeConvId = activeConversation?.id;
  useEffect(() => {
    isNearBottomRef.current = true;
    setShowScrollBtn(false);
    // Slight delay lets the DOM paint the new messages first
    const t = setTimeout(() => scrollToBottom('instant'), 50);
    return () => clearTimeout(t);
  }, [activeConvId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, forcedType?: 'IMAGE' | 'VIDEO' | 'FILE') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const type = forcedType ?? (isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'FILE');
    const preview = (isImage || isVideo) ? URL.createObjectURL(file) : '';

    setAttachedFile({ file, type, preview });
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const emojis = [
    { cat: "Smileys", items: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"] },
    { cat: "Gestures", items: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦵", "🦿", "🦶", "👂", "🦻", "👃", "🧠", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸"] },
    { cat: "Hearts", items: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"] },
    { cat: "Nature", items: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🪳", "🦂", "🕸️", "🕷️", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🦬", "🐃", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦫", " Otter", "🦥", "🐁", "🐀", "🐿️", "🦔"] },
    { cat: "Food", items: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥣", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧋", "🧃", "🧉", "🧊", "🥢", "🍽️", "🍴", "🥄", "🔪", "🏺"] },
    { cat: "Activities", items: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🥏", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", " curling", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚵", "🚴", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎫", "🎟️", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩"] }
  ];

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    // Keep visible if user wants to add multiple, but provide feedback/close logic if needed
  };

  // ── Recording ─────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        recordMode === 'video' 
          ? { audio: true, video: { width: { ideal: 400 }, height: { ideal: 400 }, facingMode: 'user' } } 
          : { audio: true }
      );
      
      if (recordMode === 'video') {
        setCameraStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      }

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (err: any) {
      console.error('Recording error:', err);
      if (err.name === 'NotReadableError') {
        toast.error('Camera or microphone is already in use by another application.');
      } else {
        toast.error(recordMode === 'video' ? 'Camera/Mic access denied' : 'Microphone access denied');
      }
    }
  };

  const stopRecording = (send: boolean) => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const mr = mediaRecorderRef.current;
    
    const mimeType = recordMode === 'video' ? 'video/webm' : 'audio/webm';
    const ext = 'webm';
    const prefix = recordMode === 'video' ? 'video' : 'voice';

    mr.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      mr.stream.getTracks().forEach(t => t.stop());
      setCameraStream(null);

      if (send && blob.size > 0) {
        const file = new File([blob], `${prefix}-${Date.now()}.${ext}`, { type: mimeType });
        const localUrl = URL.createObjectURL(blob);
        const fileTempId = `temp-${Date.now()}`;

        // 1. Show optimistic message with local preview
        onSendMessage(recordMode === 'video' ? '📹 Video message' : '🎤 Voice message', {
          type: recordMode === 'video' ? 'VIDEO_MESSAGE' : 'FILE',
          attachment: { url: localUrl, name: file.name, type: file.type, size: file.size, isLocal: true },
          isOptimistic: true,
          tempId: fileTempId,
        });

        // 2. Upload and replace with real message
        try {
          const url = await uploadFile(file);
          onSendMessage(recordMode === 'video' ? '📹 Video message' : '🎤 Voice message', {
            type: recordMode === 'video' ? 'VIDEO_MESSAGE' : 'FILE',
            attachment: { url, name: file.name, type: file.type, size: file.size },
            replaceTempId: fileTempId,
          });
        } catch { 
          toast.error(`Failed to send ${recordMode} message`); 
        }
      }
    };
    mr.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
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

    if (editTarget) {
      onAction?.('edit', { messageId: editTarget.id, content: inputValue });
      setEditTarget(null);
      setInputValue('');
      return;
    }

    const currentInput = inputValue;
    const currentFile = attachedFile;

    // Clear UI instantly
    setInputValue('');
    setAttachedFile(null);
    setReplyTarget(null);

    // Case 1: Just text
    if (!currentFile) {
      onSendMessage(currentInput);
      return;
    }

    // Case 2: Has attachment
    const fileTempId = `temp-${Date.now()}`;

    // 1. Show optimistic message with local preview immediately
    onSendMessage(currentInput || (currentFile.type === 'IMAGE' ? 'Image' : currentFile.type === 'VIDEO' ? 'Video' : 'File'), {
      type: currentFile.type,
      attachment: {
        url: currentFile.preview,
        name: currentFile.file.name,
        type: currentFile.file.type,
        size: currentFile.file.size,
        isLocal: true
      },
      replyToId: replyTarget?.id,
      isOptimistic: true,
      tempId: fileTempId, // ← pin this optimistic message with a known id
    });

    // 2. Upload in background then replace the optimistic message
    try {
      const attachmentUrl = await uploadFile(currentFile.file);
      onSendMessage(currentInput || (currentFile.type === 'IMAGE' ? 'Image' : currentFile.type === 'VIDEO' ? 'Video' : 'File'), {
        type: currentFile.type,
        attachment: {
          url: attachmentUrl,
          name: currentFile.file.name,
          type: currentFile.file.type,
          size: currentFile.file.size
        },
        replyToId: replyTarget?.id,
        replaceTempId: fileTempId, // ← replace the local preview, not add a new message
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to upload file. Please try again.');
    }
  };

  const handleBubbleAction = (action: string, data: any) => {
    const message = data.message;
    switch (action) {
      case 'reply':
        setReplyTarget(message);
        setEditTarget(null);
        break;
      case 'edit_start':
        setEditTarget(message);
        setReplyTarget(null);
        setInputValue(message.content);
        break;
      case 'copy':
        navigator.clipboard.writeText(message.content);
        toast.success("Copied to clipboard");
        break;
      default:
        onAction?.(action, data);
    }
  };

  if (!activeConversation) {
    if (isMobile) return null;
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-slate-950 p-8 text-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Logo size="xl" withText={false} href="" />
          </div>
          
          <h1 className="text-2xl font-black tracking-tighter text-foreground mb-2 uppercase">
            {t("communication")}
          </h1>
          
          <p className="text-sm text-muted-foreground/60 max-w-[240px] mx-auto leading-relaxed">
            Select a conversation to start chatting
          </p>
        </motion.div>
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
      <header className="h-[72px] border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 z-40 sticky top-0 font-sans shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isMobile && onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 rounded-full -ml-2">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          
          <div 
            className={cn(
              "flex items-center gap-3 flex-1 min-w-0 cursor-pointer transition-all hover:bg-secondary/40 p-1.5 rounded-2xl",
              activeConversation.isGroup ? "cursor-pointer" : "cursor-default"
            )}
            onClick={() => activeConversation.isGroup && onToggleInfo?.()}
          >
            <div className="relative shrink-0">
              <Avatar className="h-11 w-11 border-2 border-primary/10 overflow-hidden ring-2 ring-background">
                <AvatarImage src={activeConversation?.avatar || undefined} />
                <AvatarFallback className="bg-primary/5 text-primary text-sm font-black">
                  {activeConversation.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {activeConversation.isOnline && (
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-background rounded-full shadow-sm" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[16px] truncate tracking-tight">{activeConversation.name}</span>
                {!activeConversation.isGroup && activeConversation.role && (
                   <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-black uppercase tracking-tighter bg-primary/10 text-primary border-none">
                     {t(activeConversation.role.toLowerCase())}
                   </Badge>
                )}
              </div>
              {activeConversation.isGroup ? (
              <span className="text-[11px] font-medium text-muted-foreground/80 truncate">
                {typingStatus || `${activeConversation.members?.length} members • ${activeConversation.groupType || 'Group'}`}
              </span>
            ) : typingStatus ? (
              <span className="text-[11px] text-primary font-bold animate-pulse">{typingStatus}</span>
            ) : activeConversation.isOnline ? (
              <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                 <span className="text-[11px] text-green-600 font-bold uppercase tracking-widest">{t("online")}</span>
              </div>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground/60">
                {formatLastSeen(activeConversation.lastActive)}
              </span>
            )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:bg-secondary">
            <Search className="h-5 w-5" />
          </Button>
          {!isStudent && !activeConversation.isGroup && (
            <div className="flex items-center gap-1 mx-1 px-1 border-x border-border/50">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full text-primary hover:bg-primary/10 transition-all active:scale-90"
                onClick={() => initiateCall(activeConversation.id, 'VOICE', activeConversation)}
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full text-primary hover:bg-primary/10 transition-all active:scale-90"
                onClick={() => initiateCall(activeConversation.id, 'VIDEO', activeConversation)}
              >
                <Video className="h-5 w-5" />
              </Button>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:bg-secondary">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl border-border/50 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
              <DropdownMenuItem className="rounded-xl h-11 pointer-events-none opacity-50 gap-3">
                <Info className="h-4 w-4" /> {activeConversation.isGroup ? 'Group Info' : t("view_profile")}
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl h-11 gap-3">
                <Bell className="h-4 w-4" /> {t("mute_notifications")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-border/40" />
              <DropdownMenuItem className="rounded-xl h-11 gap-3 text-destructive focus:bg-destructive/10 focus:text-destructive">
                <Trash2 className="h-4 w-4" /> {activeConversation.isGroup ? 'Leave Group' : t("delete_chat")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Telegram-style thin loading bar at top of messages — never blocks the chat window */}
      {isLoading && (
        <div className="absolute top-[72px] left-0 right-0 z-50 h-[3px] overflow-hidden">
          <div
            className="h-full bg-primary/80 rounded-full"
            style={{
              width: '40%',
              animation: 'telegram-progress 1.2s ease-in-out infinite',
            }}
          />
          <style>{`
            @keyframes telegram-progress {
              0%   { transform: translateX(-100%); width: 40%; }
              50%  { width: 60%; }
              100% { transform: translateX(300%); width: 40%; }
            }
          `}</style>
        </div>
      )}

      {/* Messages Area - always rendered immediately, never blocked by skeleton */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-hide"
      >
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
              isGroup={activeConversation.isGroup}
              onAction={handleBubbleAction}
              currentUser={currentUser}
            />
          );
        })}
        {/* Invisible anchor element always at the very bottom */}
        <div ref={messagesEndRef} className="h-0 w-full" />
      </div>

      {/* Scroll-to-bottom FAB — visible only when scrolled up */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-28 right-4 z-50 h-10 w-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-5 w-5 -rotate-90 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

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
      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border z-50 sticky bottom-0">

        <div className="max-w-4xl mx-auto space-y-2">

          {/* Reply/Edit Preview */}
          <AnimatePresence>
            {(replyTarget || editTarget) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-secondary/30 border-l-4 border-primary rounded-r-xl px-4 py-3 flex items-center justify-between group overflow-hidden"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {replyTarget ? (
                      <>
                        <Reply className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{t("replying_to", { name: replyTarget.senderName })}</span>
                      </>
                    ) : (
                      <>
                        <FileType className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Editing Message</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate italic">
                    {(replyTarget || editTarget)?.content || "File"}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => { setReplyTarget(null); setEditTarget(null); if (editTarget) setInputValue(''); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording UI */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3"
              >
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 flex items-center gap-1">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-red-500 rounded-full"
                      animate={{ height: [4, Math.random() * 24 + 4, 4] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                </div>
                <span className="text-sm font-mono text-red-500 shrink-0">
                  {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground" onClick={() => stopRecording(false)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* File Preview */}
          <AnimatePresence>
            {attachedFile && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-secondary/30 rounded-xl p-2 flex items-center gap-3 border border-border/50"
              >
                {attachedFile.type === 'IMAGE' ? (
                  <div className="h-12 w-12 rounded-lg overflow-hidden border border-border shrink-0">
                    <img src={attachedFile.preview} alt="preview" className="w-full h-full object-cover" />
                  </div>
                ) : attachedFile.type === 'VIDEO' ? (
                  <div className="h-12 w-12 rounded-lg overflow-hidden border border-border bg-black shrink-0 relative">
                    <video src={attachedFile.preview} className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileIcon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="typography-label truncate text-sm">{attachedFile.file.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{attachedFile.type.toLowerCase()} • {(attachedFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full shrink-0" onClick={() => setAttachedFile(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2 relative">
            {/* Hidden file inputs */}
            <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => handleFileSelect(e, 'IMAGE')} className="hidden" />
            <input type="file" ref={videoInputRef} accept="video/*" onChange={(e) => handleFileSelect(e, 'VIDEO')} className="hidden" />
            <input type="file" ref={docInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt" onChange={(e) => handleFileSelect(e, 'FILE')} className="hidden" />

            {/* Attachment button + popup */}
            <div className="relative shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-12 w-12 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                onClick={() => setShowAttachMenu(v => !v)}
              >
                <Paperclip className="h-6 w-6" />
              </Button>
              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.9 }}
                    className="absolute bottom-16 left-0 bg-background border border-border/50 shadow-2xl rounded-[24px] p-2.5 flex flex-col gap-1.5 min-w-[200px] z-50 animate-in fade-in slide-in-from-bottom-2"
                  >
                    <button
                      className="flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-secondary/70 text-sm text-left transition-all active:scale-[0.98] group"
                      onClick={() => { fileInputRef.current?.click(); }}
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <ImageIcon className="h-5 w-5 text-blue-500 group-hover:text-white" />
                      </div>
                      <span className="font-bold text-foreground/80 tracking-tight">Photo</span>
                    </button>
                    <button
                      className="flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-secondary/70 text-sm text-left transition-all active:scale-[0.98] group"
                      onClick={() => { videoInputRef.current?.click(); }}
                    >
                      <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <Video className="h-5 w-5 text-red-500 group-hover:text-white" />
                      </div>
                      <span className="font-bold text-foreground/80 tracking-tight">Video</span>
                    </button>
                    <button
                      className="flex items-center gap-3.5 px-3.5 py-3 rounded-2xl hover:bg-secondary/70 text-sm text-left transition-all active:scale-[0.98] group"
                      onClick={() => { docInputRef.current?.click(); }}
                    >
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <FileText className="h-5 w-5 text-amber-500 group-hover:text-white" />
                      </div>
                      <span className="font-bold text-foreground/80 tracking-tight">Document</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text input */}
            <div className="bg-secondary/50 rounded-2xl flex-1 flex items-end p-1.5 focus-within:ring-1 focus-within:ring-primary/20 transition-all relative">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("rounded-full h-9 w-9 text-muted-foreground hover:text-primary shrink-0", showEmojiPicker && "text-primary bg-primary/10")}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="h-5 w-5" />
                </Button>
                
                <AnimatePresence>
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-12 left-0 w-[280px] md:w-[350px] max-h-[400px] bg-background border border-border shadow-2xl rounded-2xl p-4 overflow-hidden z-50 flex flex-col"
                      >
                        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                          <span className="typography-label text-xs font-bold uppercase tracking-widest text-primary">Emoji Picker</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setShowEmojiPicker(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="overflow-y-auto pr-2 custom-scrollbar space-y-4">
                          {emojis.map((group) => (
                            <div key={group.cat}>
                              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{group.cat}</h4>
                              <div className="grid grid-cols-7 md:grid-cols-8 gap-1">
                                {group.items.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => addEmoji(emoji)}
                                    className="h-8 w-8 flex items-center justify-center text-xl hover:bg-primary/10 rounded-lg transition-all active:scale-90"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <textarea
                placeholder={isRecording ? 'Recording…' : t('write_message')}
                value={inputValue}
                disabled={isRecording}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none py-2 px-3 text-[15px] resize-none max-h-32 scrollbar-hide disabled:opacity-50"
              />
            </div>

            {/* Send / Mic / Video button */}
            {isRecording ? (
              <Button
                onClick={() => stopRecording(true)}
                className="rounded-full h-12 w-12 shrink-0 shadow-lg bg-red-500 hover:bg-red-600 transition-all active:scale-95 animate-pulse"
              >
                <StopCircle className="h-6 w-6 text-white" />
              </Button>
            ) : (inputValue.trim() || attachedFile) ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="shrink-0"
              >
                <Button
                  onClick={handleSend}
                  className="rounded-full h-12 w-12 shrink-0 shadow-xl bg-primary hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center p-0"
                >
                  <Send className="h-6 w-6 text-white ml-0.5" />
                </Button>
              </motion.div>
            ) : (
              <div className="flex items-center">
                <Button
                  onMouseDown={startRecording}
                  onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                  className={cn(
                    "rounded-full h-12 w-12 shrink-0 shadow-lg transition-all active:scale-95",
                    recordMode === 'video' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:text-primary"
                  )}
                  title={recordMode === 'video' ? "Hold to record video message" : "Hold to record voice message"}
                >
                  {recordMode === 'video' ? <Video className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                {!isRecording && (
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="ml-1 h-9 w-9 text-muted-foreground/30 hover:text-primary"
                     onClick={() => setRecordMode(m => m === 'audio' ? 'video' : 'audio')}
                   >
                     {recordMode === 'video' ? <Mic className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                   </Button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Video Recording Preview */}
        <AnimatePresence>
          {isRecording && recordMode === 'video' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute bottom-24 right-4 w-40 h-40 rounded-full border-4 border-primary shadow-2xl overflow-hidden z-50 bg-black"
            >
              <video 
                ref={videoPreviewRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white font-mono">
                REC
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
});

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

const CustomAudioPlayer = React.memo(({ url, isMe }: { url: string, isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 py-2 px-3 rounded-2xl min-w-[200px] border border-white/10 shadow-sm",
      isMe ? "bg-primary-foreground/10 text-white" : "bg-secondary text-foreground"
    )}>
      <audio 
        ref={audioRef} 
        src={url} 
        preload="metadata"
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn(
          "h-10 w-10 rounded-full shrink-0 shadow-lg active:scale-95 transition-all",
          isMe ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-white hover:bg-primary/90"
        )}
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
      >
        {isPlaying ? <div className="flex gap-0.5"><div className="w-1 h-3 bg-current rounded-full" /><div className="w-1 h-3 bg-current rounded-full" /></div> : <Play className="h-5 w-5 ml-1 fill-current" />}
      </Button>
      <div className="flex-1 flex flex-col gap-1.5 pr-2">
        <div className="h-1.5 bg-current/10 rounded-full overflow-hidden relative">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-current"
            initial={false}
            animate={{ width: `${(currentTime/duration) * 100 || 0}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-medium opacity-60">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
});

const AttachmentRenderer = ({ file: rawFile, onImageClick, isCompact, isMe, status }: { file: any, onImageClick: (url: string) => void, isCompact?: boolean, isMe: boolean, status?: string }) => {
  const file = rawFile.create ? rawFile.create : rawFile;
  const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.url);
  const isAudio = file.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.url) || file.url.includes('voice-');
  const isVideo = (file.type?.startsWith('video/') || /\.(mp4|webm)$/i.test(file.url)) && !file.url.includes('voice-');

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
          className={cn("w-full h-auto max-h-[400px] object-cover", status === 'sending' && "opacity-50")}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Search className="text-white h-8 w-8" />
        </div>
        {status === 'sending' && (
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin shadow-lg" />
          </div>
        )}
      </div>
    );
  }

  if (isAudio) {
    return <CustomAudioPlayer url={file.url} isMe={isMe} />;
  }

  if (isVideo || rawFile.type === 'VIDEO_MESSAGE') {
    const isCircular = rawFile.type === 'VIDEO_MESSAGE';
    const [isMuted, setIsMuted] = useState(isCircular);

    return (
      <div 
        className={cn(
          "overflow-hidden relative bg-black cursor-pointer",
          isCircular 
            ? "rounded-full w-48 h-48 border-4 border-white/20 shadow-xl mx-auto my-2" 
            : (isCompact ? "rounded-lg" : "rounded-xl border border-border/10")
        )}
        onClick={() => setIsMuted(!isMuted)}
      >
        <video 
          src={file.url} 
          controls={!isCircular} 
          autoPlay={isCircular} 
          loop={isCircular} 
          muted={isMuted}
          playsInline
          className={cn(
            "w-full h-full",
            isCircular ? "object-cover" : "max-h-[400px]"
          )} 
        />
        {isCircular && (
           <>
             <div className="absolute inset-0 border-[6px] border-black/10 rounded-full pointer-events-none" />
             {isMuted && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="bg-black/50 p-2 rounded-full">
                   <MicOff className="h-6 w-6 text-white" />
                 </div>
               </div>
             )}
           </>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
        "bg-background/40 dark:bg-slate-800/40 border border-border/10 flex items-center gap-4 hover:bg-background/60 transition-all cursor-pointer group backdrop-blur-sm shadow-sm",
        isCompact ? "rounded-lg p-3" : "rounded-xl p-3"
      )}
         onClick={(e) => {
           e.stopPropagation();
           const viewerUrl = file.url.endsWith('.pdf') 
             ? file.url 
             : `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}`;
           window.open(viewerUrl, '_blank');
         }}>
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform relative">
        {status === 'sending' ? (
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        ) : (
          getFileIcon(file.url)
        )}
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
      <Button 
        variant="ghost" 
        size="icon" 
        className="shrink-0 h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
        onClick={async (e) => {
          e.stopPropagation();
          try {
            const response = await fetch(file.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (error) {
            console.error('Download failed:', error);
            // Fallback to simple open if fetch fails
            window.open(file.url, '_blank');
          }
        }}
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};

const LinkPreview = React.memo(({ url }: { url: string }) => {
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
});

const MessageBubble = React.memo(({ 
  message, 
  isLastInGroup, 
  isSelectionMode, 
  isSelected, 
  onToggleSelect, 
  onEnterSelectionMode,
  t,
  isGroup,
  onAction,
  currentUser
}: { 
  message: Message, 
  isLastInGroup: boolean,
  isSelectionMode: boolean,
  isSelected: boolean,
  onToggleSelect: () => void,
  onEnterSelectionMode: () => void,
  t: any,
  isGroup: boolean,
  onAction?: (action: string, data: any) => void,
  currentUser: any
}) => {
  const isMe = message.isMe;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  
  // Telegram-style large emojis: check if content is only emojis
  const emojiOnlyRegex = /^(\s*(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}|\p{Emoji_Modifier})\s*)+$/u;
  const isEmojiOnly = Boolean(!hasAttachments && message.content && emojiOnlyRegex.test(message.content));

  const isMediaOnly = Boolean((hasAttachments && 
    (!message.content || message.content === 'Image' || message.content === 'Video' || message.content === 'File')) || 
    message.type === 'VIDEO_MESSAGE' || message.type === 'VIDEO' || message.type === 'IMAGE' || isEmojiOnly);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleAction = (action: string, data?: any) => {
    onAction?.(action, { message, ...data });
  };

  const reactions = (message as any).reactions || [];
  const uniqReactions = Array.from(new Set(reactions.map((r: any) => r.emoji)));

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
    >
      {!isMe && isGroup && isLastInGroup && (
        <div className="flex items-center gap-2 mb-1 px-1">
           <Avatar className="h-5 w-5 border border-border/50">
              <AvatarImage src={(message as any).senderAvatar} />
              <AvatarFallback className="bg-primary/20 text-[8px] font-bold text-primary">
                 {(message as any).senderName?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
           </Avatar>
           <span className="text-[10px] font-bold text-primary/80 uppercase">{(message as any).senderName}</span>
        </div>
      )}
      <div className={cn(
        "relative transition-all shadow-sm",
        message.isDeleted ? "opacity-50 grayscale italic" : ""
      )}>
        <div className={cn(
          "relative transition-all shadow-sm overflow-hidden",
        (message.type === 'VIDEO_MESSAGE' || isEmojiOnly)
          ? "p-0 bg-transparent border-none shadow-none" 
          : (isMediaOnly 
              ? "p-1 rounded-xl bg-white dark:bg-slate-900 border border-border/40" 
              : cn(
                  "pl-3 pr-12 py-2 rounded-2xl text-[15px]",
                  isMe 
                    ? "bg-primary text-primary-foreground rounded-br-none" 
                    : "bg-white dark:bg-slate-900 border border-border/50 text-foreground rounded-bl-none"
                )),
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
                      isMe={isMe}
                      status={message.status}
                    />
                  ))}
                </div>
              )}
              {message.content && (!isMediaOnly || isEmojiOnly) && message.content !== 'File' && (
                <div className={cn(
                  "pb-4",
                  hasAttachments ? "mt-2" : "",
                  isEmojiOnly ? "text-5xl pb-1" : ""
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
          <ContextMenuContent className="w-56 rounded-xl border-none shadow-xl p-2">
             <ContextMenuItem onClick={() => handleAction('copy')} className="rounded-lg h-10 gap-3">
               <Copy className="h-4 w-4" />
               {t("copy_text")}
             </ContextMenuItem>
             <ContextMenuItem onClick={() => handleAction('reply')} className="rounded-lg h-10 gap-3">
               <Reply className="h-4 w-4" />
               {t("reply")}
             </ContextMenuItem>
             {isMe && !message.isDeleted && (
               <ContextMenuItem onClick={() => handleAction('edit_start')} className="rounded-lg h-10 gap-3">
                 <MoreVertical className="h-4 w-4" />
                 Edit Message
               </ContextMenuItem>
             )}
             <ContextMenuItem onClick={() => handleAction('pin')} className="rounded-lg h-10 gap-3">
               <Pin className="h-4 w-4" />
               Pin Message
             </ContextMenuItem>
             <ContextMenuItem onClick={() => handleAction('forward')} className="rounded-lg h-10 gap-3">
                <Forward className="h-4 w-4" />
                {t("forward")}
             </ContextMenuItem>
             <ContextMenuSeparator className="my-1 bg-border/50" />
             <ContextMenuItem onClick={() => handleAction('delete')} className="rounded-lg h-10 gap-3 text-destructive focus:text-destructive">
               <Trash2 className="h-4 w-4" />
               {t("delete")}
             </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <div className={cn(
          "flex items-center gap-1 text-[10px]",
          isEmojiOnly 
            ? "relative mt-1 self-end text-muted-foreground opacity-60" 
            : "absolute bottom-1 right-2",
          (isMediaOnly && !isEmojiOnly) 
            ? "bg-black/30 backdrop-blur-md text-white px-2 py-0.5 rounded-full" 
            : (isMe ? "text-primary-foreground/70" : "text-muted-foreground")
        )}>
          {message.editedAt && <span className="italic mr-1">edited</span>}
          <span>{message.timestamp}</span>
          {isMe && (
            <span className="shrink-0">
              {message.status === 'sending' ? (
                <Clock className="h-3 w-3 animate-pulse" />
              ) : message.status === 'read' ? (
                <CheckCheck className="h-3 w-3 text-sky-400" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>

        {/* Reactions Display */}
        {uniqReactions.length > 0 && (
          <div className={cn(
            "absolute -bottom-4 flex gap-1",
            isMe ? "right-0" : "left-0"
          )}>
            {uniqReactions.map((emoji: any) => (
              <button
                key={emoji}
                onClick={() => handleAction('react', { emoji })}
                className={cn(
                  "bg-white dark:bg-slate-800 border border-border/50 rounded-full px-1.5 py-0.5 text-[10px] shadow-sm hover:scale-110 transition-transform flex items-center gap-1",
                  reactions.some((r: any) => r.userId === currentUser?.id && r.emoji === emoji) ? "border-primary bg-primary/5" : ""
                )}
              >
                <span>{emoji}</span>
                <span className="font-bold opacity-70">
                  {reactions.filter((r: any) => r.emoji === emoji).length}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Telegram-style Corner Tail */}
        {isLastInGroup && message.type !== 'VIDEO_MESSAGE' && !isEmojiOnly && (
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
    </div>
  </motion.div>
  );
}, (prevProps, nextProps) => {
  // Deep comparison for memoization
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.status === nextProps.message.status &&
         prevProps.message.content === nextProps.message.content &&
         prevProps.message.editedAt === nextProps.message.editedAt &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.isSelectionMode === nextProps.isSelectionMode &&
         prevProps.isLastInGroup === nextProps.isLastInGroup &&
         (prevProps.message as any).reactions?.length === (nextProps.message as any).reactions?.length;
});

const DateSeparator = ({ date }: { date: string }) => (
  <div className="flex justify-center my-6">
    <div className="typography-label bg-secondary/40 backdrop-blur-sm px-4 py-1 rounded-full text-[11px] text-muted-foreground uppercase shadow-sm">
      {date}
    </div>
  </div>
);
