'use client';

import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Bell, 
  BellOff, 
  Phone, 
  Video, 
  Smartphone, 
  User, 
  MoreVertical,
  Copy, 
  Grid,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCall } from '@/components/providers/call-provider';
import { cn } from '@/lib/utils/utils';
import { useLanguage } from '@/lib/context/language-context';

interface UserInfoPanelProps {
  user: any;
  currentUser: any;
  onClose: () => void;
  onAction?: (action: string, data: any) => void;
}

export const UserInfoPanel: React.FC<UserInfoPanelProps> = ({
  user,
  currentUser,
  onClose,
  onAction
}) => {
  const { t } = useLanguage();
  const { initiateCall } = useCall();
  const [activeTab, setActiveTab] = useState<'media' | 'saved' | 'files' | 'links'>('media');
  const [isMuted, setIsMuted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const phoneValue = user?.phone || '+251 915731207';
  const rawUsername = user?.name ? `@${user.name.toLowerCase().replace(/\s+/g, '')}` : '@username';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (onAction) {
      onAction('pin', { messageId: 'mute', isMuted: !isMuted });
    }
  };

  // Mock shared media grid to showcase beautiful, professional images instead of boring grey boxes.
  const mockMedia = [
    { id: '1', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=300&auto=format&fit=crop' },
    { id: '2', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=300&auto=format&fit=crop' },
    { id: '3', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1492534513006-37715f336a39?q=80&w=300&auto=format&fit=crop' },
    { id: '4', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=300&auto=format&fit=crop' },
    { id: '5', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?q=80&w=300&auto=format&fit=crop' },
    { id: '6', type: 'IMAGE', url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=300&auto=format&fit=crop' }
  ];

  const mockFiles = [
    { name: 'Semester_Exams_Schedule.pdf', size: '1.2 MB', ext: 'pdf' },
    { name: 'Student_Progress_Report.xlsx', size: '480 KB', ext: 'xlsx' },
    { name: 'Class_Lecture_Notes_Unit3.docx', size: '890 KB', ext: 'docx' }
  ];

  const mockLinks = [
    { title: 'Zetime Portal - School Management', url: 'https://zetime-app.vercel.app' },
    { title: 'Official Curriculum Guidelines 2026', url: 'https://moe.gov.et/curriculum' }
  ];

  return (
    <div className="w-full md:w-96 h-full border-l border-border bg-background dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300 z-50 fixed inset-0 md:relative">
      
      {/* Scrollable Container */}
      <ScrollArea className="flex-grow">
        
        {/* Full-width Cover Photo Header (Telegram individual user profile style) */}
        <div className="relative w-full aspect-[9/10] max-h-[380px] bg-secondary flex items-end">
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="absolute inset-0 w-full h-full object-cover" 
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-emerald-700 via-teal-800 to-cyan-900" />
          )}

          {/* Dark Glassmorphic bottom panel overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/45 to-transparent pt-24 pb-5 px-5">
            <h2 className="text-2xl font-black text-white leading-tight drop-shadow-md">
              {user?.name || 'Desa'}
            </h2>
            <p className="text-[13px] text-zinc-300 font-medium mt-1 drop-shadow-sm flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", user?.isOnline ? "bg-emerald-500" : "bg-zinc-400")} />
              {user?.isOnline ? t("online") : user?.timestamp || 'last seen recently'}
            </p>
          </div>

          {/* Upper Actions Overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pt-[env(safe-area-inset-top)]">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onClose} 
              className="h-10 w-10 rounded-full border-white/20 bg-black/35 hover:bg-black/60 text-white transition-all backdrop-blur-md active:scale-90"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-full border-white/20 bg-black/35 hover:bg-black/60 text-white transition-all backdrop-blur-md active:scale-90"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Telegram-style Circular Actions Section */}
        <div className="p-4 flex justify-between gap-2.5 border-b border-border/50 bg-secondary/15">
          <button 
            onClick={onClose}
            className="flex-1 flex flex-col items-center justify-center bg-emerald-600/90 text-white hover:bg-emerald-700/95 rounded-2xl py-3.5 gap-1 transition-all active:scale-95 shadow-md shadow-emerald-900/10"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[11px] font-black uppercase tracking-wider">Message</span>
          </button>
          
          <button 
            onClick={handleMuteToggle}
            className={cn(
              "flex-1 flex flex-col items-center justify-center rounded-2xl py-3.5 gap-1 transition-all active:scale-95 shadow-md",
              isMuted 
                ? "bg-slate-700/80 hover:bg-slate-800 text-slate-100" 
                : "bg-emerald-600/90 hover:bg-emerald-700/95 text-white shadow-emerald-900/10"
            )}
          >
            {isMuted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            <span className="text-[11px] font-black uppercase tracking-wider">
              {isMuted ? 'Muted' : 'Mute'}
            </span>
          </button>

          <button 
            onClick={() => initiateCall(user?.realContactId || user?.id, 'VOICE', user)}
            className="flex-1 flex flex-col items-center justify-center bg-emerald-600/90 text-white hover:bg-emerald-700/95 rounded-2xl py-3.5 gap-1 transition-all active:scale-95 shadow-md shadow-emerald-900/10"
          >
            <Phone className="h-5 w-5" />
            <span className="text-[11px] font-black uppercase tracking-wider">Call</span>
          </button>

          <button 
            onClick={() => initiateCall(user?.realContactId || user?.id, 'VIDEO', user)}
            className="flex-1 flex flex-col items-center justify-center bg-emerald-600/90 text-white hover:bg-emerald-700/95 rounded-2xl py-3.5 gap-1 transition-all active:scale-95 shadow-md shadow-emerald-900/10"
          >
            <Video className="h-5 w-5" />
            <span className="text-[11px] font-black uppercase tracking-wider">Video</span>
          </button>
        </div>

        {/* Mid-Info Details Block (Telegram-style Metadata list) */}
        <div className="py-4 space-y-1">
          {/* Phone block */}
          <div 
            onClick={() => copyToClipboard(phoneValue, 'phone')}
            className="px-6 py-3 flex items-center justify-between hover:bg-secondary/40 active:bg-secondary/70 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <Smartphone className="h-5 w-5 text-muted-foreground/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground/90 truncate">{phoneValue}</p>
                <p className="text-[11px] text-muted-foreground/60 font-medium mt-0.5">Mobile</p>
              </div>
            </div>
            <button className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none">
              {copiedField === 'phone' ? <Check className="h-4 w-4 text-green-500 animate-in zoom-in" /> : <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          </div>

          {/* Username block */}
          <div 
            onClick={() => copyToClipboard(rawUsername, 'username')}
            className="px-6 py-3 flex items-center justify-between hover:bg-secondary/40 active:bg-secondary/70 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <User className="h-5 w-5 text-muted-foreground/60 shrink-0" />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground/90 truncate">{rawUsername}</p>
                <p className="text-[11px] text-muted-foreground/60 font-medium mt-0.5">Username</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Simulated Telegram QR Code trigger icon */}
              <div className="h-6 w-6 rounded-md bg-secondary/75 border border-border/80 flex items-center justify-center text-foreground/75 cursor-pointer shadow-sm">
                <Grid className="h-3.5 w-3.5" />
              </div>
              <button className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none">
                {copiedField === 'username' ? <Check className="h-4 w-4 text-green-500 animate-in zoom-in" /> : <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tab content section */}
        <div className="border-t border-border/70 mt-2 bg-secondary/5">
          {/* Custom Sleek Tab Bar (Telegram Media tabs) */}
          <div className="flex border-b border-border/50 sticky top-0 bg-background/90 backdrop-blur-md z-20 px-2">
            {(['media', 'saved', 'files', 'links'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all uppercase tracking-wider relative",
                  activeTab === tab 
                    ? "border-emerald-600 text-emerald-600 font-extrabold" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="p-3">
            {activeTab === 'media' && (
              <div className="grid grid-cols-3 gap-1.5 animate-in fade-in duration-300">
                {mockMedia.map((m) => (
                  <div key={m.id} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer border border-border/40 hover:scale-[1.02] active:scale-95 transition-all">
                    <img 
                      src={m.url} 
                      alt="shared" 
                      className="w-full h-full object-cover" 
                      loading="lazy" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-1 animate-in fade-in duration-300">
                {mockFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/40 transition-all cursor-pointer">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-bold text-foreground/90 truncate">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground/60 font-semibold mt-0.5">{file.size}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'links' && (
              <div className="space-y-1 animate-in fade-in duration-300">
                {mockLinks.map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/40 transition-all cursor-pointer block"
                  >
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <LinkIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-bold text-foreground/90 truncate">{link.title}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate mt-0.5 flex items-center gap-0.5">
                        {link.url}
                        <ExternalLink className="h-2.5 w-2.5 inline" />
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="py-12 text-center opacity-40 animate-in fade-in duration-300">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm font-medium">No saved messages or files.</p>
              </div>
            )}
          </div>
        </div>

      </ScrollArea>
    </div>
  );
};
