'use client';

import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, Users, Volume2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils/utils';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream | null;
}

interface CallOverlayProps {
  status: 'RINGING' | 'CONNECTING' | 'CONNECTED';
  type: 'VOICE' | 'VIDEO';
  isMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  participants: Participant[]; // Including current user and others
  caller: {
    name: string;
    avatar?: string;
  };
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  status,
  type,
  isMuted,
  isCameraOff,
  localStream,
  remoteStreams,
  participants,
  caller,
  onEndCall,
  onToggleMute,
  onToggleCamera,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [callTime, setCallTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'CONNECTED') {
      interval = setInterval(() => {
        setCallTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const VideoStream = ({ stream, isLocal = false }: { stream: MediaStream | null, isLocal?: boolean }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    if (!stream) return <div className="w-full h-full bg-slate-800 flex items-center justify-center"><VideoOff className="h-8 w-8 text-white/20" /></div>;

    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn("w-full h-full object-cover", isLocal && "mirror")}
      />
    );
  };

  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  if (isMinimized) {
    // Show first remote stream or caller avatar
    const firstRemoteId = Object.keys(remoteStreams)[0];
    const firstRemoteStream = firstRemoteId ? remoteStreams[firstRemoteId] : null;

    return (
      <motion.div
        drag
        dragConstraints={{ left: -300, right: 300, top: -500, bottom: 500 }}
        className="fixed bottom-20 right-4 z-[110] w-48 h-64 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden cursor-move border border-white/10"
      >
        {type === 'VIDEO' && firstRemoteStream ? (
          <VideoStream stream={firstRemoteStream} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-center">
            <Avatar className="h-20 w-20 mb-2 border-2 border-white/20">
              <AvatarImage src={caller.avatar || undefined} />
              <AvatarFallback>{caller.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-white font-bold truncate w-full">{caller.name}</span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-black/20 text-white backdrop-blur-md"
            onClick={() => setIsMinimized(false)}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 rounded-full shadow-lg"
            onClick={onEndCall}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // Participants including self
  const allParticipantsCount = participants.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-slate-950 flex flex-col overflow-hidden"
    >
      {/* Background for Voice Calls or Connecting */}
      {(type === 'VOICE' || status !== 'CONNECTED') && (
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary/20 to-slate-950 opacity-50" />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              repeat: Infinity,
              duration: 8,
              ease: "easeInOut",
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-primary/20 rounded-full blur-[120px]"
          />
        </div>
      )}

      {/* Header */}
      <div className="relative z-20 w-full flex items-center justify-between p-6">
        <Button
          variant="ghost"
          size="icon"
          className="text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full h-12 w-12"
          onClick={() => setIsMinimized(true)}
        >
          <Minimize2 className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          {status === 'CONNECTED' && (
            <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Encrypted Call</span>
          )}
          <span className="text-white text-xl font-bold font-mono">
            {status === 'CONNECTED' ? formatTime(callTime) : status.toLowerCase() + '...'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full h-12 w-12"
        >
          <div className="relative">
            <Users className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
              {allParticipantsCount}
            </span>
          </div>
        </Button>
      </div>

      {/* Participant Grid */}
      <div className="relative z-10 flex-1 w-full px-4 overflow-hidden flex items-center justify-center">
        {type === 'VIDEO' && status === 'CONNECTED' ? (
          <div className={cn(
            "grid gap-4 w-full h-full max-h-[85vh] transition-all duration-500",
            getGridCols(allParticipantsCount)
          )}>
            {/* Local Stream */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl group">
              {!isCameraOff ? (
                <VideoStream stream={localStream} isLocal={true} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-800">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl bg-white/10 text-white">You</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold text-white/40">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                You {isMuted && <MicOff className="h-3 w-3 text-red-500" />}
              </div>
            </div>

            {/* Remote Streams */}
            {participants.filter(p => !p.id.includes('local')).map(p => (
              <div key={p.id} className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl group">
                {remoteStreams[p.id] ? (
                  <VideoStream stream={remoteStreams[p.id]} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-800">
                    <Avatar className="h-24 w-24 border-2 border-white/10">
                      <AvatarImage src={p.avatar || undefined} />
                      <AvatarFallback className="text-2xl bg-white/10 text-white">{p.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-bold text-white/40">Connecting...</span>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Voice Call UI (Profile Centered) */
          <div className="flex flex-col items-center gap-8">
             <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
                />
                <Avatar className="h-48 w-48 border-4 border-white/10 shadow-2xl relative z-10">
                  <AvatarImage src={caller.avatar || undefined} />
                  <AvatarFallback className="text-5xl font-bold bg-primary/20 text-white">
                    {caller.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
             </div>
             <div className="text-center">
                <h2 className="text-4xl font-bold text-white tracking-tight mb-2">{caller.name}</h2>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-white/40 text-xs font-bold tracking-widest uppercase">Ongoing voice session</p>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="relative z-20 w-full flex justify-center p-8 pb-12">
        <div className="bg-white/10 backdrop-blur-2xl rounded-[3.5rem] p-4 border border-white/10 shadow-2xl flex items-center gap-6 px-10">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full transition-all active:scale-90",
              isMuted ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
            )}
            onClick={onToggleMute}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {type === 'VIDEO' ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full transition-all active:scale-90",
                isCameraOff ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
              )}
              onClick={onToggleCamera}
            >
              {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
            >
              <Volume2 className="h-6 w-6" />
            </Button>
          )}

          <div className="w-[1px] h-10 bg-white/10 mx-2" />

          <Button
            variant="destructive"
            size="icon"
            className="h-16 w-16 rounded-full shadow-xl bg-red-500 hover:bg-red-600 active:scale-95 transition-transform"
            onClick={onEndCall}
          >
            <PhoneOff className="h-8 w-8" />
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </motion.div>
  );
};
